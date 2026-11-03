-- T-0035, incremento 2 — identidad común (D-0077) y autorización híbrida (D-0022) en la
-- base de Broker OS. Sólo aditiva para quien se conecta hoy.
--
-- Por qué no cambia el comportamiento actual:
--   * La app, las migraciones y el importador se conectan como el dueño de las tablas.
--     `enable row level security` sin `force` no aplica RLS al dueño (ni a un rol con
--     BYPASSRLS): sigue viendo y escribiendo todo, igual que antes. La prueba
--     `autorizacion.integration.test.ts` lo demuestra con un dueño sin BYPASSRLS.
--   * Los roles nuevos (`broker_app`, `broker_worker`, `broker_mcp`) son NOLOGIN: nadie
--     se conecta con ellos hasta la fase 2 del plan de migración, con aprobación del owner.
--   * `app_user` gana una columna nula y un valor de estado más; ninguna fila existente
--     deja de cumplir sus restricciones.
--   * En Supabase, los roles `anon` y `authenticated` del Data API pierden acceso a las
--     tablas al habilitar RLS sin políticas para ellos. La app no usa el Data API.
--
-- Qué agrega:
--   * Identidad: rol y estado INVITED en `app_user`; `user_credential` (proveedor,
--     sujeto); `user_invitation`.
--   * Alcance: `client_assignment`, una fila por persona y cliente con vigencia
--     `[desde, hasta)` y sin solapamientos (D-0027, ADR-0078). No hay acceso universal.
--   * Auditoría: `audit_event`, estructurada y mínima, sólo inserción, sin payloads.
--   * `authz.*`: las funciones de predicado, SECURITY DEFINER con search_path vacío,
--     EXECUTE sólo para los roles que las usan (D-0022, condición 4).
--   * RLS habilitado en toda tabla de `public`, con políticas sólo para los roles nuevos.

create extension if not exists btree_gist;

-- ── Roles de conexión (D-0022: sin BYPASSRLS, mínimo privilegio) ─────────────

do $$
declare
  nombre text;
begin
  foreach nombre in array array['broker_app', 'broker_worker', 'broker_mcp'] loop
    if not exists (select 1 from pg_roles where rolname = nombre) then
      execute format('create role %I nologin nobypassrls nosuperuser nocreatedb nocreaterole noinherit', nombre);
    end if;
  end loop;
end
$$;

-- La conexión de la app (hoy, la del dueño de las tablas) asume uno de estos roles por
-- transacción con `set local role`. Sin esta membresía, un dueño que no es superusuario
-- (el `postgres` de Supabase) no podría hacerlo. Con INHERIT FALSE no gana ningún
-- privilegio de esos roles: sólo puede asumirlos, y al asumirlos queda sujeto a RLS.
grant broker_app, broker_worker, broker_mcp to current_user with inherit false, set true;

-- ── Identidad ────────────────────────────────────────────────────────────────

alter table app_user
  add column role text check (role in ('ADMINISTRADOR', 'OPERADOR', 'REVISOR'));

alter table app_user drop constraint app_user_status_check;
alter table app_user
  add constraint app_user_status_check check (status in ('INVITED', 'ACTIVE', 'INACTIVE'));

comment on column app_user.role is
  'D-0072: Administrador, Operador Del Campo o Revisor profesional. Null hasta que un Administrador lo asigne: sin rol no hay acceso.';
comment on column app_user.status is
  'INVITED hasta el primer login; ACTIVE; INACTIVE es la baja, que corta el acceso en el request siguiente (D-0022).';

create table user_credential (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app_user (id),
  provider    text not null check (provider in ('google')),
  subject     text not null check (subject <> ''),
  created_at  timestamptz not null default now(),
  unique (provider, subject)
);
create index user_credential_por_usuario on user_credential (user_id);
comment on table user_credential is
  'D-0077: el par (proveedor, sujeto) que identifica a la persona entre contextos. Otro método de entrada es otro proveedor.';

create table user_invitation (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references app_user (id),
  email        text not null check (email = lower(trim(email)) and email like '%@%'),
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_by   uuid references app_user (id),
  created_at   timestamptz not null default now(),
  check (consumed_at is null or consumed_at >= created_at)
);
create unique index user_invitation_una_vigente_por_email on user_invitation (email) where consumed_at is null;
comment on table user_invitation is
  'D-0072: sólo se entra por invitación. El primer login con este email verificado crea la credencial y consume la invitación.';

