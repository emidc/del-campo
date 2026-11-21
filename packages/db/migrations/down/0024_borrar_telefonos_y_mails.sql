-- Reversa de 0024: eliminar un teléfono o un mail vuelve a ser sólo darlo de baja.
drop policy contact_point_borrar on contact_point;
revoke delete on contact_point from broker_app;
