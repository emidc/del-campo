-- T-0013 — staging fiel al origen para el subconjunto aprobado de T-0004/D-0031 que el
-- ## Outcome de T-0013 nombra: Polizas, Endosos, Contactos, Cuentas, Productos,
-- Proveedores. Claims/Tasks/Notes/Opportunities quedan fuera de esta migración: D-0033
-- no le asigna a T-0013 su preservación y el Outcome congelado no las menciona.
-- → D-0033, D-0053, DOMAIN.md STAGING ONLY (§3)
--
-- Cada tabla fuente tiene entre 30 y 95 columnas (ver el manifiesto de T-0004). Fijar una
-- columna física por cada una sería fidelidad literal pero un schema que nadie puede leer
-- ni mantener, y la mitad de esas columnas ni el importador ni ningún reporte las tocan
-- todavía. La fidelidad la sostiene `raw jsonb not null`, que preserva TODAS las columnas
-- originales con su encabezado en español tal cual el CSV, sin pérdida y sin interpretar
-- nada; las columnas físicas al lado son sólo las que el importador necesita indexar o
-- unir. El mismo patrón que `policy_version.coverage_data` ya usa para un blob opaco.
-- Precedente de la decisión: `0001_vs01_core_schema.sql`.
--
-- Todas las tablas de staging viven en una base local bajo custodia del owner (D-0053);
-- que contengan PII real es esperado y correcto — la separación que protege al
-- repositorio es que nada de esto se versiona ni se commitea, nunca que la base misma
-- esté libre de datos de clientes.

create table staging_import_batch (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  source_manifest_sha256 text not null,
  notes text
);

-- ── Fuentes fieles al origen ─────────────────────────────────────────────────
-- Clave primaria por (module, source_record_id), no por batch: correr el import dos
-- veces sobre la misma entrada hace upsert sobre la misma fila (mismo "ID de registro"
-- de Zoho), no duplica. T-0004 confirmó 0 IDs de registro vacíos o repetidos en Polizas;
-- se asume la misma propiedad para los demás módulos y el importador la vuelve a
-- comprobar en tiempo de carga, no sólo se la cree.

create table staging_policy (
  source_record_id text primary key,
  batch_id uuid not null references staging_import_batch (id),
  contact_source_id text,
  account_source_id text,
  insurer_source_id text,
  raw jsonb not null,
  imported_at timestamptz not null default now()
);

create table staging_endorsement (
  source_record_id text primary key,
  batch_id uuid not null references staging_import_batch (id),
  policy_source_id text,
  raw jsonb not null,
  imported_at timestamptz not null default now()
);

create table staging_contact (
  source_record_id text primary key,
  batch_id uuid not null references staging_import_batch (id),
  account_source_id text,
  raw jsonb not null,
  imported_at timestamptz not null default now()
);

create table staging_account (
  source_record_id text primary key,
  batch_id uuid not null references staging_import_batch (id),
  raw jsonb not null,
  imported_at timestamptz not null default now()
);

create index staging_policy_contact_source_id_idx on staging_policy (contact_source_id);
create index staging_policy_account_source_id_idx on staging_policy (account_source_id);
create index staging_policy_insurer_source_id_idx on staging_policy (insurer_source_id);
create index staging_endorsement_policy_source_id_idx on staging_endorsement (policy_source_id);
create index staging_contact_account_source_id_idx on staging_contact (account_source_id);

-- ── Excepciones de clasificación ─────────────────────────────────────────────
-- `detail_code` es un identificador corto y acotado (p. ej. el propio texto crudo de
-- Compañía cuando la clase es UNKNOWN_INSURER_STRING, para que la resolución humana
-- sepa qué string resolver) — nunca una oración libre que pueda arrastrar datos de otras
-- columnas del origen. failure_class se valida en aplicación contra failure-classes.ts,
-- no con un CHECK: la lista vive en un solo lugar (R-01) y el CHECK la duplicaría.

create table staging_import_exception (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references staging_import_batch (id),
  module text not null check (module in ('Polizas', 'Endosos', 'Contactos', 'Cuentas')),
  source_record_id text not null,
  failure_class text not null,
  detail_code text,
  created_at timestamptz not null default now()
);

create index staging_import_exception_failure_class_idx on staging_import_exception (failure_class);

-- Idempotencia del reporte de excepciones: la identidad es (module, source_record_id,
-- failure_class), NO el batch. Sin esto, cada corrida agrega una fila más por excepción
-- ya conocida y el reporte agregado deja de significar "estado actual" para pasar a
-- significar "cuántas veces se corrió el import", que es exactamente lo que la prueba de
-- idempotencia del Paso 7 existe para prohibir.
alter table staging_import_exception
  add constraint staging_import_exception_identity_unique
  unique (module, source_record_id, failure_class);

-- ── Idempotencia de Party ─────────────────────────────────────────────────────
-- Una fila de Contacto o Cuenta crea una Party la primera vez y la reutiliza en cada
-- rerun por esta tabla — nunca por matching difuso contra Parties existentes. Eso
-- preserva "matching ≠ merge" (§61, DOMAIN.md) incluso entre corridas del importador:
-- ninguna corrida decide fusionar dos fuentes distintas sólo porque coincide un campo.

create table party_source_link (
  source_system text not null,
  source_entity_type text not null check (source_entity_type in ('Contactos', 'Cuentas')),
  source_record_id text not null,
  party_id uuid not null references party (id),
  created_at timestamptz not null default now(),
  constraint party_source_link_pk primary key (source_system, source_entity_type, source_record_id)
);

create index party_source_link_party_id_idx on party_source_link (party_id);

-- ── Constraints de apoyo, sólo para deduplicar escrituras de ESTE importador ─────────
-- No resuelven D-0024 (unicidad física de ContactPoint) ni D-0035: ambas siguen OPEN.
-- Sin esto, correr el import dos veces insertaría un ContactPoint/ExternalReference
-- físicamente distinto pero idéntico en contenido por cada corrida, y "mismo estado"
-- (la prueba de idempotencia del Paso 7) dejaría de ser cierto en sentido literal.

alter table contact_point
  add constraint contact_point_import_dedup
  unique (party_id, channel, normalized_value, source);

-- Sin esta constraint, cada corrida del importador insertaría un InsurerAlias
-- físicamente distinto por cada string de Compañía observado, aunque el contenido sea
-- idéntico a una corrida anterior.
alter table insurer_alias
  add constraint insurer_alias_import_dedup
  unique (alias, source_system);

-- Idempotencia de Endorsement: `source_reference` ya es NOT NULL (0001) y lleva el
-- "ID de registro" del Endoso de origen, que T-0004 no reportó vacío ni repetido para
-- Polizas — se asume la misma propiedad acá y se hace cumplir con esta unique.
alter table endorsement
  add constraint endorsement_source_reference_unique
  unique (source_reference);

alter table external_reference
  add constraint external_reference_import_dedup
  unique (source_system, source_entity_type, source_external_id, relation_type);

comment on constraint contact_point_import_dedup on contact_point is
  'T-0013: dedup de escritura idempotente del importador de Zoho. No es la unicidad '
  'global de D-0024, que sigue OPEN.';

comment on constraint external_reference_import_dedup on external_reference is
  'T-0013: dedup de escritura idempotente del importador de Zoho.';
