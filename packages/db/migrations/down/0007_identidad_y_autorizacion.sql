-- Inversa de 0007_identidad_y_autorizacion.sql. Borra las tablas nuevas con sus datos
-- (credenciales, invitaciones, asignaciones y auditoría), deshabilita RLS y quita los
-- roles. Fallaría si algún app_user quedó en INVITED o tiene rol: antes de bajarla hay
-- que decidir qué hacer con esas filas.

drop policy if exists party_leer on party;
drop policy if exists person_profile_leer on person_profile;
drop policy if exists organization_profile_leer on organization_profile;
drop policy if exists party_role_leer on party_role;
drop policy if exists contact_point_leer on contact_point;
drop policy if exists organization_membership_leer on organization_membership;
drop policy if exists insurer_leer on insurer;
drop policy if exists insurer_alias_leer on insurer_alias;
drop policy if exists policy_leer on policy;
drop policy if exists policy_version_leer on policy_version;
drop policy if exists endorsement_leer on endorsement;
drop policy if exists policy_document_reference_leer on policy_document_reference;
drop policy if exists document_link_leer on document_link;
drop policy if exists app_user_leer on app_user;

do $$
declare
  tabla text;
begin
  for tabla in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I disable row level security', tabla);
  end loop;
end
$$;

drop table audit_event;
drop function audit_event_solo_insercion();
drop table client_assignment;
drop table user_invitation;
drop table user_credential;

drop schema authz cascade;

alter table app_user drop constraint app_user_status_check;
alter table app_user add constraint app_user_status_check check (status in ('ACTIVE', 'INACTIVE'));
alter table app_user drop column role;

revoke all on all tables in schema public from broker_app, broker_worker, broker_mcp;
drop role broker_app;
drop role broker_worker;
drop role broker_mcp;
