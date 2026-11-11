-- T-0045 — Gestiones manuales en Broker OS (C6-01).
--
-- Una gestión es un trabajo abierto con un cliente: un siniestro, un endoso, una
-- cotización, una renovación, un reclamo a la compañía. Hoy el equipo las sigue en Zoho.
-- Esta migración da lo mínimo para crearlas, seguirlas y cerrarlas desde Broker OS.
--
--   * `service_case` es la gestión: tipo, título, cliente (obligatorio), póliza (opcional),
--     estado, responsable y fecha objetivo. El estado se actualiza; la historia queda en
--     `service_case_event`.
--   * `service_case_event` es la historia, sólo de alta: creación, notas, cambios de
--     estado y cierre. Nadie la modifica ni la borra.
--
-- Acceso, para `broker_app` con RLS (D-0022): una gestión se ve y se escribe si se ve su
-- cliente (`authz.ve_cliente`), y si tiene póliza, si además se ve la póliza. Un Revisor
-- no ve clientes en Broker OS, así que no ve gestiones. La creación queda a nombre de
-- quien actúa.

create table service_case (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'SINIESTRO', 'ENDOSO', 'COTIZACION', 'RENOVACION', 'RECLAMO_COMPANIA', 'FACTURACION', 'OTRO'
  )),
  title text not null check (btrim(title) <> ''),
  party_id uuid not null references party (id),
  policy_id uuid references policy (id),
  status text not null default 'ABIERTA' check (status in (
    'ABIERTA', 'EN_CURSO', 'ESPERANDO_COMPANIA', 'ESPERANDO_CLIENTE', 'CERRADA'
  )),
  assigned_user_id uuid references app_user (id),
  due_date date,
  outcome text,
  created_by_user_id uuid not null references app_user (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint service_case_cerrada_tiene_fecha check ((status = 'CERRADA') = (closed_at is not null))
);

create index service_case_party_idx on service_case (party_id);
create index service_case_policy_idx on service_case (policy_id) where policy_id is not null;
create index service_case_abiertas_idx on service_case (status, due_date) where status <> 'CERRADA';

create table service_case_event (
  id uuid primary key default gen_random_uuid(),
  service_case_id uuid not null references service_case (id),
  kind text not null check (kind in ('ALTA', 'NOTA', 'ESTADO', 'CIERRE')),
  body text,
  from_status text,
  to_status text,
  author_user_id uuid not null references app_user (id),
  -- clock_timestamp y no now(): varios eventos de una misma transacción quedan en orden.
  created_at timestamptz not null default clock_timestamp(),
  constraint service_case_event_nota_con_texto check (kind <> 'NOTA' or btrim(coalesce(body, '')) <> ''),
  constraint service_case_event_estado_con_destino check (kind not in ('ESTADO', 'CIERRE') or to_status is not null)
);

create index service_case_event_case_idx on service_case_event (service_case_id, created_at);

-- La historia es sólo de alta, también para el dueño de la tabla.
create function service_case_event_inmutable() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'service_case_event es sólo de alta: no se modifica ni se borra';
end;
$$;

create trigger service_case_event_inmutable
  before update or delete on service_case_event
  for each row execute function service_case_event_inmutable();

-- El correo de un integrante activo del equipo, para mostrar el responsable de una
-- gestión. Un Operador no lee `app_user` de otros (0007); esto le muestra sólo el correo.
create function authz.correo_integrante(usuario uuid) returns text
language sql stable security definer set search_path = '' as $$
  select u.email from public.app_user u
  where u.id = usuario and u.status = 'ACTIVE' and u.role is not null
    and authz.usuario() is not null
$$;
revoke all on function authz.correo_integrante(uuid) from public;
grant execute on function authz.correo_integrante(uuid) to broker_app, broker_mcp;

alter table service_case enable row level security;
alter table service_case_event enable row level security;

grant select, insert on service_case, service_case_event to broker_app;
grant update (title, status, assigned_user_id, due_date, outcome, updated_at, closed_at)
  on service_case to broker_app;

create policy service_case_leer on service_case for select to broker_app
  using (authz.ve_cliente(party_id) and (policy_id is null or authz.ve_poliza(policy_id)));
create policy service_case_crear on service_case for insert to broker_app
  with check (
    authz.ve_cliente(party_id)
    and (policy_id is null or authz.ve_poliza(policy_id))
    and created_by_user_id = (select authz.usuario())
  );
create policy service_case_actualizar on service_case for update to broker_app
  using (authz.ve_cliente(party_id) and (policy_id is null or authz.ve_poliza(policy_id)))
  with check (authz.ve_cliente(party_id) and (policy_id is null or authz.ve_poliza(policy_id)));

create policy service_case_event_leer on service_case_event for select to broker_app
  using (exists (select 1 from service_case c where c.id = service_case_id));
create policy service_case_event_crear on service_case_event for insert to broker_app
  with check (
    author_user_id = (select authz.usuario())
    and exists (select 1 from service_case c where c.id = service_case_id)
  );
