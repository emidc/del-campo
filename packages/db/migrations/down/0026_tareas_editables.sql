-- Reversa de 0026. Falla si ya hay eventos `CAMBIO` o `ACCION` en la historia.
drop function public.eliminar_tarea(uuid);
create or replace function task_event_inmutable() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'task_event es sólo de alta: no se modifica ni se borra';
end;
$$;
drop table task_action;
alter table task_event drop constraint task_event_kind_check;
alter table task_event add constraint task_event_kind_check
  check (kind in ('ALTA', 'COMENTARIO', 'ESTADO', 'ASIGNACION'));
revoke update (priority, follow_up) on task from broker_app;
alter table task drop column follow_up, drop column priority;
