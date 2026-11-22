-- Listas de riesgos de cada empresa (T-0061): Riesgos, Acciones, Transferencia y Fuentes,
-- como en la planilla de inspección de Antucura del 17/11/2026.
--
--   * `risk_item`: un ítem de una lista, con su código (R1, A01, T01, Z3). El código no cambia.
--   * `risk_item_version`: lo que dice el ítem. Sólo de alta: editar o dar de baja agrega una
--     versión, y la vigente es la última (`risk_item_current`). Así queda quién cambió qué y
--     cuándo. Las columnas de cada lista viven en el código (`packages/db/src/listas-de-riesgos.ts`)
--     y se guardan en `fields`, para poder cambiarlas sin migrar.
--   * `risk_item_comment`: comentarios del equipo sobre un ítem.
--
-- Cada fila guarda quién la escribió y, si fue un agente, cuál. Se ve y se escribe si se ve a
-- la empresa. Es de uso interno: el portal no la lee.

create table risk_item (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references party (id),
  list text not null check (list in ('RIESGO', 'ACCION', 'TRANSFERENCIA', 'FUENTE')),
  code text not null check (code ~ '^[A-Z][A-Z0-9]{0,9}$'),
  created_by_user_id uuid not null references app_user (id),
  agent text check (agent ~ '^[a-z][a-z0-9-]{1,40}@[0-9][0-9.]{0,15}$'),
  created_at timestamptz not null default clock_timestamp(),
  constraint risk_item_codigo_unico unique (party_id, list, code)
);

create table risk_item_version (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references risk_item (id),
  fields jsonb not null check (jsonb_typeof(fields) = 'object' and length(fields::text) <= 40000),
  retired boolean not null default false,
  created_by_user_id uuid not null references app_user (id),
  agent text check (agent ~ '^[a-z][a-z0-9-]{1,40}@[0-9][0-9.]{0,15}$'),
  created_at timestamptz not null default clock_timestamp()
);

create index risk_item_version_item_idx on risk_item_version (item_id, created_at desc);

create table risk_item_comment (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references risk_item (id),
  body text not null check (btrim(body) <> '' and length(body) <= 4000),
  created_by_user_id uuid not null references app_user (id),
  agent text check (agent ~ '^[a-z][a-z0-9-]{1,40}@[0-9][0-9.]{0,15}$'),
  created_at timestamptz not null default clock_timestamp()
);

create index risk_item_comment_item_idx on risk_item_comment (item_id, created_at);

-- Lo vigente de cada ítem: su última versión.
create view risk_item_current with (security_invoker = true) as
  select i.id, i.party_id, i.list, i.code, i.created_by_user_id, i.created_at,
         v.id as version_id, v.fields, v.retired, v.created_by_user_id as updated_by_user_id,
         v.agent as updated_by_agent, v.created_at as updated_at
  from risk_item i
  join lateral (
    select * from risk_item_version v where v.item_id = i.id order by v.created_at desc, v.id desc limit 1
  ) v on true;

alter table risk_item enable row level security;
alter table risk_item_version enable row level security;
alter table risk_item_comment enable row level security;

grant select, insert on risk_item, risk_item_version, risk_item_comment to broker_app;
grant select on risk_item_current to broker_app;

create policy risk_item_leer on risk_item for select to broker_app
  using ((select authz.es_admin()) and authz.ve_cliente(party_id));
create policy risk_item_crear on risk_item for insert to broker_app
  with check ((select authz.es_admin()) and authz.ve_cliente(party_id) and created_by_user_id = (select authz.usuario()));

create policy risk_item_version_leer on risk_item_version for select to broker_app
  using (exists (select 1 from risk_item i where i.id = item_id));
create policy risk_item_version_crear on risk_item_version for insert to broker_app
  with check (exists (select 1 from risk_item i where i.id = item_id) and created_by_user_id = (select authz.usuario()));

create policy risk_item_comment_leer on risk_item_comment for select to broker_app
  using (exists (select 1 from risk_item i where i.id = item_id));
create policy risk_item_comment_crear on risk_item_comment for insert to broker_app
  with check (exists (select 1 from risk_item i where i.id = item_id) and created_by_user_id = (select authz.usuario()));
