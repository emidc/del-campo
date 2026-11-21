-- Reversa de 0025: sin prospectos.
create or replace function prevent_delete_party_role() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
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

drop policy party_role_actualizar on party_role;
drop policy party_role_crear on party_role;
drop policy organization_profile_crear on organization_profile;
drop policy person_profile_crear on person_profile;
drop policy party_crear on party;
revoke update (origin, valid_to) on party_role from broker_app;
revoke insert (party_id, role, origin, created_by_user_id) on party_role from broker_app;
revoke insert (party_id, legal_name, cuit) on organization_profile from broker_app;
revoke insert (party_id, first_name, last_name, dni) on person_profile from broker_app;
revoke insert (kind, display_name_cache) on party from broker_app;
alter table party_role drop column created_by_user_id, drop column origin;
