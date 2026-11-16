-- Reversa de 0022: el equipo deja de poder cargar teléfonos y mails.
drop policy contact_point_actualizar on contact_point;
drop policy contact_point_crear on contact_point;
revoke insert (party_id, channel, value, normalized_value, source, created_by_user_id) on contact_point from broker_app;
revoke update (status, valid_to, ended_by_user_id) on contact_point from broker_app;
alter table contact_point
  drop column ended_by_user_id,
  drop column created_by_user_id;
