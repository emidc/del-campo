-- Inversa de 0014. Falla si ya hay eventos ASIGNACION: borrarlos sería borrar historia.
alter table service_case_event drop constraint service_case_event_kind_check;
alter table service_case_event add constraint service_case_event_kind_check
  check (kind in ('ALTA', 'NOTA', 'ESTADO', 'CIERRE'));

drop policy service_case_actualizar on service_case;
create policy service_case_actualizar on service_case for update to broker_app
  using (authz.ve_cliente(party_id) and (policy_id is null or authz.ve_poliza(policy_id)))
  with check (authz.ve_cliente(party_id) and (policy_id is null or authz.ve_poliza(policy_id)));

drop function authz.integrantes_que_ven(uuid);
