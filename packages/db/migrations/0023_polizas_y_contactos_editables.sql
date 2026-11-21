-- Pólizas, contactos y renovaciones editables desde la app.
--
-- 1. Datos de póliza que faltaban: Productor, Premio, Suma asegurada y Forma de pago
--    (Tipo de riesgo ya existe: es `product_reference`, el «Riesgo» de Zoho). Viven en la
--    versión, como la prima: una refacturación puede cambiarlos.
-- 2. El equipo edita la póliza vigente, renueva, registra refacturaciones, edita nombre y
--    DNI de una persona y la asocia a una empresa. Todo por RLS con `authz.es_admin()`.
-- 3. Eliminar una póliza o un contacto es definitivo y pasa por dos funciones que
--    verifican los vínculos en la base, en la misma transacción que borran.

alter table policy_version
  add column producer text,
  add column total_premium numeric,
  add column sum_insured numeric,
  add column payment_method text;

comment on column policy_version.total_premium is 'Premio: prima más impuestos y recargos. La prima sigue en `premium`.';

-- Una refacturación registrada desde Broker OS no puede repetir número de endoso.
create unique index endorsement_numero_broker_os
  on endorsement (policy_id, number)
  where source_reference like 'broker-os:%';

-- ── Permisos de escritura del equipo ─────────────────────────────────────────

grant insert (insurer_id, policy_number, renewed_from_policy_id) on policy to broker_app;
grant update (policy_number) on policy to broker_app;
grant insert (
  policy_id, version_number, effective_from, effective_to, holder_party_id, product_reference,
  term_start_date, term_end_date, renewal_mode, premium, currency, status, endorsement_id,
  producer, total_premium, sum_insured, payment_method, source_event_type, source_event_id
) on policy_version to broker_app;
grant update (
  effective_to, product_reference, term_start_date, term_end_date, renewal_mode, premium,
  currency, status, producer, total_premium, sum_insured, payment_method
) on policy_version to broker_app;
grant insert (policy_id, number, kind, effective_from, source_reference) on endorsement to broker_app;
grant update (first_name, last_name, dni) on person_profile to broker_app;
grant update (display_name_cache, updated_at) on party to broker_app;
grant insert (organization_party_id, person_party_id, kind) on organization_membership to broker_app;

create policy policy_crear on policy for insert to broker_app with check ((select authz.es_admin()));
create policy policy_actualizar on policy for update to broker_app
  using ((select authz.es_admin())) with check ((select authz.es_admin()));
create policy policy_version_crear on policy_version for insert to broker_app with check ((select authz.es_admin()));
create policy policy_version_actualizar on policy_version for update to broker_app
  using ((select authz.es_admin())) with check ((select authz.es_admin()));
create policy endorsement_crear on endorsement for insert to broker_app
  with check ((select authz.es_admin()) and source_reference like 'broker-os:%');
create policy person_profile_actualizar on person_profile for update to broker_app
  using ((select authz.es_admin())) with check ((select authz.es_admin()));
create policy party_actualizar on party for update to broker_app
  using ((select authz.es_admin())) with check ((select authz.es_admin()));
create policy organization_membership_crear on organization_membership for insert to broker_app
  with check ((select authz.es_admin()));

-- ── Borrado definitivo ───────────────────────────────────────────────────────
-- Las versiones cerradas son inmutables (INV-PV-005). El borrado definitivo es la única
-- excepción y la abre sólo esta función, con una marca local a su transacción.

create or replace function policy_version_closed_is_immutable() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if TG_OP = 'DELETE' then
    if old.effective_to is not null and coalesce(current_setting('broker.borrado_definitivo', true), '') <> 'on' then
      raise exception
        'policy_version %: no se puede borrar una versión cerrada (INV-PV-005/INV-013)', old.id;
    end if;
    return old;
  end if;

  if old.effective_to is not null then
    raise exception
      'policy_version %: no se puede modificar una versión ya cerrada (INV-PV-005/INV-013)', old.id;
  end if;

  return new;
end;
$$;

