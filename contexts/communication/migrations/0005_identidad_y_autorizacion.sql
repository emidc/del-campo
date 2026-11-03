-- T-0035, incremento 4 — identidad común (D-0077) y autorización híbrida (D-0022) en la
-- base de Communication OS. Sólo aditiva para quien se conecta hoy.
--
-- Por qué no cambia el comportamiento actual:
--   * La app, el webhook, las tareas programadas y las migraciones se conectan como el
--     dueño de las tablas. `enable row level security` sin `force` no aplica RLS al
--     dueño: sigue viendo y escribiendo todo, igual que antes.
--   * `communication_app` es NOLOGIN. La conexión de la app sólo puede asumirlo con
--     `set local role`, y lo hace únicamente con AUTH_MODE=oidc (fase 3 del plan de
--     migración, con aprobación del owner). Con INHERIT FALSE no gana ningún privilegio.
--   * `outbound_attempt` gana una columna nula; ninguna fila deja de cumplir sus reglas.
--
-- Qué agrega, todo dentro del esquema `communication` (D-0063: el contexto no escribe en
-- otro esquema):
--   * Identidad: `app_user` con rol y estado, `user_credential` (proveedor, sujeto) y
--     `user_invitation`. Hoy no hay personas en Communication OS: la credencial es
--     compartida (D-0066). Estas tablas empiezan vacías.
--   * Autoría: `outbound_attempt.created_by`, quién inició cada envío desde la UI.
--   * Auditoría: `audit_event`, estructurada y mínima, sólo inserción, sin payloads.
--   * `authz_*`: las funciones de predicado, SECURITY DEFINER con search_path vacío y
--     EXECUTE sólo para `communication_app` (D-0022, condición 4).
--   * RLS habilitado en toda tabla del esquema, con políticas sólo para `communication_app`.
--
-- Permisos por rol (matriz de `permisos.js` del prototipo v25, sección Comunicación):
-- la ven el Administrador y el Operador Del Campo; responde el Operador; el Revisor
-- profesional no la ve. Communication OS no tiene clientes ni empresas: no hay alcance
-- por empresa que aplicar, y no se lee nada de Broker OS.

-- ── Rol de conexión (D-0022: sin BYPASSRLS, mínimo privilegio) ───────────────

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'communication_app') then
    create role communication_app nologin nobypassrls nosuperuser nocreatedb nocreaterole noinherit;
  end if;
end
$$;

-- PostgreSQL 16+ no da SET sobre un rol a quien lo creó si no es superusuario (el
-- `postgres` de Supabase): sin esta membresía, `set local role` fallaría. INHERIT FALSE:
-- la conexión no gana nada mientras no lo asuma.
grant communication_app to current_user with inherit false, set true;

-- ── Identidad ────────────────────────────────────────────────────────────────

create table communication.app_user (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(trim(email)) and email like '%@%'),
  role          text check (role in ('ADMINISTRADOR', 'OPERADOR', 'REVISOR')),
  status        text not null default 'INVITED' check (status in ('INVITED', 'ACTIVE', 'INACTIVE')),
  created_at    timestamptz not null default now()
);
comment on table communication.app_user is
  'D-0072: la persona interna en Communication OS. INVITED hasta el primer login; INACTIVE es la baja, que corta el acceso en el request siguiente. Sin rol no hay acceso.';

create table communication.user_credential (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references communication.app_user (id),
  provider    text not null check (provider in ('google')),
  subject     text not null check (subject <> ''),
  created_at  timestamptz not null default now(),
  unique (provider, subject)
);
create index user_credential_por_usuario on communication.user_credential (user_id);
comment on table communication.user_credential is
  'D-0077: el par (proveedor, sujeto) que identifica a la persona. Desde el primer login la identidad es el sujeto, no el email.';

