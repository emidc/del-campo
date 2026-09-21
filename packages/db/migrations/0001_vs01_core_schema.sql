-- T-0012 — Schema del subconjunto de DOMAIN.md §63 para VS01, con las invariantes de
-- §67 (INV-001..INV-023, INV-PV-001..INV-PV-006) expresadas como constraints de
-- Postgres donde son expresables. → D-0045, D-0038, D-0036, D-0037, D-0034
--
-- Alcance: Party, PersonProfile, OrganizationProfile, PartyRole, ContactPoint,
-- OrganizationMembership, Insurer + InsurerAlias, Policy, Endorsement, PolicyVersion,
-- DocumentLink, ExternalReference, User mínimo. No hay importador ni datos: esta
-- migración solo crea estructura. → ## Non-scope de T-0012

create extension if not exists btree_gist;

-- ── Party ────────────────────────────────────────────────────────────────────
-- INV-001 (identidad estable): la identidad técnica es `id`, y nada de este schema
-- permite reasignarlo ni derivarlo de un rol.
-- INV-002/INV-003: una Party MERGED apunta a su canónica vía merged_into_party_id;
-- el trigger party_merge_cycle_guard impide ciclos y auto-merge.

create table party (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('PERSON', 'ORGANIZATION')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'MERGED')),
  merged_into_party_id uuid references party (id),
  display_name_cache text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint party_merged_status_requires_target
    check ((status = 'MERGED') = (merged_into_party_id is not null)),
  constraint party_cannot_merge_into_self
    check (merged_into_party_id is null or merged_into_party_id <> id)
);

comment on column party.merged_into_party_id is
  'DOMAIN.md §7-8, D-0004. NULL para una Party ACTIVE o canónica. La cadena se resuelve '
  'siguiendo esta columna; el trigger de INV-003 impide que la cadena cicle.';

-- INV-003 — No merge cycles. No es expresable como CHECK ni como FK (requiere seguir
-- la cadena transitiva completa en cada escritura). Mecanismo: trigger BEFORE
-- INSERT/UPDATE que recorre merged_into_party_id desde el nuevo valor y aborta si
-- vuelve a encontrar la propia fila o repite un nodo ya visitado. Costo: O(longitud de
-- la cadena de merges) por escritura de merged_into_party_id, que para VS01 es
-- aceptable — la cadena de merges de una identidad real no crece sin límite práctico.
-- Límite conocido: una cadena patológicamente larga (miles de merges apuntando en
-- fila) encarecería cada nuevo merge linealmente; no se espera ese volumen en VS01 y
-- no se optimiza por adelanto (R-01).
create function prevent_party_merge_cycle() returns trigger
language plpgsql as $$
declare
  cursor_id uuid;
  visited uuid[] := array[new.id];
begin
  if new.merged_into_party_id is null then
    return new;
  end if;

  cursor_id := new.merged_into_party_id;
  loop
    if cursor_id = any (visited) then
      raise exception
        'merge cycle detected: party % cannot merge into % without forming a cycle (INV-003)',
        new.id, new.merged_into_party_id;
    end if;
    visited := visited || cursor_id;

    select merged_into_party_id into cursor_id from party where id = cursor_id;
    if cursor_id is null then
      exit;
    end if;
  end loop;

  return new;
end;
$$;

create trigger party_merge_cycle_guard
  before insert or update of merged_into_party_id on party
  for each row
  execute function prevent_party_merge_cycle();

-- ── Helper reutilizado por PersonProfile, OrganizationProfile, Insurer y
-- OrganizationMembership: todas necesitan comprobar que un party_id referencia una
-- Party del `kind` esperado, y ninguna FK expresa esa condición sola. R-01: cuatro
-- usos justifican la función genérica en vez de cuatro triggers casi idénticos.
create function require_party_kind() returns trigger
language plpgsql as $$
declare
  column_name text := TG_ARGV[0];
  expected_kind text := TG_ARGV[1];
  referenced_party_id uuid;
  actual_kind text;
begin
  execute format('select ($1).%I', column_name) into referenced_party_id using new;
  select kind into actual_kind from party where id = referenced_party_id;

  if actual_kind is distinct from expected_kind then
    raise exception '%.% = % must reference a party with kind = %, found %',
      TG_TABLE_NAME, column_name, referenced_party_id, expected_kind,
      coalesce(actual_kind, 'NULL (no existe esa Party)');
  end if;

  return new;
end;
$$;

