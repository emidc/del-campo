-- Modelo de datos de riesgos: lo que el agente de riesgos necesita saber de cada empresa.
--
-- Las notas del cerebro de riesgos viven fuera de Broker OS, como archivos. Acá se guarda
-- lo que es de cada cliente:
--
--   * `client_location`: ubicaciones de la empresa (planta, depósito, hotel, obra).
--   * `location_fact`: condiciones observables por ubicación (o de toda la empresa si no
--     hay ubicación): zona inundable, obra en curso, subsuelo, carga de VE, protección…
--     Sólo de alta: la vigente es la última de cada (empresa, ubicación, atributo). Cada
--     una guarda su estado: desconocida, declarada por el cliente, confirmada (visita o
--     documento) o propuesta por el agente, que queda pendiente hasta tener evidencia.
--   * `policy_coverage`: coberturas, sublímites, condiciones y exclusiones de una póliza,
--     con el endoso y la página o cláusula de donde salen. Un endoso que cambia un valor es
--     una fila nueva que reemplaza a la anterior: el valor previo y su cita quedan. La
--     cobertura a una fecha la da `coberturas_a_fecha`. El agente la propone y una persona
--     del equipo la confirma.
--   * `survey`, `survey_finding`: cada relevamiento y sus hallazgos por sector y tema
--     (protección, mantenimiento, prueba, hallazgo), para sacar cifras propias de cartera.
--   * `risk_conclusion`, `risk_conclusion_evidence`: lo que concluye el agente, con el
--     nivel de la plantilla v2 (1 orientar, 2 caracterizar, 3 cobertura, 4 normativa o
--     mercado), la nota que lo respalda y la evidencia. Si falta un documento queda
--     pendiente y dice cuál. Una persona del equipo la acepta o la rechaza.
--
-- Cada fila guarda quién la escribió y, si la escribió un agente, cuál (`agent`). Se ve y
-- se escribe si se ve a la empresa (o la póliza). Es de uso interno: el portal no la lee.

-- ── Ubicaciones ──────────────────────────────────────────────────────────────

create table client_location (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references party (id),
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  address text check (length(address) <= 300),
  locality text check (length(locality) <= 120),
  province text check (length(province) <= 120),
  created_by_user_id uuid not null references app_user (id),
  agent text check (agent ~ '^[a-z][a-z0-9-]{1,40}@[0-9][0-9.]{0,15}$'),
  created_at timestamptz not null default clock_timestamp(),
  constraint client_location_id_party_unique unique (id, party_id)
);

create index client_location_party_idx on client_location (party_id);

-- ── Condiciones por ubicación ────────────────────────────────────────────────

create table location_fact (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references party (id),
  location_id uuid,
  attribute text not null check (attribute ~ '^[a-z][a-z0-9_]{1,60}$'),
  value text check (length(value) <= 2000),
  status text not null check (status in ('DESCONOCIDO', 'DECLARADO', 'CONFIRMADO', 'PROPUESTO')),
  source text not null check (source in ('CLIENTE', 'VISITA', 'DOCUMENTO', 'POLIZA', 'AGENTE')),
  source_reference text check (length(source_reference) <= 500),
  observed_on date,
  created_by_user_id uuid not null references app_user (id),
  agent text check (agent ~ '^[a-z][a-z0-9-]{1,40}@[0-9][0-9.]{0,15}$'),
  created_at timestamptz not null default clock_timestamp(),
  constraint location_fact_ubicacion_de_la_empresa
    foreign key (location_id, party_id) references client_location (id, party_id),
  -- Desconocido no lleva valor; lo demás sí.
  constraint location_fact_valor_segun_estado check ((status = 'DESCONOCIDO') = (value is null)),
  -- Confirmado es por una visita, un documento o la póliza, no por el agente ni por el cliente.
  constraint location_fact_confirmado_con_evidencia
    check (status <> 'CONFIRMADO' or (source in ('VISITA', 'DOCUMENTO', 'POLIZA') and source_reference is not null)),
  -- Lo que infiere el agente queda propuesto.
  constraint location_fact_agente_propone check ((source = 'AGENTE') = (status = 'PROPUESTO'))
);

create index location_fact_vigente_idx on location_fact (party_id, attribute, location_id, created_at desc);