-- Devuelve los tipos de vínculo que impiden borrar ('GESTIONES', 'TAREAS') o un arreglo
-- vacío si la borró. La sucesora, si existe, pierde el vínculo «Renueva a».
create function public.eliminar_poliza(poliza uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  bloqueos text[] := array[]::text[];
begin
  if not authz.es_admin() then
    raise exception 'eliminar_poliza: sólo el equipo' using errcode = 'insufficient_privilege';
  end if;
  perform 1 from public.policy where id = poliza for update;
  if not found then
    raise exception 'eliminar_poliza: no existe' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.service_case where policy_id = poliza) then bloqueos := array_append(bloqueos, 'GESTIONES'); end if;
  if exists (select 1 from public.task where policy_id = poliza) then bloqueos := array_append(bloqueos, 'TAREAS'); end if;
  if cardinality(bloqueos) > 0 then return bloqueos; end if;

  perform set_config('broker.borrado_definitivo', 'on', true);
  update public.policy set renewed_from_policy_id = null where renewed_from_policy_id = poliza;
  delete from public.policy_document_reference where policy_id = poliza;
  delete from public.document_verification_input where policy_id = poliza;
  delete from public.document_link where resource_type = 'POLICY' and resource_id = poliza;
  delete from public.policy_version where policy_id = poliza;
  delete from public.endorsement where policy_id = poliza;
  delete from public.policy where id = poliza;
  perform set_config('broker.borrado_definitivo', '', true);
  insert into public.audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
  values (authz.usuario(), 'app', 'policy.delete', 'policy', poliza::text, 'ok');
  return bloqueos;
end;
$$;

-- Qué impide borrar un contacto: pólizas (como tomador en cualquier versión), gestiones o
-- tareas, sin importar su estado. La misma función la usa la ficha antes de ofrecer el
-- borrado y `eliminar_contacto` al confirmar.
create function public.bloqueos_de_contacto(contacto uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select array_remove(array[
    case when exists (select 1 from public.policy_version where holder_party_id = contacto) then 'POLIZAS' end,
    case when exists (select 1 from public.service_case where party_id = contacto) then 'GESTIONES' end,
    case when exists (select 1 from public.task where party_id = contacto) then 'TAREAS' end
  ], null)
$$;

create function public.eliminar_contacto(contacto uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  bloqueos text[];
begin
  if not authz.es_admin() then
    raise exception 'eliminar_contacto: sólo el equipo' using errcode = 'insufficient_privilege';
  end if;
  perform 1 from public.party where id = contacto for update;
  if not found then
    raise exception 'eliminar_contacto: no existe' using errcode = 'no_data_found';
  end if;
  bloqueos := public.bloqueos_de_contacto(contacto);
  if cardinality(bloqueos) > 0 then return bloqueos; end if;

  delete from public.contact_point where party_id = contacto;
  delete from public.organization_membership where person_party_id = contacto or organization_party_id = contacto;
  delete from public.party_source_link where party_id = contacto;
  delete from public.client_assignment where client_party_id = contacto;
  delete from public.document_link where resource_type = 'PARTY' and resource_id = contacto;
  delete from public.person_profile where party_id = contacto;
  delete from public.organization_profile where party_id = contacto;
  -- Si quedó algo más apuntando a esta persona (un usuario, una aseguradora, un rol), la
  -- clave foránea corta el borrado y la transacción entera vuelve atrás.
  delete from public.party where id = contacto;
  insert into public.audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
  values (authz.usuario(), 'app', 'party.delete', 'party', contacto::text, 'ok');
  return bloqueos;
end;
$$;

revoke all on function public.eliminar_poliza(uuid) from public;
revoke all on function public.bloqueos_de_contacto(uuid) from public;
revoke all on function public.eliminar_contacto(uuid) from public;
grant execute on function public.eliminar_poliza(uuid) to broker_app;
grant execute on function public.bloqueos_de_contacto(uuid) to broker_app;
grant execute on function public.eliminar_contacto(uuid) to broker_app;
