-- Rol con que corre la app de Risk OS en la base hosteada (T-0032; D-0063, D-0068, R-22).
--
-- Lo ejecuta el owner en la base de Risk OS, con el rol administrativo (`postgres` en Supabase),
-- después de aplicar las migraciones y cada vez que se agregue una (docs/despliegue/vercel-risk.md).
-- Es idempotente: correrlo de nuevo deja los mismos permisos. No lleva contraseña: el owner se la
-- pone aparte, fuera del repositorio (R-16, R-18).
--
-- Lo que deja:
--   - `risk_app` puede entrar y no es superusuario, no crea bases, roles ni esquemas, no salta
--     RLS y no es miembro de ningún rol;
--   - en el esquema `risk` lee e inserta en todas las tablas, salvo el ledger de migraciones, que
--     sólo lee; no tiene UPDATE, DELETE, TRUNCATE, REFERENCES ni TRIGGER sobre ninguna, y no es
--     dueño de nada, así que tampoco puede desactivar el trigger de sólo inserción (R-22);
--   - no recibe nada sobre otro esquema. Lo que Postgres da a PUBLIC (por ejemplo, USAGE sobre
--     `public`) lo tiene igual que cualquier rol: `pnpm --filter @del-campo/risk run db:verificar`
--     comprueba que no lea ninguna tabla fuera de `risk`.

begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'risk_app') then
    create role risk_app login noinherit;
  end if;
end
$$;

alter role risk_app login noinherit;

-- En Supabase, el rol administrativo no es superusuario y no puede modificar
-- SUPERUSER / REPLICATION / BYPASSRLS. Los defaults de CREATE ROLE ya son
-- restrictivos; si un risk_app preexistente tiene privilegios administrativos,
-- fallamos en vez de intentar corregirlos silenciosamente.
do $$
declare r record;
begin
  select rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
    into r
    from pg_roles
   where rolname = 'risk_app';

  if r.rolsuper
     or r.rolcreatedb
     or r.rolcreaterole
     or r.rolreplication
     or r.rolbypassrls then
    raise exception 'risk_app tiene atributos administrativos; corregir antes de continuar';
  end if;
end
$$;

-- Ninguna membresía: con NOINHERIT no heredaría privilegios, pero con SET ROLE tomaría los del
-- rol del que es miembro (por ejemplo, el dueño de las tablas) y podría desactivar el trigger.
do $$
declare g record;
begin
  for g in select r.rolname from pg_auth_members m join pg_roles r on r.oid = m.roleid
           where m.member = (select oid from pg_roles where rolname = 'risk_app') loop
    execute format('revoke %I from risk_app', g.rolname);
  end loop;
end
$$;

revoke all on schema risk from risk_app;
grant usage on schema risk to risk_app;

revoke all on all tables in schema risk from risk_app;
grant select, insert on all tables in schema risk to risk_app;
revoke insert on risk.schema_migrations from risk_app;
revoke all on all sequences in schema risk from risk_app;

-- Las tablas de una migración futura, que aplica este mismo rol administrativo, nacen con los
-- mismos permisos. Igual hay que volver a correr este archivo después de migrar.
alter default privileges in schema risk grant select, insert on tables to risk_app;

commit;
