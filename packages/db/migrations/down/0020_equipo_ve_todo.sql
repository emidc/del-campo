drop function authz.administra();

create or replace function authz.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(authz.rol() = 'ADMINISTRADOR', false)
$$;

create or replace function authz.integrantes_que_ven(cliente uuid) returns table (id uuid, email text)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email from public.app_user u
  where authz.usuario() is not null
    and u.status = 'ACTIVE'
    and (
      u.role = 'ADMINISTRADOR'
      or (u.role = 'OPERADOR' and exists (
        select 1 from public.client_assignment a
        where a.user_id = u.id and a.client_party_id = cliente and a.valid @> pg_catalog.now()
      ))
    )
  order by u.email
$$;
