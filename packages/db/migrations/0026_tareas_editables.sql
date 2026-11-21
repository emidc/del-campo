-- Detalle de tarea editable.
--
-- 1. Prioridad (Alta, Media, Baja) y Seguimiento (Cotizando, Emitiendo, Ganada, En
--    seguimiento, En pausa) se editan desde la ficha. Seguimiento es independiente del
--    estado. Las dos empiezan vacías en las tareas que ya existen.
-- 2. Involucrar a alguien: una acción puntual de la tarea, con un integrante y qué tiene
--    que hacer. Está Pendiente o Hecha y la marca hecha sólo la persona involucrada; el
--    responsable y el estado de la tarea no cambian.
-- 3. La historia registra los cambios de vencimiento, prioridad y seguimiento (`CAMBIO`)
--    y las acciones (`ACCION`).
-- 4. Eliminar una tarea es definitivo: `eliminar_tarea` borra la tarea, sus acciones y su
--    historia en la misma transacción.

alter table task
  add column priority text check (priority in ('ALTA', 'MEDIA', 'BAJA')),
  add column follow_up text check (follow_up in ('COTIZANDO', 'EMITIENDO', 'GANADA', 'EN_SEGUIMIENTO', 'EN_PAUSA'));

grant update (priority, follow_up) on task to broker_app;

alter table task_event drop constraint task_event_kind_check;
alter table task_event add constraint task_event_kind_check
  check (kind in ('ALTA', 'COMENTARIO', 'ESTADO', 'ASIGNACION', 'CAMBIO', 'ACCION'));

create table task_action (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references task (id),
  assigned_user_id uuid not null references app_user (id),
  description text not null check (btrim(description) <> '' and length(description) <= 2000),
  status text not null default 'PENDIENTE' check (status in ('PENDIENTE', 'HECHA')),
  created_by_user_id uuid not null references app_user (id),
  created_at timestamptz not null default clock_timestamp(),
  done_at timestamptz,
  constraint task_action_hecha_tiene_fecha check ((status = 'HECHA') = (done_at is not null))
);

create index task_action_task_idx on task_action (task_id, created_at);
create index task_action_pendientes_idx on task_action (assigned_user_id) where status = 'PENDIENTE';

alter table task_action enable row level security;

grant select, insert on task_action to broker_app;
grant update (status, done_at) on task_action to broker_app;

create policy task_action_leer on task_action for select to broker_app
  using (exists (select 1 from task t where t.id = task_id));
create policy task_action_crear on task_action for insert to broker_app
  with check (
    created_by_user_id = (select authz.usuario())
    and exists (
      select 1 from task t
      where t.id = task_id
        and assigned_user_id in (select i.id from authz.integrantes_que_ven(t.party_id) i)
    )
  );
create policy task_action_marcar on task_action for update to broker_app
  using (assigned_user_id = (select authz.usuario()) and exists (select 1 from task t where t.id = task_id))
  with check (assigned_user_id = (select authz.usuario()));

-- La historia es sólo de alta (0017). El borrado definitivo de una tarea es la única
-- excepción y la abre sólo `eliminar_tarea`, con una marca local a su transacción.
create or replace function task_event_inmutable() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'DELETE' and coalesce(current_setting('broker.borrado_definitivo', true), '') = 'on' then
    return old;
  end if;
  raise exception 'task_event es sólo de alta: no se modifica ni se borra';
end;
$$;

create function public.eliminar_tarea(tarea uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.task t
  where t.id = tarea
    and authz.ve_cliente(t.party_id)
    and (t.policy_id is null or authz.ve_poliza(t.policy_id))
  for update;
  if not found then
    raise exception 'eliminar_tarea: no existe o está fuera de alcance' using errcode = 'no_data_found';
  end if;

  perform set_config('broker.borrado_definitivo', 'on', true);
  delete from public.task_action where task_id = tarea;
  delete from public.task_event where task_id = tarea;
  delete from public.task where id = tarea;
  perform set_config('broker.borrado_definitivo', '', true);
  insert into public.audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
  values (authz.usuario(), 'app', 'task.delete', 'task', tarea::text, 'ok');
end;
$$;

revoke all on function public.eliminar_tarea(uuid) from public;
grant execute on function public.eliminar_tarea(uuid) to broker_app;
