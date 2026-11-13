-- T-0062 — Token personal para conectar un agente (Claude) a Broker OS por MCP.
--
-- Cada persona del equipo genera el suyo desde la app. Se guarda sólo el hash; el valor
-- se muestra una vez. Generar uno nuevo revoca el anterior. El agente actúa con el usuario
-- dueño del token: lo que puede leer o escribir es lo mismo que esa persona en la app.
--
-- Sólo la conexión de la app lee y escribe esta tabla; `broker_app` no tiene grants.

create table mcp_token (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user (id),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create unique index mcp_token_uno_vigente on mcp_token (user_id) where revoked_at is null;

alter table mcp_token enable row level security;
