-- Reversa de 0034. Borra los enlaces de Drive de pólizas y endosos.
drop policy endorsement_actualizar on endorsement;
revoke update (number, drive_url) on endorsement from broker_app;
revoke insert (drive_url) on endorsement from broker_app;
revoke update (drive_url) on policy from broker_app;
revoke insert (drive_url) on policy from broker_app;
alter table endorsement drop column drive_url;
alter table policy drop column drive_url;
