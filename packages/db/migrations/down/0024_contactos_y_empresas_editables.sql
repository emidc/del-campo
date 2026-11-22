-- Reversa de 0024.
drop policy organization_membership_borrar on organization_membership;
revoke delete on organization_membership from broker_app;
drop policy document_link_carpeta_borrar on document_link;
drop policy document_link_carpeta_crear on document_link;
revoke delete on document_link from broker_app;
revoke insert (resource_type, resource_id, drive_file_id, drive_url, drive_item_type, reconciliation_status, link_level)
  on document_link from broker_app;
drop policy organization_profile_actualizar on organization_profile;
revoke update (legal_name, trade_name, cuit) on organization_profile from broker_app;
drop policy contact_point_borrar on contact_point;
revoke delete on contact_point from broker_app;