-- La condición vigente de cada (empresa, ubicación, atributo).
create view location_fact_current with (security_invoker = true) as
  select distinct on (party_id, location_id, attribute) *
  from location_fact
  order by party_id, location_id, attribute, created_at desc, id desc;

-- ── Coberturas de una póliza ─────────────────────────────────────────────────

create table policy_coverage (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references policy (id),
  endorsement_id uuid,
  kind text not null check (kind in ('COBERTURA', 'SUBLIMITE', 'CONDICION', 'EXCLUSION')),
  coverage text not null check (btrim(coverage) <> '' and length(coverage) <= 200),
  location_id uuid references client_location (id),
  asset text check (length(asset) <= 200),
  limit_amount numeric check (limit_amount >= 0),
  currency text check (currency ~ '^[A-Z]{3}$'),
  limit_basis text check (length(limit_basis) <= 200),
  deductible text check (length(deductible) <= 300),
  detail text check (length(detail) <= 2000),
  effective_from date not null,
  replaces_id uuid unique,
  source_document text not null check (btrim(source_document) <> '' and length(source_document) <= 300),
  source_location text not null check (btrim(source_location) <> '' and length(source_location) <= 200),
  created_by_user_id uuid not null references app_user (id),
  agent text check (agent ~ '^[a-z][a-z0-9-]{1,40}@[0-9][0-9.]{0,15}$'),
  created_at timestamptz not null default clock_timestamp(),
  confirmed_by_user_id uuid references app_user (id),
  confirmed_at timestamptz,
  constraint policy_coverage_id_policy_unique unique (id, policy_id),
  constraint policy_coverage_endoso_de_la_poliza
    foreign key (endorsement_id, policy_id) references endorsement (id, policy_id),
  constraint policy_coverage_reemplaza_de_la_poliza
    foreign key (replaces_id, policy_id) references policy_coverage (id, policy_id),
  constraint policy_coverage_no_se_reemplaza_a_si_misma check (replaces_id <> id),
  constraint policy_coverage_monto_con_moneda check (limit_amount is null or currency is not null),
  constraint policy_coverage_confirmacion_completa
    check ((confirmed_by_user_id is null) = (confirmed_at is null))
);

create index policy_coverage_policy_idx on policy_coverage (policy_id, effective_from);

-- Un reemplazo rige desde la misma fecha o después que lo que reemplaza.
create function policy_coverage_reemplazo_posterior() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.replaces_id is not null and exists (
    select 1 from policy_coverage c where c.id = new.replaces_id and c.effective_from > new.effective_from
  ) then
    raise exception 'el reemplazo de una cobertura no puede regir antes que la cobertura que reemplaza';
  end if;
  return new;
end;
$$;

create trigger policy_coverage_reemplazo_posterior
  before insert on policy_coverage
  for each row execute function policy_coverage_reemplazo_posterior();

-- Lo que rige en una fecha: lo que ya empezó y no fue reemplazado hasta esa fecha.
create function public.coberturas_a_fecha(poliza uuid, fecha date) returns setof public.policy_coverage
language sql stable security invoker set search_path = '' as $$
  select c.* from public.policy_coverage c
  where c.policy_id = poliza
    and c.effective_from <= fecha
    and not exists (
      select 1 from public.policy_coverage n
      where n.replaces_id = c.id and n.effective_from <= fecha
    )
  order by c.kind, c.coverage, c.location_id, c.asset
$$;

-- ── Relevamientos ────────────────────────────────────────────────────────────

create table survey (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references party (id),
  location_id uuid,
  visited_on date not null,
  performed_by text not null check (btrim(performed_by) <> '' and length(performed_by) <= 300),
  source_document text check (length(source_document) <= 300),
  summary text check (length(summary) <= 4000),
  created_by_user_id uuid not null references app_user (id),
  agent text check (agent ~ '^[a-z][a-z0-9-]{1,40}@[0-9][0-9.]{0,15}$'),
  created_at timestamptz not null default clock_timestamp(),
  constraint survey_ubicacion_de_la_empresa
    foreign key (location_id, party_id) references client_location (id, party_id)
);

create index survey_party_idx on survey (party_id, visited_on);