-- ── Alcance por cliente (D-0027, ADR-0078) ───────────────────────────────────

create table client_assignment (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references app_user (id),
  client_party_id  uuid not null references party (id),
  valid            tstzrange not null default tstzrange(now(), null, '[)'),
  assigned_by      uuid references app_user (id),
  created_at       timestamptz not null default now(),
  check (not isempty(valid) and lower_inc(valid) and not upper_inc(valid) and lower(valid) is not null),
  exclude using gist (user_id with =, client_party_id with =, valid with &&)
);
create index client_assignment_por_cliente on client_assignment (client_party_id);
comment on table client_assignment is
  'D-0027: qué clientes (empresa o persona) ve cada persona y desde cuándo, con historia. Una fila por cliente; no hay acceso universal.';

-- ── Auditoría estructurada y mínima ──────────────────────────────────────────

create table audit_event (
  id             bigint generated always as identity primary key,
  occurred_at    timestamptz not null default now(),
  actor_user_id  uuid references app_user (id),
  origin         text not null check (origin in ('app', 'worker', 'mcp', 'cli')),
  action         text not null check (action ~ '^[a-z][a-z0-9_.]{2,63}$'),
  object_type    text check (object_type ~ '^[a-z][a-z0-9_]{1,40}$'),
  object_id      text check (length(object_id) <= 64),
  outcome        text not null check (outcome in ('ok', 'denied', 'error')),
  reason_code    text check (reason_code ~ '^[A-Z][A-Z0-9_]{1,40}$')
);
create index audit_event_por_objeto on audit_event (object_type, object_id, occurred_at);
comment on table audit_event is
  'T-0035: quién hizo qué sobre qué y con qué resultado. Sin payloads ni texto libre: los campos sólo admiten identificadores.';

create function audit_event_solo_insercion() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception 'audit_event es sólo de inserción' using errcode = 'restrict_violation';
end
$$;
create trigger audit_event_solo_insercion before update or delete on audit_event
  for each row execute function audit_event_solo_insercion();
create trigger audit_event_solo_insercion_truncate before truncate on audit_event
  for each statement execute function audit_event_solo_insercion();

-- ── Funciones de predicado (D-0022) ──────────────────────────────────────────
-- Únicas fuentes de los predicados: las usan las políticas y la app. SECURITY DEFINER
-- para leer las tablas de identidad sin depender del RLS de quien llama; search_path
-- vacío y nombres calificados para que nadie las desvíe con un objeto homónimo.

create schema authz;

-- El principal lo fija la app local a la transacción: set_config('authz.usuario_id', x, true).
create function authz.usuario_declarado() returns uuid
language sql stable security definer set search_path = '' as $$
  select nullif(pg_catalog.current_setting('authz.usuario_id', true), '')::uuid
$$;

-- El principal sólo vale si la persona sigue ACTIVE y tiene rol: la baja corta el acceso
-- en el request siguiente, aunque la sesión siga viva (D-0022, condición 6).
create function authz.usuario() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from public.app_user u
  where u.id = authz.usuario_declarado() and u.status = 'ACTIVE' and u.role is not null
$$;

create function authz.rol() returns text
language sql stable security definer set search_path = '' as $$
  select u.role from public.app_user u where u.id = authz.usuario()
$$;

create function authz.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(authz.rol() = 'ADMINISTRADOR', false)
$$;

-- Los clientes que la persona ve ahora: los asignados vigentes y, si un cliente asignado
-- es una empresa, las personas que son sus miembros vigentes. El Revisor profesional no
-- ve clientes por defecto (decisión del owner, D-0022).
create function authz.clientes_visibles() returns uuid[]
language sql stable security definer set search_path = '' as $$
  with asignados as (
    select a.client_party_id as party_id
    from public.client_assignment a
    where authz.rol() = 'OPERADOR'
      and a.user_id = authz.usuario()
      and a.valid @> pg_catalog.now()
  ), miembros as (
    select m.person_party_id as party_id
    from public.organization_membership m
    join asignados s on s.party_id = m.organization_party_id
    where m.valid_from <= pg_catalog.now()
      and (m.valid_to is null or m.valid_to > pg_catalog.now())
  )
  select coalesce(pg_catalog.array_agg(distinct party_id), '{}') from (
    select party_id from asignados union select party_id from miembros
  ) visibles