create table communication.user_invitation (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references communication.app_user (id),
  email        text not null check (email = lower(trim(email)) and email like '%@%'),
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_by   uuid references communication.app_user (id),
  created_at   timestamptz not null default now(),
  check (consumed_at is null or consumed_at >= created_at)
);
create unique index user_invitation_una_vigente_por_email
  on communication.user_invitation (email) where consumed_at is null;
comment on table communication.user_invitation is
  'D-0072: sólo se entra por invitación. El primer login con este email verificado crea la credencial y consume la invitación.';

-- ── Autoría del envío ────────────────────────────────────────────────────────

alter table communication.outbound_attempt
  add column created_by uuid references communication.app_user (id);
comment on column communication.outbound_attempt.created_by is
  'T-0035: quién inició el envío. Nulo en los intentos de la credencial compartida (AUTH_MODE=legacy).';

-- ── Auditoría estructurada y mínima ──────────────────────────────────────────

create table communication.audit_event (
  id             bigint generated always as identity primary key,
  occurred_at    timestamptz not null default now(),
  actor_user_id  uuid references communication.app_user (id),
  origin         text not null check (origin in ('app', 'cli')),
  action         text not null check (action ~ '^[a-z][a-z0-9_.]{2,63}$'),
  object_type    text check (object_type ~ '^[a-z][a-z0-9_]{1,40}$'),
  object_id      text check (length(object_id) <= 64),
  outcome        text not null check (outcome in ('ok', 'denied', 'error')),
  reason_code    text check (reason_code ~ '^[A-Z][A-Z0-9_]{1,40}$')
);
create index audit_event_por_objeto on communication.audit_event (object_type, object_id, occurred_at);
comment on table communication.audit_event is
  'T-0035: quién hizo qué sobre qué y con qué resultado. Sin payloads ni texto libre: ni el texto de un mensaje ni un teléfono caben en estos campos.';

create function communication.audit_event_solo_insercion() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_event es sólo de inserción' using errcode = 'restrict_violation';
end
$$;
create trigger audit_event_solo_insercion before update or delete on communication.audit_event
  for each row execute function communication.audit_event_solo_insercion();
create trigger audit_event_solo_insercion_truncate before truncate on communication.audit_event
  for each statement execute function communication.audit_event_solo_insercion();

-- ── Funciones de predicado (D-0022) ──────────────────────────────────────────
-- Únicas fuentes de los predicados: las usan las políticas y la app. SECURITY DEFINER
-- para leer las tablas de identidad sin depender del RLS de quien llama; search_path
-- vacío y nombres calificados para que nadie las desvíe con un objeto homónimo.

-- El principal lo fija la app local a la transacción: set_config('authz.usuario_id', x, true).
create function communication.authz_usuario_declarado() returns uuid
language sql stable security definer set search_path = '' as $$
  select nullif(pg_catalog.current_setting('authz.usuario_id', true), '')::uuid
$$;

-- El principal sólo vale si la persona sigue ACTIVE y tiene rol: la baja corta el acceso
-- en el request siguiente, aunque la sesión siga viva (D-0022, condición 6).
create function communication.authz_usuario() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from communication.app_user u
  where u.id = communication.authz_usuario_declarado() and u.status = 'ACTIVE' and u.role is not null
$$;

create function communication.authz_rol() returns text
language sql stable security definer set search_path = '' as $$
  select u.role from communication.app_user u where u.id = communication.authz_usuario()
$$;

create function communication.authz_es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(communication.authz_rol() = 'ADMINISTRADOR', false)
$$;

-- Ver las conversaciones: Administrador y Operador Del Campo.
create function communication.authz_puede_leer() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(communication.authz_rol() in ('ADMINISTRADOR', 'OPERADOR'), false)
$$;

-- Responder: sólo el Operador Del Campo.
create function communication.authz_puede_responder() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(communication.authz_rol() = 'OPERADOR', false)
$$;

revoke all on function
  communication.authz_usuario_declarado(), communication.authz_usuario(), communication.authz_rol(),
  communication.authz_es_admin(), communication.authz_puede_leer(), communication.authz_puede_responder()
  from public;
