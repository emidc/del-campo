-- Spike T-0002 — schema sintético para comparar dónde se hace cumplir la autorización.
-- DESCARTABLE: no es el schema del producto ni decide D-0027. Sólo fija la semántica
-- mínima de la matriz (matriz.ts) para que RLS, capa de aplicación e híbrido se puedan
-- comparar sobre los mismos datos. Base: delcampo_spike_t0002, local, datos sintéticos.
--
-- Dos esquemas simulan dos contextos con base propia (D-0063, D-0071): `broker` y `risk`.
-- No se leen entre sí: `risk.evaluacion.empresa_ref` es una referencia opaca.
--
-- Roles (todos con prefijo spike_t0002_ porque los roles son del clúster):
--   _owner   dueño de las tablas; aplica este archivo. Equivale al rol de migraciones.
--   _app     la app (Broker OS). SIN bypassrls: RLS se aplica. Mecanismos RLS e híbrido.
--   _plain   la app con BYPASSRLS. Mecanismo "sólo capa de aplicación".
--   _worker  un proceso programado. Sin bypassrls; sólo lo que su trabajo necesita.
--   _mcp     el servidor MCP de lectura (D-0075). Sin bypassrls; sólo SELECT.
--   _service el equivalente del service_role de Supabase: BYPASSRLS.
--   _riskapp la app de Risk OS, sobre el esquema risk.

create extension if not exists btree_gist;

drop schema if exists broker cascade;
drop schema if exists risk cascade;
drop schema if exists authz cascade;
create schema authz;
create schema broker;
create schema risk;

-- ── Identidad del request ──────────────────────────────────────────────────────────
-- El principal llega como GUC local a la transacción (set_config(..., true)). Si no hay
-- GUC propio, se acepta el `sub` de request.jwt.claims, que es como PostgREST y Supabase
-- exponen el token: es la ÚNICA pieza con forma de Supabase y vive en una función.

create table authz.reloj (
  -- Reloj de prueba. Sólo el owner lo habilita; con false, authz.instante() es now()
  -- aunque alguien ponga el GUC. Sin esta tabla, cualquier rol podría viajar en el tiempo.
  habilitado boolean not null,
  unica boolean primary key default true check (unica)
);
insert into authz.reloj (habilitado) values (false);

create function authz.instante() returns timestamptz
language sql stable security definer set search_path = pg_catalog, authz as $$
  select case
    when (select habilitado from authz.reloj)
      and coalesce(current_setting('authz.reloj_prueba', true), '') <> ''
    then current_setting('authz.reloj_prueba', true)::timestamptz
    else now()
  end
$$;

