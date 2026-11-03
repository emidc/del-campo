-- T-0035 — D-0027 con la precisión de alcance del owner (2026-11-03): asignar una
-- empresa no da acceso a las pólizas personales de sus miembros.
--
-- Corrige 0007 sin reescribirla (ya está en main y puede estar aplicada):
--
-- * **Asignación directa** (`authz.clientes_asignados()`): el cliente asignado, empresa o
--   persona. Da el alcance completo: perfil, roles, contactos, documentos y las pólizas de
--   las que es tomador vigente.
-- * **Miembro vigente de una empresa asignada** (`authz.miembros_visibles()`): sólo la
--   identificación mínima para operar la cuenta de la empresa: la fila de `party`, la
--   pertenencia y el nombre, por la vista `miembro_de_empresa_asignada`. No su perfil
--   personal (DNI, CUIL, fecha de nacimiento), ni sus contactos, ni sus documentos, ni
--   sus pólizas. Para eso hace falta asignar a la persona.
--   `contact_point` no distingue contacto profesional de personal: hasta que lo haga, los
--   contactos de un miembro no se exponen por la empresa.
-- * **Pólizas por tomador vigente** (`authz.tomador_vigente()`): la póliza completa
--   (versiones, endosos, documentos) la ve quien tiene asignado al tomador de la versión
--   vigente hoy, o de la última si ninguna está vigente. Si el tomador cambió, quien
--   tenía asignado al tomador anterior conserva sólo la cabecera y las versiones de su
--   época; nada de lo que vino después, ni endosos ni documentos.
--
-- Por qué no cambia el comportamiento actual: igual que 0007, todo esto sólo rige para
-- `broker_app` y `broker_mcp`, que nadie usa hasta que Broker OS pase a `oidc`.

create function authz.clientes_asignados() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(pg_catalog.array_agg(distinct a.client_party_id), '{}')
  from public.client_assignment a
  where authz.rol() = 'OPERADOR'
    and a.user_id = authz.usuario()
    and a.valid @> pg_catalog.now()
$$;

create function authz.miembros_visibles() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(pg_catalog.array_agg(distinct m.person_party_id), '{}')
  from public.organization_membership m
  where m.organization_party_id = any(authz.clientes_asignados())
    and m.valid_from <= pg_catalog.now()
    and (m.valid_to is null or m.valid_to > pg_catalog.now())
$$;

-- Ahora es la unión de los dos alcances, y sólo gobierna la fila de `party`.
create or replace function authz.clientes_visibles() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(pg_catalog.array_agg(distinct party_id), '{}') from (
    select pg_catalog.unnest(authz.clientes_asignados()) as party_id
    union
    select pg_catalog.unnest(authz.miembros_visibles())
  ) visibles
$$;

-- Alcance completo sobre un cliente: sólo por asignación directa.
create or replace function authz.ve_cliente(party uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select authz.es_admin() or party = any(authz.clientes_asignados())
$$;

-- El tomador de la versión vigente hoy; si ninguna lo está, el de la que empezó último.
create function authz.tomador_vigente(poliza uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select v.holder_party_id from public.policy_version v
  where v.policy_id = poliza
  order by (v.effective_from <= current_date
            and (v.effective_to is null or v.effective_to > current_date)) desc,
           v.effective_from desc
  limit 1
$$;

create or replace function authz.ve_poliza(poliza uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select authz.es_admin() or authz.tomador_vigente(poliza) = any(authz.clientes_asignados())
$$;

-- Una versión: con la póliza completa, o si su propio tomador está asignado.
create function authz.ve_version(poliza uuid, tomador uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select authz.ve_poliza(poliza) or tomador = any(authz.clientes_asignados())
$$;

-- La cabecera: con la póliza completa, o si alguna versión fue de un tomador asignado.
create function authz.ve_cabecera_poliza(poliza uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select authz.ve_poliza(poliza) or exists (
    select 1 from public.policy_version v
    where v.policy_id = poliza and v.holder_party_id = any(authz.clientes_asignados())
  )
$$;

revoke all on all functions in schema authz from public;
grant execute on all functions in schema authz to broker_app, broker_mcp;

-- ── Políticas ────────────────────────────────────────────────────────────────

drop policy person_profile_leer on person_profile;
create policy person_profile_leer on person_profile for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or party_id = any((select authz.clientes_asignados())::uuid[]));
drop policy organization_profile_leer on organization_profile;
create policy organization_profile_leer on organization_profile for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or party_id = any((select authz.clientes_asignados())::uuid[]));
drop policy party_role_leer on party_role;
create policy party_role_leer on party_role for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or party_id = any((select authz.clientes_asignados())::uuid[]));
drop policy contact_point_leer on contact_point;
create policy contact_point_leer on contact_point for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or party_id = any((select authz.clientes_asignados())::uuid[]));
drop policy organization_membership_leer on organization_membership;
create policy organization_membership_leer on organization_membership for select to broker_app, broker_mcp
  using ((select authz.es_admin()) or organization_party_id = any((select authz.clientes_asignados())::uuid[]));

drop policy policy_leer on policy;
create policy policy_leer on policy for select to broker_app, broker_mcp
  using (authz.ve_cabecera_poliza(id));
drop policy policy_version_leer on policy_version;
create policy policy_version_leer on policy_version for select to broker_app, broker_mcp
  using (authz.ve_version(policy_id, holder_party_id));
-- endorsement, policy_document_reference y document_link ya usan ve_poliza y ve_cliente,
-- que cambiaron arriba: quedan acotados al tomador vigente y a la asignación directa.

-- ── Identificación mínima de los miembros ────────────────────────────────────
-- La vista corre con los permisos de su dueño (no es security_invoker), así que no pasa
-- por el RLS de `person_profile`: el filtro está adentro y expone sólo nombre y
-- pertenencia de los miembros vigentes de las empresas asignadas a quien consulta.

create view miembro_de_empresa_asignada with (security_barrier) as
  select m.organization_party_id, m.person_party_id, m.kind, p.first_name, p.last_name
  from organization_membership m
  join person_profile p on p.party_id = m.person_party_id
  where m.organization_party_id = any(authz.clientes_asignados())
    and m.person_party_id = any(authz.miembros_visibles())
    and m.valid_from <= now()
    and (m.valid_to is null or m.valid_to > now());

comment on view miembro_de_empresa_asignada is
  'D-0027 (precisión del owner, 2026-11-03): nombre y pertenencia de los miembros vigentes de las empresas asignadas. Sin datos personales, contactos ni pólizas.';

revoke all on miembro_de_empresa_asignada from public;
grant select on miembro_de_empresa_asignada to broker_app, broker_mcp;
