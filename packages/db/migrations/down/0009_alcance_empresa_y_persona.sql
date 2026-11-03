-- Vuelve a las políticas y funciones de 0007: la empresa asignada vuelve a abrir todo lo
-- de sus miembros. Sólo para desarrollo; en producción la vuelta atrás es otra migración.

drop view miembro_de_empresa_asignada;

drop policy policy_version_leer on policy_version;
create policy policy_version_leer on policy_version for select to broker_app, broker_mcp
  using (authz.ve_poliza(policy_id));
drop policy policy_leer on policy;
create policy policy_leer on policy for select to broker_app, broker_mcp
  using (authz.ve_poliza(id));

drop policy organization_membership_leer on organization_membership;
create policy organization_membership_leer on organization_membership for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or organization_party_id = any((select authz.clientes_visibles())::uuid[]));
drop policy contact_point_leer on contact_point;
create policy contact_point_leer on contact_point for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or party_id = any((select authz.clientes_visibles())::uuid[]));
drop policy party_role_leer on party_role;
create policy party_role_leer on party_role for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or party_id = any((select authz.clientes_visibles())::uuid[]));
drop policy organization_profile_leer on organization_profile;
create policy organization_profile_leer on organization_profile for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or party_id = any((select authz.clientes_visibles())::uuid[]));
drop policy person_profile_leer on person_profile;
create policy person_profile_leer on person_profile for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or party_id = any((select authz.clientes_visibles())::uuid[]));

drop function authz.ve_cabecera_poliza(uuid);
drop function authz.ve_version(uuid, uuid);

create or replace function authz.ve_poliza(poliza uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select authz.es_admin() or exists (
    select 1 from public.policy_version v
    where v.policy_id = poliza and v.holder_party_id = any(authz.clientes_visibles())
  )
$$;
drop function authz.tomador_vigente(uuid);

create or replace function authz.ve_cliente(party uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select authz.es_admin() or party = any(authz.clientes_visibles())
$$;

create or replace function authz.clientes_visibles() returns uuid[]
language sql stable security definer set search_path = '' as $$
  with asignados as (
    select a.client_party_id as party_id
    from public.client_assignment a
    where authz.rol() = 'OPERADOR'
      and a.user_id = authz.usuario()
      and a.valid @> pg_catalog.now()
  ), miembros as (
    select m.person_party_id as party_id
    from public.organization_membership m
    join asignados s on s.party_id = m.organization_party_id
    where m.valid_from <= pg_catalog.now()
      and (m.valid_to is null or m.valid_to > pg_catalog.now())
  )
  select coalesce(pg_catalog.array_agg(distinct party_id), '{}') from (
    select party_id from asignados union select party_id from miembros
  ) visibles
$$;

drop function authz.miembros_visibles();
drop function authz.clientes_asignados();
