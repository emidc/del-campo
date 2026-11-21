-- Eliminar un teléfono o un mail desde la ficha del cliente lo borra de la base: no queda
-- una fila inactiva. Corregir sigue dando de baja el anterior y cargando el nuevo (0022).

grant delete on contact_point to broker_app;

create policy contact_point_borrar on contact_point for delete to broker_app
  using ((select authz.es_admin()));
