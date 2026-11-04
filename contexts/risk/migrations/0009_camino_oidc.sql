-- T-0035, preparación de la fase 4 (decisión del owner, 2026-11-04): el camino `oidc` de Risk
-- OS deja de depender de `legado_risk_app`. Para quien se conecta hoy no cambia nada.
--
-- El problema: con 0006 a 0008, en AUTH_MODE=oidc la app se conecta como `risk_app`, que para
-- leer las credenciales e invitaciones antes de asumir `risk_persona` pasa por la política
-- `legado_risk_app` (todo, en toda tabla). Un error de código que consultara antes del
-- `set local role`, o después de volver de él, leería la base entera sin RLS.
--
-- Lo que hace esta migración:
--   * `risk_oidc`: el rol de conexión del modo `oidc`. Sin privilegios sobre ninguna tabla,
--     sin ninguna política que le deje ver filas y sin membresía en `risk_app`. Sólo puede:
--       - asumir `risk_persona` con `set local role` (INHERIT FALSE: no hereda nada),
--       - llamar a las tres funciones de admisión de abajo, y
--       - auditar un rechazo de acceso sin actor (insertar en `evento_auditoria`, sin leer).
--     Lo crea NOLOGIN; `deploy/rol-oidc.sql` le da LOGIN en la base hosteada (fase 4).
--   * Las tres funciones de admisión reemplazan las lecturas y escrituras que `ingresar` y
--     `conPrincipal` hacían con la conexión de la app. Son SECURITY DEFINER con search_path
--     vacío, y sólo `risk_oidc` las ejecuta. Cada una contesta por una identidad o un email
--     concretos, nunca una lista, y la que escribe vuelve a comprobar en la base lo que la
--     app ya decidió (rol vigente, credencial o invitación vigente de esa persona).
--   * `risk_app` deja de ser miembro de `risk_persona`: el modo `legacy` no lo usa, y así la
--     conexión con la política amplia no puede tomar el camino `oidc`.
--
-- Lo que no hace: no toca `legado_risk_app`. `legacy` sigue igual, y la vuelta atrás de la
-- fase 4 sigue siendo `AUTH_MODE=legacy`. El retiro de la política tiene su procedimiento en
-- docs/migration/T-0035-retiro-legado-risk.md.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'risk_oidc') then
    create role risk_oidc nologin noinherit nobypassrls nosuperuser nocreatedb nocreaterole;
  end if;
end
$$;

grant risk_persona to risk_oidc with inherit false, set true;
-- Como en 0006 con `risk_persona`: sin esta membresía, el rol administrativo de Supabase no
-- podría asumir `risk_oidc` para probarlo.
grant risk_oidc to current_user with inherit false, set true;
grant usage on schema risk to risk_oidc;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'risk_app')
     and pg_has_role('risk_app', 'risk_persona', 'member') then
    revoke risk_persona from risk_app;
  end if;
end
$$;

-- ── Admisión ─────────────────────────────────────────────────────────────────

-- La credencial externa de (proveedor, sujeto) y el rol vigente de su persona.
create function risk.admision_credencial(p_proveedor text, p_sujeto text)
returns table (id text, persona_id text, rol text)
language sql stable security definer set search_path = '' as $$
  select c.id::text, c.persona_id::text,
         (select r.rol from risk.rol_persona r where r.persona_id = c.persona_id order by r.id desc limit 1)
  from risk.credencial_externa c
  where c.proveedor = p_proveedor and c.sujeto = p_sujeto
$$;

-- La última invitación sin consumir para ese email, ya normalizado. Dos logins a la vez con la
-- misma invitación: el segundo espera el lock y después la ve consumida.
create function risk.admision_invitacion(p_email text)
returns table (id text, persona_id text, email text, vence_en timestamptz, rol text, con_credencial boolean)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('risk.invitacion:' || p_email, 0));
  return query
    select i.id::text, i.persona_id::text, i.email::text, i.vence_en,
           (select r.rol from risk.rol_persona r where r.persona_id = i.persona_id order by r.id desc limit 1),
           exists (select 1 from risk.credencial_externa c where c.persona_id = i.persona_id)
    from risk.invitacion i
    where i.email = p_email
      and not exists (select 1 from risk.credencial_externa c where c.invitacion_id = i.id)
    order by i.id desc limit 1;
end
$$;

-- Aplica un ingreso admitido: con invitación vincula la identidad (y la consume); sin ella,
-- la identidad ya tiene que ser de esa persona. Deja el `inicio_sesion` y el evento. Si la
-- base no está de acuerdo con la app, falla con 42501 y no escribe nada.
create function risk.admision_registrar(p_persona text, p_proveedor text, p_sujeto text, p_email text, p_invitacion bigint)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_accion text;
begin
  if (select r.rol from risk.rol_persona r where r.persona_id = p_persona order by r.id desc limit 1) is null then
    raise exception 'admisión: la persona no tiene un rol vigente' using errcode = '42501';
  end if;
  if p_invitacion is null then
    if not exists (select 1 from risk.credencial_externa c
                   where c.proveedor = p_proveedor and c.sujeto = p_sujeto and c.persona_id = p_persona) then
      raise exception 'admisión: la identidad no es de esa persona' using errcode = '42501';
    end if;
    v_accion := 'acceso.ingresar';
  else
    if not exists (select 1 from risk.invitacion i
                   where i.id = p_invitacion and i.persona_id = p_persona and i.email = p_email
                     and i.vence_en > pg_catalog.now()
                     and not exists (select 1 from risk.credencial_externa c where c.invitacion_id = i.id)) then
      raise exception 'admisión: sin una invitación vigente para esa persona y ese email' using errcode = '42501';
    end if;
    insert into risk.credencial_externa (persona_id, proveedor, sujeto, invitacion_id)
    values (p_persona, p_proveedor, p_sujeto, p_invitacion);
    v_accion := 'acceso.vincular';
  end if;
  insert into risk.registro_acceso (persona_id, tipo) values (p_persona, 'inicio_sesion');
  insert into risk.evento_auditoria (actor_persona_id, origen, accion, tipo_objeto, id_objeto, resultado, motivo)
  values (p_persona, 'app', v_accion, 'persona', p_persona, 'ok', null);
end
$$;

revoke all on function risk.admision_credencial(text, text) from public;
revoke all on function risk.admision_invitacion(text) from public;
revoke all on function risk.admision_registrar(text, text, text, text, bigint) from public;
grant execute on function risk.admision_credencial(text, text) to risk_oidc;
grant execute on function risk.admision_invitacion(text) to risk_oidc;
grant execute on function risk.admision_registrar(text, text, text, text, bigint) to risk_oidc;

-- ── Rechazos, sin actor ──────────────────────────────────────────────────────
-- Un login rechazado, una consulta de alguien que la base no admite o un token de otro
-- contexto rechazado: quedan auditados sin persona y sin objeto. Sólo insertar: `risk_oidc`
-- no lee la auditoría (sin SELECT, tampoco puede usar RETURNING).

grant insert on risk.evento_auditoria to risk_oidc;
create policy evento_auditoria_rechazo on risk.evento_auditoria for insert to risk_oidc
  with check (origen = 'app' and actor_persona_id is null and resultado = 'denied'
              and tipo_objeto is null and id_objeto is null
              and accion in ('acceso.ingresar', 'acceso.consultar', 'acceso.token'));
