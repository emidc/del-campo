-- T-0035 — Lo que las consultas de VS01 leen y la 0007 no le daba a `broker_app`. Sin
-- esto, en `AUTH_MODE=oidc` la búsqueda y la ficha de póliza fallarían con 42501.
--
-- * `external_reference`: la referencia documental de Zoho de una póliza. Se ve sólo a
--   través de una `policy_document_reference` de una póliza que se ve completa
--   (`authz.ve_poliza`): la misma regla que la 0009 aplica a documentos y endosos.
-- * `staging_import_batch`: la fecha y la huella del lote importado, que VS01 muestra
--   siempre (SLICES/VS01.md §2). No son datos de clientes. Se da `select` sólo sobre
--   esas tres columnas; el resto de staging sigue cerrado.
--
-- Como la 0007, nada de esto rige para la conexión actual, que es dueña de las tablas.

-- La regla va en una función de authz y no en una subconsulta de la política: así la
-- política no depende de `policy_document_reference`, y el down de la 0002 puede seguir
-- borrando esa tabla.
create function authz.ve_referencia_externa(referencia uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select authz.es_admin() or exists (
    select 1 from public.policy_document_reference pdr
    where pdr.external_reference_id = referencia and authz.ve_poliza(pdr.policy_id)
  )
$$;
revoke all on function authz.ve_referencia_externa(uuid) from public;
grant execute on function authz.ve_referencia_externa(uuid) to broker_app, broker_mcp;

grant select on external_reference to broker_app, broker_mcp;
create policy external_reference_leer on external_reference for select to broker_app, broker_mcp
  using (authz.ve_referencia_externa(id));

grant select (started_at, source_manifest_sha256, notes) on staging_import_batch to broker_app;
create policy staging_import_batch_leer on staging_import_batch for select to broker_app
  using (true);