-- ── PersonProfile / OrganizationProfile ──────────────────────────────────────

create table person_profile (
  party_id uuid primary key references party (id),
  first_name text not null,
  last_name text not null,
  dni text,
  cuil text,
  birth_date date,
  created_at timestamptz not null default now()
);

create trigger person_profile_requires_person_party
  before insert or update of party_id on person_profile
  for each row
  execute function require_party_kind('party_id', 'PERSON');

create table organization_profile (
  party_id uuid primary key references party (id),
  legal_name text not null,
  trade_name text,
  cuit text,
  activity text,
  created_at timestamptz not null default now()
);

create trigger organization_profile_requires_organization_party
  before insert or update of party_id on organization_profile
  for each row
  execute function require_party_kind('party_id', 'ORGANIZATION');

-- ── PartyRole ────────────────────────────────────────────────────────────────
-- INV-006 — a lo sumo un PartyRole activo por (party, role). 'Activo' se define por
-- valid_to IS NULL (decisión explícita del owner para T-0012, análoga a PolicyVersion
-- vs. INV-PV-004): status queda como campo secundario, hoy con un único valor posible,
-- para cuando exista necesidad real de distinguir motivos de cierre. §13: "los roles
-- temporales utilizarán intervalos no solapados" — el mismo EXCLUDE que impide dos
-- roles activos también impide solapamiento entre intervalos históricos y el abierto.

