-- Spike T-0020. Base propia: delcampo_spike_t0020. Se revierte con `dropdb`.

-- Cada POST recibido, antes de procesarlo. Demuestra reintentos y permite reprocesar.
create table if not exists webhook_delivery (
  id           bigint generated always as identity primary key,
  received_at  timestamptz not null default now(),
  signature    text not null check (signature in ('valid', 'unchecked')),
  body_raw     text not null,
  body         jsonb,
  processed_at timestamptz,
  error        text
);

create table if not exists message (
  id              bigint generated always as identity primary key,
  wa_message_id   text not null unique,
  direction       text not null check (direction in ('inbound', 'outbound')),
  phone_number_id text not null,
  wa_id           text not null,
  body            text,
  wa_timestamp    timestamptz not null,
  received_at     timestamptz not null default now(),
  delivery_id     bigint references webhook_delivery (id),
  raw             jsonb not null
);
create index if not exists message_order on message (wa_timestamp, wa_message_id);

-- Estados de salientes (sent, delivered, read, failed), sin modelar.
create table if not exists message_status (
  id            bigint generated always as identity primary key,
  wa_message_id text not null,
  status        text not null,
  recipient_id  text not null,
  wa_timestamp  timestamptz not null,
  received_at   timestamptz not null default now(),
  delivery_id   bigint references webhook_delivery (id),
  raw           jsonb not null,
  unique (wa_message_id, status)
);

-- Mensajes de tipos fuera de alcance: se registra que llegaron, no se procesan.
create table if not exists ignored_message (
  id            bigint generated always as identity primary key,
  wa_message_id text not null unique,
  type          text not null,
  received_at   timestamptz not null default now(),
  delivery_id   bigint references webhook_delivery (id),
  raw           jsonb not null
);
