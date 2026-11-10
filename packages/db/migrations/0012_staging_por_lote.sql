-- T-0037 (I1a, hallazgo H2) — staging conserva cada lote.
--
-- Hasta acá cada tabla de staging tenía clave `source_record_id`: cargar un lote nuevo
-- hacía upsert sobre la fila del anterior y el crudo previo se perdía. Eso contradice
-- DOMAIN.md («staging conserva el lote» y «historia antes que sobrescritura») y deja sin
-- base la comparación entre lotes de I1b. La clave pasa a ser (batch_id,
-- source_record_id): dentro de un lote el «ID de registro» de Zoho sigue siendo único, y
-- cada lote convive con los demás. → docs/migration/zoho/T-0037-refresco.md §1 y §2
--
-- Además, cada lote registra lo que declara su `lote.json` (I1a, hallazgo H5): qué CSV
-- es cada módulo, su SHA-256 según el perfil de T-0004 y la fecha de export del módulo.
--
-- Las filas que ya existen conservan su `batch_id`, así que la migración no mueve ni
-- borra datos. Corre igual en la base local de T-0013 y en producción, donde staging
-- sólo tiene la fila de `staging_import_batch` (docs/despliegue/vercel-vs01.md §9).

alter table staging_policy drop constraint staging_policy_pkey;
alter table staging_policy add constraint staging_policy_pkey primary key (batch_id, source_record_id);

alter table staging_endorsement drop constraint staging_endorsement_pkey;
alter table staging_endorsement add constraint staging_endorsement_pkey primary key (batch_id, source_record_id);

alter table staging_contact drop constraint staging_contact_pkey;
alter table staging_contact add constraint staging_contact_pkey primary key (batch_id, source_record_id);

alter table staging_account drop constraint staging_account_pkey;
alter table staging_account add constraint staging_account_pkey primary key (batch_id, source_record_id);

-- Buscar un registro de origen en todos los lotes (lo que hará la comparación de I1b).
create index staging_policy_source_record_id_idx on staging_policy (source_record_id);
create index staging_endorsement_source_record_id_idx on staging_endorsement (source_record_id);
create index staging_contact_source_record_id_idx on staging_contact (source_record_id);
create index staging_account_source_record_id_idx on staging_account (source_record_id);

-- Un mismo export cargado dos veces es el mismo lote: la carga lo reconoce por la huella
-- del perfil y reutiliza el lote en vez de duplicarlo. La unicidad rige sólo para huellas
-- con forma de SHA-256, porque el lote anterior a T-0037 guardó el nombre del perfil en
-- esta columna. Excluye además la huella fija del seed sintético (`'0' × 64`,
-- `MANIFIESTO_SINTETICO` en packages/api/src/vs01/batch.ts): una base de Preview puede
-- tener más de un lote sintético, y la migración no debe fallar ahí.
create unique index staging_import_batch_huella_unica
  on staging_import_batch (source_manifest_sha256)
  where source_manifest_sha256 ~ '^[0-9a-f]{64}$' and source_manifest_sha256 <> repeat('0', 64);

create table staging_import_batch_module (
  batch_id uuid not null references staging_import_batch (id),
  module text not null check (module in ('Polizas', 'Endosos', 'Contactos', 'Cuentas')),
  -- Ruta del CSV relativa a la raíz del lote, como `raw_relative_path` del perfil.
  csv_relative_path text not null,
  csv_sha256 text not null check (csv_sha256 ~ '^[0-9a-f]{64}$'),
  -- Fecha del export en Zoho según el `lote.json`. La fecha de corte de un lote (I3b) es
  -- la más antigua de sus módulos, no la de importación (`started_at`).
  exported_on date not null,
  row_count integer not null check (row_count >= 0),
  constraint staging_import_batch_module_pk primary key (batch_id, module)
);

comment on table staging_import_batch_module is
  'T-0037: lo que el lote.json declara de cada módulo de un lote de staging, más las filas cargadas.';

-- Como toda tabla de public (0007): RLS habilitado y sin políticas ni grants, así que
-- `broker_app`, `broker_worker` y `broker_mcp` no la ven. La lee sólo quien importa.
alter table staging_import_batch_module enable row level security;
