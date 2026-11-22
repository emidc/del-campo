-- Contactos y empresas editables desde la ficha del cliente.
--
-- 1. Eliminar un teléfono o un mail lo borra de la base: no queda una fila inactiva.
--    Corregir sigue dando de baja el anterior y cargando el nuevo (0022).
-- 2. Razón social y CUIT de una empresa se editan.
-- 3. La carpeta de Drive de un cliente se edita: la que carga el equipo queda con
--    `link_level = 'HUMAN'` y reemplaza a las anteriores del cliente.
-- 4. Un contacto se quita de una empresa borrando el vínculo; las dos fichas siguen.

grant delete on contact_point to broker_app;
create policy contact_point_borrar on contact_point for delete to broker_app
  using ((select authz.es_admin()));

grant update (legal_name, trade_name, cuit) on organization_profile to broker_app;
create policy organization_profile_actualizar on organization_profile for update to broker_app
  using ((select authz.es_admin())) with check ((select authz.es_admin()));

grant insert (resource_type, resource_id, drive_file_id, drive_url, drive_item_type, reconciliation_status, link_level)
  on document_link to broker_app;
grant delete on document_link to broker_app;
create policy document_link_carpeta_crear on document_link for insert to broker_app
  with check ((select authz.es_admin()) and resource_type = 'PARTY' and drive_item_type = 'FOLDER' and link_level = 'HUMAN');
create policy document_link_carpeta_borrar on document_link for delete to broker_app
  using ((select authz.es_admin()) and resource_type = 'PARTY' and drive_item_type = 'FOLDER');

grant delete on organization_membership to broker_app;
create policy organization_membership_borrar on organization_membership for delete to broker_app
  using ((select authz.es_admin()));
