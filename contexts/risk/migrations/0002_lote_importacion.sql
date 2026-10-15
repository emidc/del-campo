-- Lotes importados (T-0029): uno por importación que escribió algo. La huella de los tres
-- archivos reconoce un lote ya importado antes de validarlo (H3, `SLICES/RO01-decisiones.md`
-- punto 9); los conteos dicen qué dejó en cada tabla.
--
-- Las filas de un lote no apuntan a esta tabla: todas se escriben en la misma transacción, y
-- `now()` es la hora de inicio de la transacción, así que su `registrado_en` /
-- `registrada_en` es igual a `importado_en` del lote.

create table risk.lote_importacion (
  id                     bigint generated always as identity primary key,
  -- sha256 de las huellas de los tres archivos, en el orden del contrato (`risks.csv`,
  -- `action-plan.csv`, `risk-transfer.csv`).
  huella                 text not null constraint lote_importacion_huella_unica unique,
  huella_risks           text not null,
  huella_action_plan     text not null,
  huella_risk_transfer   text not null,
  -- De dónde salieron los archivos (la carpeta que se importó) y quién lo importó.
  origen                 risk.texto not null,
  importado_por          risk.texto not null,
  importado_en           timestamptz not null default now(),
  -- La fecha contra la que se miraron los vencimientos (RV-TRF-09, RV-ACC-11).
  fecha_corte            date not null,
  filas_risks            integer not null,
  filas_action_plan      integer not null,
  filas_risk_transfer    integer not null,
  avisos                 integer not null,
  -- Filas escritas por tabla del esquema.
  escritas               jsonb not null,
  constraint lote_importacion_huellas_sha256 check (
    huella ~ '^[0-9a-f]{64}$' and huella_risks ~ '^[0-9a-f]{64}$'
    and huella_action_plan ~ '^[0-9a-f]{64}$' and huella_risk_transfer ~ '^[0-9a-f]{64}$'),
  constraint lote_importacion_conteos_no_negativos check (
    filas_risks >= 0 and filas_action_plan >= 0 and filas_risk_transfer >= 0 and avisos >= 0)
);
comment on table risk.lote_importacion is
  'RO01 §2, importación validada: cada lote de los tres CSV que se escribió, con su huella (H3), su origen, quién lo importó, cuándo, la fecha de corte y lo que dejó en cada tabla.';

create trigger solo_insercion before update or delete on risk.lote_importacion
  for each row execute function risk.solo_insercion();
create trigger solo_insercion_truncate before truncate on risk.lote_importacion
  for each statement execute function risk.solo_insercion();
