-- Reversa de 0028. Borra nombres visibles y fotos.
revoke update (service_case_id) on task from broker_app;
drop function authz.editar_perfil(uuid, text, boolean, bytea, text);
drop function authz.foto_integrante(uuid);
drop function authz.equipo_visible();
drop function authz.nombre_integrante(uuid);
alter table app_user
  drop constraint app_user_foto_con_tipo,
  drop column photo_type,
  drop column photo,
  drop column display_name;
