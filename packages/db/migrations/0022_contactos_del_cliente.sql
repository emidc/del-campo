-- T-0068 — Teléfonos y mails del cliente, cargados por el equipo.
--
-- Hasta acá `contact_point` sólo se llenaba con la importación de Zoho y la app sólo lo
-- leía. Desde esta migración el equipo puede agregar un teléfono o un mail a un cliente y
-- darlo de baja. Corregir es dar de baja el anterior y agregar el nuevo: la fila vieja
-- queda, inactiva, con quién la dio de baja y cuándo (`valid_to`).
--
-- Lo que carga el equipo lleva `source = 'Broker OS'` y quién lo cargó. Las filas de Zoho
-- quedan como están, con esas columnas en null.

alter table contact_point
  add column created_by_user_id uuid references app_user (id),
  add column ended_by_user_id uuid references app_user (id);

grant insert (party_id, channel, value, normalized_value, source, created_by_user_id) on contact_point to broker_app;
grant update (status, valid_to, ended_by_user_id) on contact_point to broker_app;

create policy contact_point_crear on contact_point for insert to broker_app
  with check (
    (select authz.es_admin())
    and source = 'Broker OS'
    and created_by_user_id = (select authz.usuario())
  );
create policy contact_point_actualizar on contact_point for update to broker_app
  using ((select authz.es_admin()))
  with check ((select authz.es_admin()));
