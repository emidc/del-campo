-- Tareas de la semana.
--
-- `task.weekly` marca las tareas que van al tablero semanal. Se tilda y destilda desde
-- Mis tareas y desde la ficha. Todos los lunes a las 00:00 de Mendoza, el trabajo
-- programado destilda las que están Hechas; las demás conservan la marca.

alter table task add column weekly boolean not null default false;

grant update (weekly) on task to broker_app;

create index task_semana_idx on task (status) where weekly;
