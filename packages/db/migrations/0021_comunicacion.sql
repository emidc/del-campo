-- T-0066 — Comunicación como sección de Broker OS (D-0090).
--
-- Las tablas de mensajes de WhatsApp que hasta acá vivían en la base aparte de
-- Communication OS pasan a la base de Broker OS, en su propio esquema `communication`,
-- con la forma final de sus migraciones 0001 a 0004. No se traen sus usuarios, sus
-- invitaciones ni su auditoría: la identidad es la de Broker OS.
--
-- Quién toca qué:
--   - El receptor del webhook y las tareas programadas (retención y reproceso) usan la
--     conexión dueña, sin persona detrás: son los únicos que escriben entregas, estados
--     y mensajes entrantes.
--   - El equipo (`authz.es_admin()`, que desde 0020 es "es del equipo") lee todas las
--     conversaciones y registra sus respuestas: el intento de envío y el saliente.
--   - Quien no es del equipo no ve nada.
--
-- Ninguna tabla tiene clave foránea a `webhook_delivery`: la retención de 30 días borra
-- las entregas crudas y los mensajes tienen que sobrevivirlas sin cascadas (D-0065).

create schema communication;

-- Cada POST con firma válida, tal cual llegó, guardado antes de responder 200. Uno con
-- firma inválida se rechaza sin escribir nada, así que `signature` no tiene otro valor.
create table communication.webhook_delivery (
  id                  bigint generated always as identity primary key,
  received_at         timestamptz not null default now(),
  signature           text not null check (signature = 'valid'),
  body_raw            text not null,
  -- `ignored`: todo el contenido era de otro número; guarda contra cuál se filtró para
  -- que el reproceso la vuelva a evaluar si el número configurado cambia.
  processing          text not null default 'pending'
                      check (processing in ('pending', 'processed', 'ignored', 'failed')),
  processed_at        timestamptz,
  processing_error    text,
  -- Meta no reintenta después de un 200: una entrega fallida sólo se recupera
  -- reprocesando su cuerpo crudo. Cuántas veces y cuándo fue la última.
  reprocess_count     integer not null default 0 check (reprocess_count >= 0),
  last_reprocessed_at timestamptz,
  applied_count       integer not null default 0 check (applied_count >= 0),
  ignored_count       integer not null default 0 check (ignored_count >= 0),
  phone_number_filter text check (phone_number_filter ~ '^[0-9]+$'),
  check ((processing = 'pending') = (processed_at is null)),
  check ((processing = 'failed') = (processing_error is not null)),
  check ((reprocess_count = 0) = (last_reprocessed_at is null)),
  constraint webhook_delivery_ignored_check
    check (processing <> 'ignored'
           or (phone_number_filter is not null and ignored_count > 0 and applied_count = 0))
);

create index webhook_delivery_received_at on communication.webhook_delivery (received_at);
create index webhook_delivery_unprocessed on communication.webhook_delivery (received_at)
  where processing <> 'processed';

-- Mensajes de texto, entrantes y salientes. El participante tiene dos identificadores
-- (D-0065): puede faltar cualquiera, pero no ambos. No se guarda el payload crudo por
-- mensaje: copiaría datos personales más allá de los 30 días de retención.
create table communication.message (
  id              bigint generated always as identity primary key,
  wamid           text not null unique,
  direction       text not null check (direction in ('inbound', 'outbound')),
  phone_number_id text not null check (phone_number_id <> ''),
  wa_id           text check (wa_id <> ''),
  bsuid           text check (bsuid <> ''),
  -- Sólo llega en el webhook entrante; si no se copia, se pierde con la retención.
  profile_name    text,
  body            text not null check (length(body) > 0),
  -- Entrante: el timestamp de WhatsApp. Saliente: cuando la API aceptó el envío.
  wa_timestamp    timestamptz not null,
  received_at     timestamptz not null default now(),
  check (wa_id is not null or bsuid is not null),
  check (direction = 'inbound' or profile_name is null)
);

-- Orden del hilo: timestamp y, para los empates del mismo segundo, orden de inserción.
create index message_wa_id_order on communication.message (wa_id, wa_timestamp, id)
  where wa_id is not null;
create index message_bsuid_order on communication.message (bsuid, wa_timestamp, id)
  where bsuid is not null;

-- El último estado conocido de cada saliente. Sin clave foránea a `message`, a
-- propósito: también registra estados de salientes que no salieron de acá, y el `sent`
-- puede llegar antes de que se persista el saliente.
create table communication.outbound_status (
  wamid       text primary key,
  status      text not null check (status in ('sent', 'delivered', 'read', 'failed')),
  status_at   timestamptz not null,
  error_code  integer,
  error_title text,
  updated_at  timestamptz not null default now(),
  check (status = 'failed' or (error_code is null and error_title is null))
);