create table party_role (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references party (id),
  role text not null check (role in ('PROSPECT')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE')),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  constraint party_role_valid_interval check (valid_to is null or valid_to > valid_from),
  exclude using gist (
    party_id with =,
    role with =,
    tstzrange(valid_from, coalesce(valid_to, 'infinity'::timestamptz)) with &&
  )
);

comment on constraint party_role_party_id_role_tstzrange_excl on party_role is
  'INV-006 (a lo sumo un rol activo por party+role) y §13 (intervalos no solapados). '
  'valid_to IS NULL se coalesce a infinity, así que dos filas abiertas para el mismo '
  '(party_id, role) siempre solapan y quedan cubiertas por el mismo EXCLUDE que cubre '
  'el solapamiento entre intervalos cerrados: no hay dos mecanismos, hay uno.';

-- ── ContactPoint ─────────────────────────────────────────────────────────────
-- DOMAIN.md §20: "Estado: PROVISIONAL... No se decide todavía una constraint física
-- global estricta" sobre unicidad de ContactPoint. Deliberadamente NO hay índice único
-- sobre (channel, normalized_value) ni sobre (party_id, channel): agregarlo resolvería
-- D-0035/§20 por la puerta de atrás, en una tarea que no lo tiene en su Outcome.

create table contact_point (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references party (id),
  channel text not null check (channel in ('EMAIL', 'PHONE', 'WHATSAPP')),
  value text not null,
  normalized_value text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  is_primary boolean not null default false,
  verified_at timestamptz,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  source text,
  created_at timestamptz not null default now(),
  constraint contact_point_valid_interval check (valid_to is null or valid_to > valid_from)
);

-- ── OrganizationMembership ───────────────────────────────────────────────────

create table organization_membership (
  id uuid primary key default gen_random_uuid(),
  organization_party_id uuid not null references party (id),
  person_party_id uuid not null references party (id),
  kind text,
  role_or_position text,
  is_primary boolean,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  constraint organization_membership_distinct_parties
    check (organization_party_id <> person_party_id),
  constraint organization_membership_valid_interval
    check (valid_to is null or valid_to > valid_from)
);

create trigger organization_membership_requires_organization
  before insert or update of organization_party_id on organization_membership
  for each row
  execute function require_party_kind('organization_party_id', 'ORGANIZATION');

create trigger organization_membership_requires_person
  before insert or update of person_party_id on organization_membership
  for each row
  execute function require_party_kind('person_party_id', 'PERSON');

-- ── Insurer / InsurerAlias ────────────────────────────────────────────────────
-- INV-015: las aseguradoras vienen de un catálogo curado. Este schema no puede
-- impedir por sí solo que un futuro importador cree Insurers libremente — eso es una
-- disciplina del importador (T-0013), no expresable como constraint sobre esta tabla
-- sola. Lo que el schema sí fija es que Insurer.organization_party_id sea siempre una
-- Party ORGANIZATION real.

create table insurer (
  id uuid primary key default gen_random_uuid(),
  organization_party_id uuid not null unique references party (id),
  canonical_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create trigger insurer_requires_organization_party
  before insert or update of organization_party_id on insurer
  for each row
  execute function require_party_kind('organization_party_id', 'ORGANIZATION');

create table insurer_alias (
  id uuid primary key default gen_random_uuid(),
  insurer_id uuid not null references insurer (id),
  alias text not null,
  source_system text,
  created_at timestamptz not null default now()
);

-- ── Policy ───────────────────────────────────────────────────────────────────
-- INV-020 / D-0038: (insurerId, policyNumber) único. insurer_id es NOT NULL porque
-- D-0038 excluye del dominio a las Policies del origen sin aseguradora: no reciben un
-- tratamiento distinto al de una colisión de par, así que no existen en Broker OS.

create table policy (
  id uuid primary key default gen_random_uuid(),
  insurer_id uuid not null references insurer (id),
  policy_number text not null,
  renewed_from_policy_id uuid references policy (id),
  created_at timestamptz not null default now(),
  constraint policy_insurer_number_unique unique (insurer_id, policy_number),
  constraint policy_cannot_renew_from_self check (renewed_from_policy_id is null or renewed_from_policy_id <> id)
);

-- ── Endorsement ──────────────────────────────────────────────────────────────
-- INV-021 / D-0037: policy_id NOT NULL + FK es el mecanismo completo. Un Endorsement
-- sin Policy padre no es una fila inválida que la base rechaza: es una fila que el
-- importador nunca intenta insertar (se descarta antes, D-0037). El schema garantiza
-- que si la fila existe, su Policy también existe en Broker OS.

create table endorsement (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references policy (id),
  number text,
  kind text not null,
  effective_from date,
  effective_to date,
  source_reference text not null,
  created_at timestamptz not null default now()
);

-- ── PolicyVersion ────────────────────────────────────────────────────────────
-- INV-PV-001: policy_id NOT NULL + FK.
-- INV-PV-002: version_number único dentro de policy_id (el orden lo da el propio
--   entero; no se infiere de effective_from porque dos versiones podrían compartir
--   fecha de alta en el origen sin que eso defina su orden contractual).
-- INV-PV-003 / INV-PV-004: EXCLUDE USING gist sobre (policy_id, daterange con
--   effective_to coalescido a infinity). Ver la nota extensa después de la tabla:
--   es un solo mecanismo real para ambas invariantes, no dos.
-- INV-023 / D-0036: holder_party_id NOT NULL.
-- coverageData: ver la nota de Q-12 después de la tabla.

create table policy_version (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references policy (id),
  version_number integer not null check (version_number > 0),
  effective_from date not null,
  effective_to date,
  holder_party_id uuid not null references party (id),
  product_reference text,
  term_start_date date not null,
  term_end_date date not null,
  renewal_mode text not null check (renewal_mode in ('AUTOMATIC', 'MANUAL')),
  premium numeric,
  currency text,
  coverage_data jsonb,
  coverage_source_batch_id text,
  coverage_source_record_id text,
  status text,
  endorsement_id uuid references endorsement (id),
  source_event_type text,
  source_event_id text,
  created_at timestamptz not null default now(),
  constraint policy_version_number_unique unique (policy_id, version_number),
  constraint policy_version_valid_interval check (effective_to is null or effective_to > effective_from),
  exclude using gist (
    policy_id with =,
    daterange(effective_from, coalesce(effective_to, 'infinity'::date)) with &&
  )
);

comment on constraint policy_version_policy_id_daterange_excl on policy_version is
  'INV-PV-003 (no overlap) y INV-PV-004 (a lo sumo una versión abierta). '
  'effective_to IS NULL se coalesce a infinity, de modo que dos versiones abiertas de '
  'la misma policy siempre "solapan" bajo este EXCLUDE, sin distinguirse de un '
  'solapamiento común. Es, en los hechos, UN solo mecanismo cubriendo ambas '
  'invariantes: D-0045 y el README de migrations describen "a lo sumo una versión '
  'abierta" como si necesitara un índice único parcial separado, y ese índice se '
  'consideró e implementó también más abajo por trazabilidad de intención — pero la '
  'prueba de causalidad de T-0012 mostró que, con este EXCLUDE presente, el índice '
  'parcial nunca es la causa real de un rechazo: el EXCLUDE ya lo cubre. Documentado '
  'en ops/evidence/T-0012.md y en el ADR de esta tarea en vez de dejarlo implícito.';

comment on column policy_version.coverage_data is
  'Bloque opaco de cobertura, formato físico decidido en T-0012 para no resolver '
  'D-0025 (que permanece OPEN). No se estructuran ni interpretan campos internos. '
  'NULL significa "todavía no se incorporó contenido de cobertura para esta versión" '
  '— dato ausente — y NUNCA se completa con un valor por defecto que implique una '
  'conclusión contractual sobre ausencia de cobertura: esas son cosas distintas y '
  'esta columna no colapsa esa distinción. coverage_source_batch_id/record_id son la '
  'trazabilidad mínima hacia el origen en staging que T-0013 deberá poblar (D-0033); '
  'no son FK porque el schema de staging no existe todavía en esta migración.';

-- A los efectos de la trazabilidad prevista por Q-12/D-0033, se conserva también el
-- índice único parcial que D-0045 y el README de migrations anticipan como mecanismo
-- de INV-PV-004, aunque la nota anterior documenta que es redundante mientras el
-- EXCLUDE exista. Se deja explícito y con su propio nombre para que una futura
-- eliminación del EXCLUDE (por ejemplo, si se relaja INV-PV-003) no elimine en
-- silencio la protección de INV-PV-004.
create unique index policy_version_one_open_per_policy
  on policy_version (policy_id)
  where effective_to is null;

-- ── DocumentLink ─────────────────────────────────────────────────────────────
-- resource_type/resource_id es polimórfico por diseño (§47), pero VS01 solo necesita
-- vincular Policy (§65: Party → Policies → PolicyVersion → Drive Documents). El CHECK
-- restringe resource_type a lo que este subconjunto usa; ampliarlo es una migración
-- nueva cuando exista un segundo caso real (R-01), no una FK genérica hoy.

create table document_link (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('POLICY')),
  resource_id uuid not null,
  drive_file_id text not null,
  drive_url text,
  drive_item_type text not null check (drive_item_type in ('FILE', 'FOLDER')),
  document_kind text,
  reconciliation_status text not null check (
    reconciliation_status in ('NOT_REFERENCED', 'SYNCED', 'MISSING', 'MOVED', 'PERMISSION_ERROR', 'UNKNOWN')
  ),
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create function require_document_link_resource() returns trigger
language plpgsql as $$
begin
  if new.resource_type = 'POLICY' and not exists (select 1 from policy where id = new.resource_id) then
    raise exception 'document_link.resource_id % does not reference an existing policy', new.resource_id;
  end if;
  return new;
end;
$$;

create trigger document_link_resource_exists
  before insert or update of resource_type, resource_id on document_link
  for each row
  execute function require_document_link_resource();

-- ── ExternalReference ────────────────────────────────────────────────────────
-- INV-022: resolver una referencia nunca borra ni sobrescribe el valor de origen. No
-- es un CHECK sobre una sola fila (ambos estados, resuelto y no resuelto, son formas
-- válidas): es una restricción sobre qué puede cambiar en un UPDATE. Mecanismo:
-- trigger que congela source_system/source_entity_type/source_external_id/
-- source_value una vez insertados.

create table external_reference (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_entity_type text not null,
  source_external_id text,
  source_value text,
  relation_type text not null,
  resolution_status text not null check (resolution_status in ('UNRESOLVED', 'RESOLVED')),
  unresolved_reason text,
  resolved_target_type text,
  resolved_target_id uuid,
  created_at timestamptz not null default now(),
  constraint external_reference_resolved_target_consistency check (
    (resolution_status = 'RESOLVED') = (resolved_target_type is not null and resolved_target_id is not null)
  )
);

create function external_reference_source_is_immutable() returns trigger
language plpgsql as $$
begin
  if new.source_system is distinct from old.source_system
    or new.source_entity_type is distinct from old.source_entity_type
    or new.source_external_id is distinct from old.source_external_id
    or new.source_value is distinct from old.source_value
  then
    raise exception
      'external_reference: source_system/source_entity_type/source_external_id/source_value son inmutables (INV-022)';
  end if;
  return new;
end;
$$;

create trigger external_reference_immutable_source
  before update on external_reference
  for each row
  execute function external_reference_source_is_immutable();

-- ── User mínimo ──────────────────────────────────────────────────────────────
-- Tabla `app_user`, no `user`: palabra reservada de Postgres. §53 no exige más que
-- esto para VS01; el mecanismo de sesión lo decide T-0018 con su propio ADR (R-05).

create table app_user (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  party_id uuid references party (id),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  auth_provider text not null,
  created_at timestamptz not null default now()
);