create table survey_finding (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references survey (id),
  area text check (length(area) <= 200),
  topic text not null check (topic ~ '^[a-z][a-z0-9_]{1,60}$'),
  aspect text not null check (aspect in ('PROTECCION', 'MANTENIMIENTO', 'PRUEBA', 'HALLAZGO')),
  result text not null check (result in ('CUMPLE', 'PARCIAL', 'NO_CUMPLE', 'NO_EXISTE', 'NO_VERIFICADO')),
  priority text check (priority in ('CRITICA', 'ALTA', 'MEDIA', 'BAJA')),
  description text not null check (btrim(description) <> '' and length(description) <= 4000),
  recommendation text check (length(recommendation) <= 4000),
  source_location text check (length(source_location) <= 200),
  created_by_user_id uuid not null references app_user (id),
  agent text check (agent ~ '^[a-z][a-z0-9-]{1,40}@[0-9][0-9.]{0,15}$'),
  created_at timestamptz not null default clock_timestamp()
);

create index survey_finding_survey_idx on survey_finding (survey_id);
create index survey_finding_topic_idx on survey_finding (topic, aspect);

-- ── Conclusiones del agente ──────────────────────────────────────────────────

create table risk_conclusion (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references party (id),
  location_id uuid,
  level smallint not null check (level between 1 and 4),
  statement text not null check (btrim(statement) <> '' and length(statement) <= 4000),
  note_id text not null check (note_id ~ '^(F-[A-Z0-9-]{2,30}|[A-Z]{2,4}-[0-9]{3})$'),
  note_version text check (length(note_version) <= 40),
  policy_id uuid references policy (id),
  endorsement_id uuid,
  status text not null check (status in ('PENDIENTE', 'RESPALDADA')),
  missing_document text check (length(missing_document) <= 500),
  created_by_user_id uuid not null references app_user (id),
  agent text check (agent ~ '^[a-z][a-z0-9-]{1,40}@[0-9][0-9.]{0,15}$'),
  created_at timestamptz not null default clock_timestamp(),
  review text check (review in ('ACEPTADA', 'RECHAZADA')),
  review_comment text check (length(review_comment) <= 2000),
  reviewed_by_user_id uuid references app_user (id),
  reviewed_at timestamptz,
  constraint risk_conclusion_ubicacion_de_la_empresa
    foreign key (location_id, party_id) references client_location (id, party_id),
  constraint risk_conclusion_endoso_de_la_poliza
    foreign key (endorsement_id, policy_id) references endorsement (id, policy_id),
  -- Pendiente dice qué documento falta; respaldada no.
  constraint risk_conclusion_pendiente_dice_que_falta
    check ((status = 'PENDIENTE') = (missing_document is not null and btrim(missing_document) <> '')),
  -- Nivel 3 (cobertura) cita la póliza del cliente.
  constraint risk_conclusion_cobertura_cita_poliza check (level <> 3 or policy_id is not null),
  constraint risk_conclusion_revision_completa
    check ((review is null) = (reviewed_by_user_id is null) and (review is null) = (reviewed_at is null))
);

create index risk_conclusion_party_idx on risk_conclusion (party_id, created_at);
create index risk_conclusion_pendientes_idx on risk_conclusion (party_id) where review is null;

-- La póliza citada es de la empresa de la conclusión.
create function risk_conclusion_poliza_del_cliente() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.policy_id is not null and not exists (
    select 1 from policy_version v where v.policy_id = new.policy_id and v.holder_party_id = new.party_id
  ) then
    raise exception 'la póliza de la conclusión es de otro cliente';
  end if;
  return new;
end;
$$;

create trigger risk_conclusion_poliza_del_cliente
  before insert on risk_conclusion
  for each row execute function risk_conclusion_poliza_del_cliente();

-- La evidencia: una condición, una cobertura, un hallazgo o un documento con su ubicación.
create table risk_conclusion_evidence (
  id uuid primary key default gen_random_uuid(),
  conclusion_id uuid not null references risk_conclusion (id),
  location_fact_id uuid references location_fact (id),
  policy_coverage_id uuid references policy_coverage (id),
  survey_finding_id uuid references survey_finding (id),
  document text check (length(document) <= 300),
  document_location text check (length(document_location) <= 200),
  created_at timestamptz not null default clock_timestamp(),
  constraint risk_conclusion_evidence_una_sola
    check (num_nonnulls(location_fact_id, policy_coverage_id, survey_finding_id, document) = 1),
  constraint risk_conclusion_evidence_documento_con_ubicacion
    check (document is null or document_location is not null)
);

