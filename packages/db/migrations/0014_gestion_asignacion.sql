-- T-0046 — Asignar y repartir gestiones (0013_gestion.sql).
--
-- Una gestión se puede asignar a cualquier integrante que vea a su cliente: un
-- Administrador o un Operador con el cliente asignado. Asignarla a quien no lo ve la
-- dejaría invisible para su responsable, así que RLS lo rechaza. Cada asignación queda en
-- la historia con el evento ASIGNACION.

create function authz.integrantes_que_ven(cliente uuid) returns table (id uuid, email text)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email from public.app_user u
  where authz.usuario() is not null
    and u.status = 'ACTIVE'
    and (
      u.role = 'ADMINISTRADOR'
      or (u.role = 'OPERADOR' and exists (
        select 1 from public.client_assignment a
        where a.user_id = u.id and a.client_party_id = cliente and a.valid @> pg_catalog.now()
      ))
    )
  order by u.email
$$;
revoke all on function authz.integrantes_que_ven(uuid) from public;
grant execute on function authz.integrantes_que_ven(uuid) to broker_app, broker_mcp;

drop policy service_case_actualizar on service_case;
create policy service_case_actualizar on service_case for update to broker_app
  using (authz.ve_cliente(party_id) and (policy_id is null or authz.ve_poliza(policy_id)))
  with check (
    authz.ve_cliente(party_id)
    and (policy_id is null or authz.ve_poliza(policy_id))
    and (assigned_user_id is null
      or assigned_user_id in (select i.id from authz.integrantes_que_ven(party_id) i))
  );

alter table service_case_event drop constraint service_case_event_kind_check;
alter table service_case_event add constraint service_case_event_kind_check
  check (kind in ('ALTA', 'NOTA', 'ESTADO', 'CIERRE', 'ASIGNACION'));
