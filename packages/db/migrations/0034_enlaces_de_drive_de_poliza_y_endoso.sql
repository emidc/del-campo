-- Enlace al documento en Google Drive de una póliza y de cada endoso. El equipo lo carga
-- al renovar, al registrar un endoso o desde la ficha de la póliza. Es la URL completa de
-- un archivo de Drive; la app valida la forma. Vacío no se guarda: queda `null`.
--
-- Además el equipo corrige el número de un endoso desde la ficha. El número sigue siendo
-- único por póliza entre los que registra Broker OS (0023); la app también lo verifica
-- contra los importados.

alter table policy
  add column drive_url text check (drive_url is null or (btrim(drive_url) <> '' and length(drive_url) <= 500));
alter table endorsement
  add column drive_url text check (drive_url is null or (btrim(drive_url) <> '' and length(drive_url) <= 500));

grant insert (drive_url) on policy to broker_app;
grant update (drive_url) on policy to broker_app;
grant insert (drive_url) on endorsement to broker_app;
grant update (number, drive_url) on endorsement to broker_app;

create policy endorsement_actualizar on endorsement for update to broker_app
  using ((select authz.es_admin())) with check ((select authz.es_admin()));
