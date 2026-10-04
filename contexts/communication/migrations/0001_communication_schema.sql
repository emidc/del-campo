-- Esquema de Communication OS (T-0024). Guarda lo que fija D-0065 y nada más.
--
-- El esquema `communication` y su ledger los crea el runner antes de aplicar esta
-- migración (src/persistence/migrations.ts): el ledger vive dentro del esquema, y una
-- migración no puede crear el lugar donde se registra a sí misma.
--
-- Ninguna tabla tiene clave foránea a `webhook_delivery`: la retención de 30 días borra
-- las entregas crudas y los mensajes tienen que sobrevivirlas sin cascadas (D-0065).

-- Cada POST con firma válida, tal cual llegó, guardado antes de responder 200. Un POST
-- con firma inválida se rechaza con 401 sin escribir nada, así que `signature` no
-- tiene otro valor posible: la columna afirma que no hay entregas sin verificar.
create table communication.webhook_delivery (
  id               bigint generated always as identity primary key,
  received_at      timestamptz not null default now(),
  signature        text not null check (signature = 'valid'),
  body_raw         text not null,
  processing       text not null default 'pending'
                   check (processing in ('pending', 'processed', 'failed')),
  processed_at     timestamptz,
  processing_error text,
  check ((processing = 'pending') = (processed_at is null)),
  check ((processing = 'failed') = (processing_error is not null))
);

-- La usan la retención y la "última entrega recibida" que muestra la UI (CO01 §2).
create index webhook_delivery_received_at on communication.webhook_delivery (received_at);

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
  -- Solo llega en el webhook entrante; si no se copia, se pierde con la retención.
  profile_name    text,
  body            text not null check (length(body) > 0),
  -- Entrante: el timestamp de WhatsApp (segundos). Saliente: el instante en que la API
  -- aceptó el envío, con el reloj del servidor, porque la API no devuelve uno.
  wa_timestamp    timestamptz not null,
  -- Entrante: la recepción de la primera entrega que lo trajo. Saliente: al persistirlo.
  received_at     timestamptz not null default now(),
  check (wa_id is not null or bsuid is not null),
  check (direction = 'inbound' or profile_name is null)
);

-- Orden del hilo: timestamp y, para los empates del mismo segundo (hallazgo 7 de
-- T-0020), el orden de inserción. El `wamid` no desempata en orden cronológico.
create index message_wa_id_order on communication.message (wa_id, wa_timestamp, id)
  where wa_id is not null;
create index message_bsuid_order on communication.message (bsuid, wa_timestamp, id)
  where bsuid is not null;

-- El último estado conocido de cada saliente. Sin clave foránea a `message`, a
-- propósito: el estado de un `wamid` que este contexto no envió (una plantilla desde el
-- panel de Meta) se registra sin crear un mensaje sin cuerpo, y el `sent` puede llegar
-- antes de que se persista el saliente con el `wamid` que devolvió la API.
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
-- llegaron, con participante y hora para poder ubicarlos en el hilo, sin contenido.
create table communication.unsupported_message (
  wamid           text primary key,
  type            text not null,
  phone_number_id text not null check (phone_number_id <> ''),
  wa_id           text check (wa_id <> ''),
  bsuid           text check (bsuid <> ''),
  wa_timestamp    timestamptz not null,
  received_at     timestamptz not null default now(),
  check (wa_id is not null or bsuid is not null)
);
