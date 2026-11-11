-- T-0052 — Tareas (C6, pieza que piden los recorridos R1 a R3).
--
-- Una tarea es un trabajo chico con un responsable y un vencimiento: pedir un
-- certificado, hacer el seguimiento de una renovación, verificar una cobertura. Siempre es
-- de un cliente y puede citar una póliza y una gestión de ese cliente.
--
--   * `task` es la tarea: título, cliente, póliza y gestión opcionales, estado,
--     responsable y vencimiento. El estado se actualiza; la historia queda en `task_event`.
--   * `task_event` es la historia, sólo de alta: creación, comentarios, cambios de estado
--     y reasignaciones.
--
-- Estados: Pendiente, En curso, Trabada, En revisión y Hecha. Hecha fija `done_at`.
--
-- Acceso, igual que una gestión (0013 y 0014): se ve y se escribe si se ve su cliente y,
-- si cita una póliza, la póliza. Sólo se asigna a quien ve al cliente.

create table task (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> '' and length(title) <= 200),
  party_id uuid not null references party (id),
  policy_id uuid references policy (id),
  service_case_id uuid references service_case (id),
  status text not null default 'PENDIENTE'
    check (status in ('PENDIENTE', 'EN_CURSO', 'TRABADA', 'EN_REVISION', 'HECHA')),
  assigned_user_id uuid references app_user (id),
  due_date date,
  created_by_user_id uuid not null references app_user (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz,
  constraint task_hecha_tiene_fecha check ((status = 'HECHA') = (done_at is not null))
);

create index task_party_idx on task (party_id);
create index task_service_case_idx on task (service_case_id) where service_case_id is not null;
create index task_abiertas_idx on task (assigned_user_id, due_date) where status <> 'HECHA';

-- La gestión que cita una tarea es del mismo cliente.
create function tarea_gestion_del_cliente() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.service_case_id is not null and not exists (
    select 1 from service_case c where c.id = new.service_case_id and c.party_id = new.party_id
  ) then
    raise exception 'la gestión de la tarea es de otro cliente';
  end if;
  return new;
end;
$$;

create trigger tarea_gestion_del_cliente
  before insert or update of party_id, service_case_id on task
  for each row execute function tarea_gestion_del_cliente();

create table task_event (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references task (id),
  kind text not null check (kind in ('ALTA', 'COMENTARIO', 'ESTADO', 'ASIGNACION')),
  body text,
  from_status text,
  to_status text,
  author_user_id uuid not null references app_user (id),
  created_at timestamptz not null default clock_timestamp(),
  constraint task_event_comentario_con_texto check (kind <> 'COMENTARIO' or btrim(coalesce(body, '')) <> ''),
  constraint task_event_estado_con_destino check (kind <> 'ESTADO' or to_status is not null)
);

create index task_event_task_idx on task_event (task_id, created_at);

create function task_event_inmutable() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'task_event es sólo de alta: no se modifica ni se borra';
end;
$$;

create trigger task_event_inmutable
  before update or delete on task_event
  for each row execute function task_event_inmutable();

alter table task enable row level security;
alter table task_event enable row level security;

grant select, insert on task, task_event to broker_app;
grant update (title, status, assigned_user_id, due_date, updated_at, done_at) on task to broker_app;

create policy task_leer on task for select to broker_app
  using (authz.ve_cliente(party_id) and (policy_id is null or authz.ve_poliza(policy_id)));
create policy task_crear on task for insert to broker_app
  with check (
    authz.ve_cliente(party_id)
    and (policy_id is null or authz.ve_poliza(policy_id))
    and created_by_user_id = (select authz.usuario())
    and (assigned_user_id is null
      or assigned_user_id in (select i.id from authz.integrantes_que_ven(party_id) i))
  );
create policy task_actualizar on task for update to broker_app
  using (authz.ve_cliente(party_id) and (policy_id is null or authz.ve_poliza(policy_id)))
  with check (
    authz.ve_cliente(party_id)
    and (policy_id is null or authz.ve_poliza(policy_id))
    and (assigned_user_id is null
      or assigned_user_id in (select i.id from authz.integrantes_que_ven(party_id) i))
  );

create policy task_event_leer on task_event for select to broker_app
  using (exists (select 1 from task t where t.id = task_id));
create policy task_event_crear on task_event for insert to broker_app
  with check (
    author_user_id = (select authz.usuario())
    and exists (select 1 from task t where t.id = task_id)
  );
