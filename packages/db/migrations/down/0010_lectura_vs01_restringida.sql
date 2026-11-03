drop policy staging_import_batch_leer on staging_import_batch;
revoke select (started_at, source_manifest_sha256, notes) on staging_import_batch from broker_app;
drop policy external_reference_leer on external_reference;
revoke select on external_reference from broker_app, broker_mcp;
drop function authz.ve_referencia_externa(uuid);