create index risk_conclusion_evidence_conclusion_idx on risk_conclusion_evidence (conclusion_id);

-- ── Acceso ───────────────────────────────────────────────────────────────────
-- Sólo de alta. Lo único que se actualiza es la confirmación de una cobertura y la
-- revisión de una conclusión. Las hace una persona desde la app: el MCP no las ofrece.

alter table client_location enable row level security;
alter table location_fact enable row level security;
alter table policy_coverage enable row level security;
alter table survey enable row level security;
alter table survey_finding enable row level security;
alter table risk_conclusion enable row level security;
alter table risk_conclusion_evidence enable row level security;

grant select, insert on client_location, location_fact, policy_coverage, survey, survey_finding,
  risk_conclusion, risk_conclusion_evidence to broker_app;
grant select on location_fact_current to broker_app;
grant update (confirmed_by_user_id, confirmed_at) on policy_coverage to broker_app;
grant update (review, review_comment, reviewed_by_user_id, reviewed_at) on risk_conclusion to broker_app;
grant execute on function public.coberturas_a_fecha(uuid, date) to broker_app;

create policy client_location_leer on client_location for select to broker_app
  using ((select authz.es_admin()) and authz.ve_cliente(party_id));
create policy client_location_crear on client_location for insert to broker_app
  with check ((select authz.es_admin()) and authz.ve_cliente(party_id) and created_by_user_id = (select authz.usuario()));

create policy location_fact_leer on location_fact for select to broker_app
  using ((select authz.es_admin()) and authz.ve_cliente(party_id));
create policy location_fact_crear on location_fact for insert to broker_app
  with check ((select authz.es_admin()) and authz.ve_cliente(party_id) and created_by_user_id = (select authz.usuario()));

create policy policy_coverage_leer on policy_coverage for select to broker_app
  using ((select authz.es_admin()) and authz.ve_poliza(policy_id));
create policy policy_coverage_crear on policy_coverage for insert to broker_app
  with check (
    (select authz.es_admin()) and authz.ve_poliza(policy_id)
    and created_by_user_id = (select authz.usuario())
    and confirmed_by_user_id is null
  );
create policy policy_coverage_confirmar on policy_coverage for update to broker_app
  using ((select authz.es_admin()) and authz.ve_poliza(policy_id) and confirmed_by_user_id is null)
  with check (confirmed_by_user_id = (select authz.usuario()));

create policy survey_leer on survey for select to broker_app
  using ((select authz.es_admin()) and authz.ve_cliente(party_id));
create policy survey_crear on survey for insert to broker_app
  with check ((select authz.es_admin()) and authz.ve_cliente(party_id) and created_by_user_id = (select authz.usuario()));

create policy survey_finding_leer on survey_finding for select to broker_app
  using (exists (select 1 from survey s where s.id = survey_id));
create policy survey_finding_crear on survey_finding for insert to broker_app
  with check (exists (select 1 from survey s where s.id = survey_id) and created_by_user_id = (select authz.usuario()));

create policy risk_conclusion_leer on risk_conclusion for select to broker_app
  using ((select authz.es_admin()) and authz.ve_cliente(party_id));
create policy risk_conclusion_crear on risk_conclusion for insert to broker_app
  with check (
    (select authz.es_admin()) and authz.ve_cliente(party_id)
    and created_by_user_id = (select authz.usuario())
    and review is null
  );
create policy risk_conclusion_revisar on risk_conclusion for update to broker_app
  using ((select authz.es_admin()) and authz.ve_cliente(party_id) and review is null)
  with check (reviewed_by_user_id = (select authz.usuario()));

create policy risk_conclusion_evidence_leer on risk_conclusion_evidence for select to broker_app
  using (exists (select 1 from risk_conclusion c where c.id = conclusion_id));
create policy risk_conclusion_evidence_crear on risk_conclusion_evidence for insert to broker_app
  with check (exists (select 1 from risk_conclusion c where c.id = conclusion_id and c.created_by_user_id = (select authz.usuario())));
