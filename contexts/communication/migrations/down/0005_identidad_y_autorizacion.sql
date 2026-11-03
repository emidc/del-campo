-- Reversa de 0005. Borra las tablas de identidad y de auditoría con sus datos, la autoría
-- de los intentos de envío, las funciones y las políticas, y deshabilita RLS: el esquema
-- queda como en 0004. Antes de bajarla en una base con personas cargadas hay que decidir
-- qué hacer con esa historia.

drop policy if exists message_leer on communication.message;
drop policy if exists message_responder on communication.message;
drop policy if exists outbound_status_leer on communication.outbound_status;
drop policy if exists unsupported_message_leer on communication.unsupported_message;
drop policy if exists outbound_attempt_leer on communication.outbound_attempt;
drop policy if exists outbound_attempt_crear on communication.outbound_attempt;
drop policy if exists outbound_attempt_cerrar on communication.outbound_attempt;
drop policy if exists webhook_delivery_leer on communication.webhook_delivery;

revoke all on communication.message, communication.outbound_status, communication.unsupported_message,
  communication.outbound_attempt, communication.webhook_delivery
  from communication_app;

alter table communication.outbound_attempt drop column created_by;

drop table communication.audit_event;
drop function communication.audit_event_solo_insercion();
drop table communication.user_invitation;
drop table communication.user_credential;
drop table communication.app_user;

drop function communication.authz_puede_responder();
drop function communication.authz_puede_leer();
drop function communication.authz_es_admin();
drop function communication.authz_rol();
drop function communication.authz_usuario();
drop function communication.authz_usuario_declarado();

do $$
declare
  tabla text;
begin
  for tabla in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'communication' and c.relkind = 'r'
  loop
    execute format('alter table communication.%I disable row level security', tabla);
  end loop;
end
$$;

revoke usage on schema communication from communication_app;
revoke communication_app from current_user;

-- El rol es del servidor, no de la base. En local, `delcampo_communication_dev` y
-- `delcampo_communication_test` comparten servidor: si la otra base todavía lo usa, el
-- rol queda y sólo se pierden sus permisos en ésta.
do $$
begin
  drop role if exists communication_app;
exception when dependent_objects_still_exist then
  raise notice 'communication_app sigue en uso en otra base del servidor: queda el rol';
end
$$;
