-- Rol de conexión del modo `oidc` de Risk OS en la base hosteada (T-0035, migración 0009).
--
-- Lo ejecuta el owner en la base de Risk OS, con el rol administrativo (`postgres` en Supabase),
-- después de aplicar la 0009 y antes de poner `AUTH_MODE=oidc` (fase 4 del plan de migración;
-- procedimiento en docs/migration/T-0035-retiro-legado-risk.md). Es idempotente: correrlo de
-- nuevo deja los mismos permisos. No lleva contraseña: el owner se la pone aparte, fuera del
-- repositorio (R-16, R-18), y la cadena va a `RISK_OIDC_DATABASE_URL`, no a `RISK_DATABASE_URL`.
--
-- Lo que deja:
--   - `risk_oidc` puede entrar y no es superusuario, no crea bases, roles ni esquemas, no salta
--     RLS y no hereda;
--   - es miembro de `risk_persona` y de nada más, sin heredar sus privilegios (INHERIT FALSE):
--     sólo puede asumirlo con `set local role`, y desde ahí decide RLS. En particular no es
--     miembro de `risk_app`, así que `legado_risk_app` no le llega;
--   - sobre las tablas de `risk` no tiene ningún privilegio, salvo insertar las columnas del
--     evento en `evento_auditoria` (no `id` ni `ocurrido_en`), y ahí la política
--     `evento_auditoria_rechazo` le deja sólo rechazos sin actor. Lo demás lo hace por las tres funciones `admision_*` de la 0009, que sólo él
--     ejecuta: este archivo les vuelve a sacar EXECUTE a PUBLIC.
--
-- `pnpm --filter @del-campo/risk run db:verificar-oidc --hosteada`, con la cadena de
-- `risk_oidc`, comprueba todo esto desde el lado de la conexión.

begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'risk_oidc') then
    raise exception 'falta risk_oidc: aplicar antes la migración 0009 de Risk OS';
  end if;
end
$$;

alter role risk_oidc login noinherit;

-- Como en rol-app.sql: si tiene atributos administrativos, se falla en vez de intentar
-- corregirlos en silencio (en Supabase el rol administrativo no puede quitarlos).
do $$
declare r record;
begin
  select rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
    into r
    from pg_roles
   where rolname = 'risk_oidc';

  if r.rolsuper or r.rolcreatedb or r.rolcreaterole or r.rolreplication or r.rolbypassrls then
    raise exception 'risk_oidc tiene atributos administrativos; corregir antes de continuar';
  end if;
end
$$;

-- Ninguna membresía salvo `risk_persona`, que se vuelve a dar con INHERIT FALSE para que no
-- herede nada aunque alguien lo cambie.
do $$
declare g record;
begin
  for g in select r.rolname from pg_auth_members m join pg_roles r on r.oid = m.roleid
           where m.member = (select oid from pg_roles where rolname = 'risk_oidc') loop
    execute format('revoke %I from risk_oidc', g.rolname);
  end loop;
end
$$;
grant risk_persona to risk_oidc with inherit false, set true;

revoke all on schema risk from risk_oidc;
grant usage on schema risk to risk_oidc;

revoke all on all tables in schema risk from risk_oidc;
revoke all on all sequences in schema risk from risk_oidc;
grant insert (actor_persona_id, origen, accion, tipo_objeto, id_objeto, resultado, motivo) on risk.evento_auditoria to risk_oidc;

-- Una restauración con `pg_restore --no-privileges` deja las funciones con el default de
-- Postgres (EXECUTE para PUBLIC). Se vuelve a cerrar acá, cada vez (revisión ciega de 0009).
revoke all on function risk.admision_credencial(text, text) from public;
revoke all on function risk.admision_invitacion(text) from public;
revoke all on function risk.admision_registrar(text, text, text, text, bigint) from public;
grant execute on function risk.admision_credencial(text, text) to risk_oidc;
grant execute on function risk.admision_invitacion(text) to risk_oidc;
grant execute on function risk.admision_registrar(text, text, text, text, bigint) to risk_oidc;

commit;
