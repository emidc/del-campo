-- Prospectos: clientes potenciales, empresas o personas, que el equipo carga a mano.
--
-- Un prospecto es una Party con un `party_role` PROSPECT vigente (DOMAIN.md §14). Se
-- carga con nombre y origen; el CUIT o el DNI pueden completarse después. Convertirlo en
-- cliente cierra el rol (`valid_to`): la Party, sus datos y su origen siguen, y pasa a
-- listarse en Empresas o Personas. No se crea otra Party, así que un doble clic no
-- duplica nada.

alter table party_role
  add column origin text check (origin in ('INSTAGRAM', 'FACEBOOK', 'WEB', 'GOOGLE', 'MANUAL')),
  add column created_by_user_id uuid references app_user (id);

comment on column party_role.origin is 'De dónde llegó el prospecto. Queda después de convertirlo en cliente.';

grant insert (kind, display_name_cache) on party to broker_app;
grant insert (party_id, first_name, last_name, dni) on person_profile to broker_app;
grant insert (party_id, legal_name, cuit) on organization_profile to broker_app;
grant insert (party_id, role, origin, created_by_user_id) on party_role to broker_app;
grant update (origin, valid_to) on party_role to broker_app;

create policy party_crear on party for insert to broker_app with check ((select authz.es_admin()));
create policy person_profile_crear on person_profile for insert to broker_app with check ((select authz.es_admin()));
create policy organization_profile_crear on organization_profile for insert to broker_app with check ((select authz.es_admin()));
create policy party_role_crear on party_role for insert to broker_app
  with check ((select authz.es_admin()) and role = 'PROSPECT' and created_by_user_id = (select authz.usuario()));
create policy party_role_actualizar on party_role for update to broker_app
  using ((select authz.es_admin())) with check ((select authz.es_admin()));

-- Eliminar un contacto también borra sus roles: un prospecto se puede eliminar. Un rol
-- sigue sin borrarse solo (INV-004); la única excepción es el borrado definitivo de la
-- Party entera, que abre `eliminar_contacto` con una marca local a su transacción.
create or replace function prevent_delete_party_role() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if coalesce(current_setting('broker.borrado_definitivo', true), '') = 'on' then
    return old;
  end if;
  raise exception 'party_role %: no se puede borrar (INV-004); cerrar con valid_to', old.id;
end;
$$;

create or replace function public.eliminar_contacto(contacto uuid) returns text[]
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
  perform set_config('broker.borrado_definitivo', 'on', true);
  delete from public.party_role where party_id = contacto;
  perform set_config('broker.borrado_definitivo', '', true);
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