$$;

create function authz.ve_cliente(party uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select authz.es_admin() or party = any(authz.clientes_visibles())
$$;

-- Una póliza se ve si alguna de sus versiones tiene como tomador a un cliente visible.
create function authz.ve_poliza(poliza uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select authz.es_admin() or exists (
    select 1 from public.policy_version v
    where v.policy_id = poliza and v.holder_party_id = any(authz.clientes_visibles())
  )
$$;

revoke all on schema authz from public;
revoke all on all functions in schema authz from public;
grant usage on schema authz to broker_app, broker_mcp;
grant execute on all functions in schema authz to broker_app, broker_mcp;

-- ── RLS en toda tabla de public ──────────────────────────────────────────────
-- Sin `force`: el dueño sigue exento (ver cabecera). Una tabla sin política para un rol
-- queda vacía para ese rol (deny-by-default). La prueba de cobertura exige que toda
-- tabla de public tenga RLS habilitado.

do $$
declare
  tabla text;
begin
  for tabla in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', tabla);
  end loop;
end
$$;

-- Lectura para la app y para el MCP, que actúa en nombre de una persona y sólo lee
-- (D-0075). El worker no tiene grants todavía: ningún proceso de Broker OS lo usa.
grant select on party, person_profile, organization_profile, party_role, contact_point,
  organization_membership, insurer, insurer_alias, policy, endorsement, policy_version,
  document_link, policy_document_reference, app_user, client_assignment
  to broker_app, broker_mcp;
grant select on user_credential, user_invitation, audit_event to broker_app;
grant insert on audit_event to broker_app;

create policy party_leer on party for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or id = any((select authz.clientes_visibles())::uuid[]));
create policy person_profile_leer on person_profile for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or party_id = any((select authz.clientes_visibles())::uuid[]));
create policy organization_profile_leer on organization_profile for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or party_id = any((select authz.clientes_visibles())::uuid[]));
create policy party_role_leer on party_role for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or party_id = any((select authz.clientes_visibles())::uuid[]));
create policy contact_point_leer on contact_point for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or party_id = any((select authz.clientes_visibles())::uuid[]));
create policy organization_membership_leer on organization_membership for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or organization_party_id = any((select authz.clientes_visibles())::uuid[]));

-- Datos de referencia: cualquier persona activa con rol.
create policy insurer_leer on insurer for select to broker_app, broker_mcp
  using ((select authz.usuario()) is not null);
create policy insurer_alias_leer on insurer_alias for select to broker_app, broker_mcp
  using ((select authz.usuario()) is not null);

create policy policy_leer on policy for select to broker_app, broker_mcp
  using (authz.ve_poliza(id));
create policy policy_version_leer on policy_version for select to broker_app, broker_mcp
  using (authz.ve_poliza(policy_id));
create policy endorsement_leer on endorsement for select to broker_app, broker_mcp
  using (authz.ve_poliza(policy_id));
create policy policy_document_reference_leer on policy_document_reference for select to broker_app, broker_mcp
  using (authz.ve_poliza(policy_id));
create policy document_link_leer on document_link for select to broker_app, broker_mcp
  using (case resource_type
           when 'POLICY' then authz.ve_poliza(resource_id)
           when 'PARTY' then authz.ve_cliente(resource_id)
           else false
         end);

-- Identidad: cada persona ve lo suyo; un Administrador ve todo.
create policy app_user_leer on app_user for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or id = (select authz.usuario()));
create policy user_credential_leer on user_credential for select to broker_app
  using ((select authz.es_admin()) or user_id = (select authz.usuario()));
create policy user_invitation_leer on user_invitation for select to broker_app
  using ((select authz.es_admin()));
create policy client_assignment_leer on client_assignment for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or user_id = (select authz.usuario()));

-- Auditoría: la escribe la app a nombre de quien actúa; la lee un Administrador.
create policy audit_event_escribir on audit_event for insert to broker_app
  with check (origin = 'app' and actor_user_id is not distinct from (select authz.usuario()));
create policy audit_event_leer on audit_event for select to broker_app
  using ((select authz.es_admin()));