create function authz.usuario_declarado() returns uuid
language sql stable set search_path = pg_catalog as $$
  select coalesce(
    nullif(current_setting('authz.usuario_id', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub'
  )::uuid
$$;

-- ── broker ──────────────────────────────────────────────────────────────────────────

create table broker.usuario (
  id uuid primary key,
  nombre text not null,
  tipo text not null check (tipo in ('INTERNO', 'CONTACTO')),
  -- Roles de D-0072. Un contacto de empresa no tiene rol interno.
  rol text check (rol in ('ADMINISTRADOR', 'OPERADOR', 'REVISOR')),
  -- La baja es inmediata: cada request la mira (D-0072).
  estado text not null default 'ACTIVO' check (estado in ('ACTIVO', 'BAJA')),
  check ((tipo = 'INTERNO') = (rol is not null))
);

create table broker.empresa (
  id uuid primary key,
  nombre text not null
);

-- Asignación de empresas a personas internas, con historia (semántica de D-0027, no su
-- estructura). Intervalo semiabierto [desde, hasta). Varias personas por empresa.
create table broker.asignacion (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references broker.usuario,
  empresa_id uuid not null references broker.empresa,
  desde timestamptz not null,
  hasta timestamptz,
  check (hasta is null or hasta > desde),
  exclude using gist (usuario_id with =, empresa_id with =,
    tstzrange(desde, coalesce(hasta, 'infinity')) with &&)
);

-- Acceso de un contacto de empresa al portal (semántica de PortalGrant). [desde, hasta).
create table broker.acceso_portal (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references broker.usuario,
  empresa_id uuid not null references broker.empresa,
  desde timestamptz not null,
  hasta timestamptz,
  otorgado_por uuid not null references broker.usuario,
  check (hasta is null or hasta > desde),
  exclude using gist (usuario_id with =, tstzrange(desde, coalesce(hasta, 'infinity')) with &&)
);

create table broker.poliza (
  id uuid primary key,
  empresa_id uuid not null references broker.empresa,
  numero text not null,
  vence date not null
);

create table broker.nota_interna (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references broker.empresa,
  autor_id uuid not null references broker.usuario,
  texto text not null
);

-- Informe a la empresa: BORRADOR → APROBADO (por otra persona) → COMPARTIDO.
create table broker.informe (
  id uuid primary key,
  empresa_id uuid not null references broker.empresa,
  autor_id uuid not null references broker.usuario,
  estado text not null check (estado in ('BORRADOR', 'APROBADO', 'COMPARTIDO')),
  aprobado_por uuid references broker.usuario,
  titulo text not null
);

-- ── risk ────────────────────────────────────────────────────────────────────────────
-- Otro contexto: su propia tabla de usuarios admitidos y de asignaciones. La identidad
-- (el id) es la misma; la admisión y el alcance los decide Risk OS (D-0071, D-0072).

create table risk.usuario (
  id uuid primary key,
  rol text not null check (rol in ('ADMINISTRADOR', 'OPERADOR', 'REVISOR')),
  estado text not null default 'ACTIVO' check (estado in ('ACTIVO', 'BAJA'))
);

create table risk.asignacion (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references risk.usuario,
  empresa_ref uuid not null,
  desde timestamptz not null,
  hasta timestamptz,
  check (hasta is null or hasta > desde)
);

create table risk.evaluacion (
  id uuid primary key,
  empresa_ref uuid not null,
  autor_id uuid not null references risk.usuario,
  estado text not null check (estado in ('PENDIENTE', 'ACEPTADA')),
  aceptada_por uuid references risk.usuario,
  riesgo text not null
);

-- ── Predicados ──────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER: leen tablas de permisos que el rol de la app no puede leer, y evitan
-- que una política consulte otra tabla con RLS (recursión, costo). search_path fijo.

create function authz.usuario() returns uuid
language sql stable security definer set search_path = pg_catalog as $$
  -- El principal sólo existe si está declarado Y sigue activo: revocación inmediata.
  select u.id from broker.usuario u
  where u.id = authz.usuario_declarado() and u.estado = 'ACTIVO'
$$;

create function authz.rol() returns text
language sql stable security definer set search_path = pg_catalog as $$
  select u.rol from broker.usuario u where u.id = authz.usuario()
$$;

create function authz.empresas_asignadas() returns setof uuid
language sql stable security definer set search_path = pg_catalog as $$
  select a.empresa_id from broker.asignacion a
  where a.usuario_id = authz.usuario()
    and authz.rol() in ('OPERADOR', 'REVISOR')
    and tstzrange(a.desde, coalesce(a.hasta, 'infinity')) @> authz.instante()
$$;

create function authz.empresa_portal() returns uuid
language sql stable security definer set search_path = pg_catalog as $$
  select p.empresa_id from broker.acceso_portal p
  join broker.usuario u on u.id = p.usuario_id and u.tipo = 'CONTACTO'
  where p.usuario_id = authz.usuario()
    and tstzrange(p.desde, coalesce(p.hasta, 'infinity')) @> authz.instante()
$$;

create function authz.es_admin() returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select coalesce(authz.rol() = 'ADMINISTRADOR', false)
$$;

-- Risk OS resuelve el principal contra SU tabla de usuarios, no contra broker.
create function authz.risk_usuario() returns uuid
language sql stable security definer set search_path = pg_catalog as $$
  select u.id from risk.usuario u
  where u.id = authz.usuario_declarado() and u.estado = 'ACTIVO'
$$;

create function authz.risk_empresas() returns setof uuid
language sql stable security definer set search_path = pg_catalog as $$
  select a.empresa_ref from risk.asignacion a
  where a.usuario_id = authz.risk_usuario()
    and tstzrange(a.desde, coalesce(a.hasta, 'infinity')) @> authz.instante()
$$;

create function authz.risk_es_admin() returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select exists (select 1 from risk.usuario u where u.id = authz.risk_usuario() and u.rol = 'ADMINISTRADOR')
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────────────
-- ENABLE en todas las tablas (sin FORCE: el owner es el rol de migraciones y no consulta
-- datos de la app; con FORCE, las funciones SECURITY DEFINER tampoco leerían las tablas
-- de permisos). Sin política que aplique, cero filas.
-- Las políticas valen sólo para los roles nombrados en `to`: cualquier otro rol sin
-- bypassrls ve cero filas (deny-by-default por perfil de conexión).

alter table broker.usuario enable row level security;
alter table broker.empresa enable row level security;
alter table broker.asignacion enable row level security;
alter table broker.acceso_portal enable row level security;
alter table broker.poliza enable row level security;
alter table broker.nota_interna enable row level security;
alter table broker.informe enable row level security;
alter table risk.usuario enable row level security;
alter table risk.asignacion enable row level security;
alter table risk.evaluacion enable row level security;

-- Empresa: el admin todas; operador y revisor las asignadas; el contacto, la suya.
create policy empresa_leer on broker.empresa for select to spike_t0002_app, spike_t0002_mcp
  using ((select authz.es_admin())
      or id in (select authz.empresas_asignadas())
      or id = (select authz.empresa_portal()));

-- Póliza: admin y operador asignado; ni el revisor ni el contacto (matriz, casos P-*).
create policy poliza_leer on broker.poliza for select to spike_t0002_app, spike_t0002_mcp
  using ((select authz.es_admin())
      or ((select authz.rol()) = 'OPERADOR' and empresa_id in (select authz.empresas_asignadas())));

-- El worker de vencimientos lee todas las pólizas, pero sólo eso (ver grants).
create policy poliza_worker on broker.poliza for select to spike_t0002_worker using (true);

-- Nota interna: sólo el equipo con la empresa asignada (y el admin). Nunca el portal.
create policy nota_leer on broker.nota_interna for select to spike_t0002_app, spike_t0002_mcp
  using ((select authz.es_admin())
      or ((select authz.rol()) = 'OPERADOR' and empresa_id in (select authz.empresas_asignadas())));
create policy nota_escribir on broker.nota_interna for insert to spike_t0002_app
  with check (autor_id = (select authz.usuario())
      and ((select authz.es_admin())
        or ((select authz.rol()) = 'OPERADOR' and empresa_id in (select authz.empresas_asignadas()))));

-- Informe: el equipo asignado ve todos los estados; el contacto, sólo COMPARTIDO.
create policy informe_leer on broker.informe for select to spike_t0002_app, spike_t0002_mcp
  using ((select authz.es_admin())
      or ((select authz.rol()) = 'OPERADOR' and empresa_id in (select authz.empresas_asignadas()))
      or (estado = 'COMPARTIDO' and empresa_id = (select authz.empresa_portal())));
-- Aprobar: un operador asignado o el admin, que no sea el autor. El autor no se puede
-- cambiar porque el grant de UPDATE es sólo sobre (estado, aprobado_por).
create policy informe_aprobar on broker.informe for update to spike_t0002_app
  using (estado = 'BORRADOR'
      and ((select authz.es_admin())
        or ((select authz.rol()) = 'OPERADOR' and empresa_id in (select authz.empresas_asignadas()))))
  with check (estado = 'APROBADO'
      and aprobado_por = (select authz.usuario())
      and aprobado_por <> autor_id);

-- Las tablas de permisos no tienen política: la app no las lee directo; las leen las
-- funciones SECURITY DEFINER. (Una pantalla de administración tendría su política.)

-- Risk: el revisor y el operador ven las evaluaciones de sus empresas en Risk OS.
create policy evaluacion_leer on risk.evaluacion for select to spike_t0002_riskapp
  using ((select authz.risk_es_admin()) or empresa_ref in (select authz.risk_empresas()));
create policy evaluacion_aceptar on risk.evaluacion for update to spike_t0002_riskapp
  using (estado = 'PENDIENTE'
      and ((select authz.risk_es_admin()) or empresa_ref in (select authz.risk_empresas())))
  with check (estado = 'ACEPTADA'
      and aceptada_por = (select authz.risk_usuario())
      and aceptada_por <> autor_id);

-- ── Grants: mínimo privilegio por perfil ───────────────────────────────────────────

revoke all on schema broker, risk, authz from public;
revoke all on all functions in schema authz from public;

grant usage on schema broker, authz to spike_t0002_app, spike_t0002_plain, spike_t0002_mcp, spike_t0002_worker;
grant usage on schema risk, authz to spike_t0002_riskapp;
grant execute on all functions in schema authz to spike_t0002_app, spike_t0002_plain, spike_t0002_mcp, spike_t0002_worker, spike_t0002_riskapp;

-- App (RLS): lee datos, escribe notas, aprueba informes. No lee tablas de permisos.
grant select on broker.empresa, broker.poliza, broker.nota_interna, broker.informe to spike_t0002_app;
grant insert (empresa_id, autor_id, texto) on broker.nota_interna to spike_t0002_app;
grant update (estado, aprobado_por) on broker.informe to spike_t0002_app;

-- App sin RLS (mecanismo "sólo aplicación"): lee también las tablas de permisos, porque
-- es la app la que evalúa los predicados.
grant select on all tables in schema broker to spike_t0002_plain;
grant insert (empresa_id, autor_id, texto) on broker.nota_interna to spike_t0002_plain;
grant update (estado, aprobado_por) on broker.informe to spike_t0002_plain;

-- Worker de vencimientos: sólo pólizas.
grant select on broker.poliza to spike_t0002_worker;

-- MCP de lectura: sólo SELECT, sólo datos; actúa en nombre de una persona.
grant select on broker.empresa, broker.poliza, broker.nota_interna, broker.informe to spike_t0002_mcp;

-- Risk app.
grant select on risk.evaluacion to spike_t0002_riskapp;
grant update (estado, aceptada_por) on risk.evaluacion to spike_t0002_riskapp;

-- Service role: todo, con bypassrls (como el service_role de Supabase).
grant usage on schema broker, risk, authz to spike_t0002_service;
grant all on all tables in schema broker, risk to spike_t0002_service;