-- Mensajes de tipos fuera de alcance (imagen, audio, reacción…): se registra que
-- llegaron, con participante y hora para ubicarlos en el hilo, sin contenido. Su `id`
-- sale de la misma secuencia que `message.id`: el id de una conversación es el menor id
-- de las filas de su participante en cualquiera de las dos tablas, y no deben chocar.
create table communication.unsupported_message (
  wamid           text primary key,
  type            text not null,
  phone_number_id text not null check (phone_number_id <> ''),
  wa_id           text check (wa_id <> ''),
  bsuid           text check (bsuid <> ''),
  wa_timestamp    timestamptz not null,
  received_at     timestamptz not null default now(),
  id              bigint not null unique default nextval('communication.message_id_seq'),
  check (wa_id is not null or bsuid is not null)
);

-- Intentos de envío desde la pantalla. Cloud API no acepta claves de idempotencia, así
-- que la clave se genera acá y se persiste ANTES de llamar a la API (R-20).
--   pending      la llamada está en curso, o el proceso cayó antes de registrar el resultado;
--   accepted     la API devolvió un `wamid` y el saliente quedó en `message`;
--   rejected     la API respondió con un error: no salió nada;
--   unconfirmed  timeout, red caída o 5xx: pudo haber salido. No se reintenta solo.
create table communication.outbound_attempt (
  id              bigint generated always as identity primary key,
  idempotency_key uuid not null unique,
  phone_number_id text not null check (phone_number_id <> ''),
  wa_id           text not null check (wa_id <> ''),
  bsuid           text check (bsuid <> ''),
  -- En `accepted` el texto ya vive en `message`; en el resto lo borra la retención.
  body            text check (length(body) > 0),
  body_sha256     bytea not null check (length(body_sha256) = 32),
  state           text not null default 'pending'
                  check (state in ('pending', 'accepted', 'rejected', 'unconfirmed')),
  wamid           text unique,
  message_id      bigint references communication.message (id),
  error_code      integer,
  error_title     text,
  -- Quién lo envió. Nulo sólo si esa persona se borra de la base, que hoy no pasa.
  sent_by_user_id uuid references public.app_user (id),
  created_at      timestamptz not null default now(),
  settled_at      timestamptz,
  check ((state = 'pending') = (settled_at is null)),
  check (state <> 'accepted' or wamid is not null),
  check (wamid is null or state in ('accepted', 'unconfirmed')),
  check ((state = 'accepted') = (message_id is not null)),
  check (state <> 'accepted' or body is null),
  check (state <> 'pending' or body is not null),
  check (state = 'rejected' or error_code is null),
  check (state in ('rejected', 'unconfirmed') or error_title is null)
);

create index outbound_attempt_wa_id on communication.outbound_attempt (wa_id, created_at)
  where state in ('pending', 'unconfirmed');

-- ── Acceso ───────────────────────────────────────────────────────────────────

alter table communication.webhook_delivery enable row level security;
alter table communication.message enable row level security;
alter table communication.outbound_status enable row level security;
alter table communication.unsupported_message enable row level security;
alter table communication.outbound_attempt enable row level security;

grant usage on schema communication to broker_app;

-- `webhook_delivery` no tiene grants: el cuerpo crudo sólo lo toca la conexión dueña.
grant select on communication.message, communication.outbound_status,
  communication.unsupported_message, communication.outbound_attempt to broker_app;
grant insert on communication.message, communication.outbound_attempt to broker_app;
grant update (body, state, wamid, message_id, error_code, error_title, settled_at)
  on communication.outbound_attempt to broker_app;

create policy message_leer on communication.message for select to broker_app
  using (authz.es_admin());
-- Desde la pantalla sólo se registran salientes; los entrantes los escribe el receptor.
create policy message_responder on communication.message for insert to broker_app
  with check (authz.es_admin() and direction = 'outbound');

create policy outbound_status_leer on communication.outbound_status for select to broker_app
  using (authz.es_admin());

create policy unsupported_message_leer on communication.unsupported_message for select to broker_app
  using (authz.es_admin());

create policy outbound_attempt_leer on communication.outbound_attempt for select to broker_app
  using (authz.es_admin());
create policy outbound_attempt_crear on communication.outbound_attempt for insert to broker_app
  with check (authz.es_admin() and sent_by_user_id = authz.usuario());
create policy outbound_attempt_cerrar on communication.outbound_attempt for update to broker_app
  using (authz.es_admin())
  with check (authz.es_admin());