grant execute on function
  communication.authz_usuario_declarado(), communication.authz_usuario(), communication.authz_rol(),
  communication.authz_es_admin(), communication.authz_puede_leer(), communication.authz_puede_responder()
  to communication_app;
revoke all on function communication.audit_event_solo_insercion() from public;

-- ── RLS en toda tabla del esquema ────────────────────────────────────────────
-- Sin `force`: el dueño sigue exento (ver cabecera). Una tabla sin política para un rol
-- queda vacía para ese rol: `communication_app` no ve el ledger de migraciones ni el
-- cuerpo crudo de las entregas.

do $$
declare
  tabla text;
begin
  for tabla in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'communication' and c.relkind = 'r'
  loop
    execute format('alter table communication.%I enable row level security', tabla);
  end loop;
end
$$;

grant usage on schema communication to communication_app;

-- Lectura de las conversaciones.
grant select on communication.message, communication.outbound_status, communication.unsupported_message,
  communication.outbound_attempt
  to communication_app;
create policy message_leer on communication.message for select to communication_app
  using ((select communication.authz_puede_leer()));
create policy outbound_status_leer on communication.outbound_status for select to communication_app
  using ((select communication.authz_puede_leer()));
create policy unsupported_message_leer on communication.unsupported_message for select to communication_app
  using ((select communication.authz_puede_leer()));
create policy outbound_attempt_leer on communication.outbound_attempt for select to communication_app
  using ((select communication.authz_puede_leer()));

-- La salud de las entregas que muestra la UI: horas y estado, nunca `body_raw` ni el error.
grant select (received_at, processing, processed_at) on communication.webhook_delivery to communication_app;
create policy webhook_delivery_leer on communication.webhook_delivery for select to communication_app
  using ((select communication.authz_puede_leer()));

-- Responder: el intento se crea a nombre de quien responde, y sólo esa persona lo cierra.
grant insert (idempotency_key, phone_number_id, wa_id, bsuid, body, body_sha256, created_by)
  on communication.outbound_attempt to communication_app;
grant update (state, wamid, message_id, body, error_code, error_title, settled_at)
  on communication.outbound_attempt to communication_app;
create policy outbound_attempt_crear on communication.outbound_attempt for insert to communication_app
  with check ((select communication.authz_puede_responder()) and created_by = (select communication.authz_usuario()));
create policy outbound_attempt_cerrar on communication.outbound_attempt for update to communication_app
  using ((select communication.authz_puede_responder()) and created_by = (select communication.authz_usuario()))
  with check ((select communication.authz_puede_responder()) and created_by = (select communication.authz_usuario()));

grant insert (wamid, direction, phone_number_id, wa_id, bsuid, body, wa_timestamp)
  on communication.message to communication_app;
create policy message_responder on communication.message for insert to communication_app
  with check (direction = 'outbound' and (select communication.authz_puede_responder()));

-- Identidad: cada persona ve lo suyo; un Administrador ve todo.
grant select on communication.app_user, communication.user_credential, communication.user_invitation
  to communication_app;
create policy app_user_leer on communication.app_user for select to communication_app
  using ((select communication.authz_es_admin()) or id = (select communication.authz_usuario()));
create policy user_credential_leer on communication.user_credential for select to communication_app
  using ((select communication.authz_es_admin()) or user_id = (select communication.authz_usuario()));
create policy user_invitation_leer on communication.user_invitation for select to communication_app
  using ((select communication.authz_es_admin()));

-- Auditoría: la escribe la app a nombre de quien actúa; la lee un Administrador.
grant select, insert on communication.audit_event to communication_app;
create policy audit_event_escribir on communication.audit_event for insert to communication_app
  with check (origin = 'app' and actor_user_id is not distinct from (select communication.authz_usuario()));
create policy audit_event_leer on communication.audit_event for select to communication_app
  using ((select communication.authz_es_admin()));
