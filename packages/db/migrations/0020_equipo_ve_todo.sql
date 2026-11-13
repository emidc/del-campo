-- T-0060 — Todo el equipo ve y edita todo (D-0090).
--
-- Hasta acá un Operador sólo veía los clientes que tenía asignados y un Administrador veía
-- todo. Para un equipo de ocho personas esa separación sobra: desde esta migración
-- cualquier integrante activo del equipo (Administrador u Operador) ve y edita todos los
-- clientes, pólizas, gestiones y tareas.
--
-- Se cambia sólo el predicado del que cuelgan todas las políticas, `authz.es_admin()`, que
-- desde hoy significa "es del equipo". El nombre queda por compatibilidad con las
-- políticas existentes. Las asignaciones de clientes (`client_assignment`) dejan de
-- limitar lo que se ve; la tabla queda, sin uso.
--
-- El rol Administrador conserva un único significado: puede dar de alta y de baja
-- usuarios (`authz.administra()`). El usuario cliente del portal llega con T-0064.

create or replace function authz.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(authz.rol() in ('ADMINISTRADOR', 'OPERADOR'), false)
$$;

create function authz.administra() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(authz.rol() = 'ADMINISTRADOR', false)
$$;

-- Una gestión o una tarea se puede asignar a cualquier integrante activo del equipo.
create or replace function authz.integrantes_que_ven(cliente uuid) returns table (id uuid, email text)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email from public.app_user u
  where authz.usuario() is not null
    and u.status = 'ACTIVE'
    and u.role in ('ADMINISTRADOR', 'OPERADOR')
  order by u.email
$$;

revoke all on function authz.administra() from public;
grant execute on function authz.administra() to broker_app, broker_mcp;
