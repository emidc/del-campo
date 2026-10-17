// Comprobación del rol y del aislamiento de una base de Risk OS (T-0032; D-0063, D-0068, R-22).
// La corre el owner contra la base hosteada con la misma credencial que usa la app, después de
// `deploy/rol-app.sql`: dice, sin valores ni nombres de personas, si ese rol puede saltear el
// sólo inserción, si lee algo fuera de `risk` y si la base tiene rastros de Broker OS o de
// Communication OS. Sólo lee, y sólo del catálogo.

import { MIGRATIONS_DIR, pendientesSinCrear } from './migrations.ts'
import type { Sql, TransactionSql } from './database.ts'

type Db = Sql | TransactionSql

export interface Verificacion {
  readonly rol: string
  readonly pendientes: readonly string[]
  /** Superusuario, salta RLS, crea roles o bases: un rol de app no tiene nada de eso. */
  readonly atributos: readonly string[]
  /** Tablas de `risk` de las que el rol es dueño, o miembro del dueño: puede desactivar los triggers. */
  readonly duenoDe: number
  /** Roles de los que es miembro, aun sin heredar: con `SET ROLE` tendría sus privilegios. */
  readonly miembroDe: readonly string[]
  /** `tabla privilegio` que el rol no debería tener: UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER. */
  readonly privilegiosDeMas: readonly string[]
  /** Tablas de `risk` (salvo el ledger) en las que el rol no puede leer o insertar. */
  readonly faltan: readonly string[]
  readonly creaEnRisk: boolean
  /** Esquemas fuera de `risk` y del catálogo con alguna tabla o vista que el rol puede leer, y cuántas. */
  readonly leeFueraDeRisk: Readonly<Record<string, number>>
  /** Tablas que delatan otra base: un esquema `communication`, o `party` / `policy` de Broker OS. */
  readonly rastrosDeOtrosSistemas: number
  /** Roles de la Data API de Supabase (`anon`, `authenticated`) con acceso al esquema `risk`. */
  readonly dataApiEnRisk: readonly string[]
}

const CATALOGO = ['pg_catalog', 'information_schema', 'pg_toast']

export const verificar = async (db: Db, dir = MIGRATIONS_DIR): Promise<Verificacion> => {
  const [r] = await db<{ rol: string; atributos: string[] }[]>`
    select current_user as rol, array_remove(array[
      case when rolsuper then 'superusuario' end, case when rolbypassrls then 'salta RLS' end,
      case when rolcreaterole then 'crea roles' end, case when rolcreatedb then 'crea bases' end,
      case when rolreplication then 'replicación' end], null) as atributos
    from pg_roles where rolname = current_user`
  const tablas = await db<{ tabla: string; dueno: boolean; sel: boolean; ins: boolean; demas: string[] }[]>`
    select c.relname as tabla, pg_has_role(c.relowner, 'member') as dueno,
           has_table_privilege(c.oid, 'select') as sel, has_table_privilege(c.oid, 'insert') as ins,
           array_remove(array[
             case when has_table_privilege(c.oid, 'update') then 'update' end,
             case when has_table_privilege(c.oid, 'delete') then 'delete' end,
             case when has_table_privilege(c.oid, 'truncate') then 'truncate' end,
             case when has_table_privilege(c.oid, 'references') then 'references' end,
             case when has_table_privilege(c.oid, 'trigger') then 'trigger' end], null) as demas
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'risk' and c.relkind = 'r' order by c.relname`
  // 'member' y no 'usage': un rol NOINHERIT no hereda los privilegios, pero con SET ROLE los toma.
  const miembro = await db<{ rol: string }[]>`
    select rolname as rol from pg_roles
    where rolname <> current_user and pg_has_role(current_user, oid, 'member') order by rolname`
  const [crea] = await db<{ crea: boolean }[]>`select coalesce(has_schema_privilege('risk', 'create'), false) as crea`
  const fuera = await db<{ esquema: string; n: number }[]>`
    select n.nspname as esquema, count(*)::int as n
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'v', 'm', 'p', 'f') and n.nspname <> 'risk' and n.nspname <> all (${CATALOGO})
      and has_schema_privilege(n.oid, 'usage') and has_table_privilege(c.oid, 'select')
    group by n.nspname order by n.nspname`
  const [rastros] = await db<{ n: number }[]>`
    select count(*)::int as n from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p') and (n.nspname = 'communication' or (n.nspname <> 'risk' and c.relname in ('party', 'policy')))`
  const dataApi = await db<{ rol: string }[]>`
    select rolname as rol from pg_roles
    where rolname in ('anon', 'authenticated') and has_schema_privilege(rolname, 'risk', 'usage') order by rolname`
  return {
    rol: r?.rol ?? '',
    pendientes: await pendientesSinCrear(db, dir),
    atributos: r?.atributos ?? [],
    duenoDe: tablas.filter((t) => t.dueno).length,
    miembroDe: miembro.map((m) => m.rol),
    privilegiosDeMas: tablas.flatMap((t) => t.demas.map((p) => `${t.tabla} ${p}`)),
    faltan: tablas.filter((t) => t.tabla !== 'schema_migrations' && !(t.sel && t.ins)).map((t) => t.tabla),
    creaEnRisk: crea?.crea ?? false,
    leeFueraDeRisk: Object.fromEntries(fuera.map((f) => [f.esquema, f.n])),
    rastrosDeOtrosSistemas: rastros?.n ?? 0,
    dataApiEnRisk: dataApi.map((d) => d.rol),
  }
}

/** Lo que tiene que cumplir el rol de la app, cada punto con su resultado. */
export const puntosVerificacion = (v: Verificacion): { readonly punto: string; readonly cumple: boolean; readonly detalle: string }[] => {
  // Hasta seis, y cuántos más: con el rol administrativo la lista de privilegios es larga.
  const lista = (xs: readonly string[]): string =>
    xs.length === 0 ? 'ninguno' : xs.length <= 6 ? xs.join(', ') : `${xs.slice(0, 6).join(', ')} y ${String(xs.length - 6)} más`
  return [
    { punto: 'migraciones al día', cumple: v.pendientes.length === 0, detalle: `pendientes: ${lista(v.pendientes)}` },
    { punto: 'sin atributos de administración', cumple: v.atributos.length === 0, detalle: lista(v.atributos) },
    { punto: 'no es dueño de ninguna tabla de risk', cumple: v.duenoDe === 0, detalle: `dueño de ${String(v.duenoDe)}` },
    { punto: 'no es miembro de ningún otro rol', cumple: v.miembroDe.length === 0, detalle: lista(v.miembroDe) },
    { punto: 'sin UPDATE, DELETE, TRUNCATE, REFERENCES ni TRIGGER en risk', cumple: v.privilegiosDeMas.length === 0, detalle: lista(v.privilegiosDeMas) },
    { punto: 'lee e inserta en cada tabla de risk', cumple: v.faltan.length === 0, detalle: `le falta: ${lista(v.faltan)}` },
    { punto: 'no crea objetos en risk', cumple: !v.creaEnRisk, detalle: v.creaEnRisk ? 'puede crear' : 'no puede' },
    {
      punto: 'no lee tablas fuera de risk', cumple: Object.keys(v.leeFueraDeRisk).length === 0,
      detalle: lista(Object.entries(v.leeFueraDeRisk).map(([e, n]) => `${e} (${String(n)})`)),
    },
    { punto: 'sin tablas de Broker OS ni de Communication OS en esta base', cumple: v.rastrosDeOtrosSistemas === 0, detalle: `${String(v.rastrosDeOtrosSistemas)} tablas` },
    { punto: 'la Data API (anon, authenticated) no entra a risk', cumple: v.dataApiEnRisk.length === 0, detalle: lista(v.dataApiEnRisk) },
  ]
}

export const informeVerificacion = (v: Verificacion): string[] => {
  const puntos = puntosVerificacion(v)
  return [
    `rol conectado: ${v.rol}`,
    ...puntos.map((p) => `${p.cumple ? '✓' : '✗'} ${p.punto}: ${p.detalle}`),
    puntos.every((p) => p.cumple) ? 'rol de la app: cumple' : 'rol de la app: no cumple',
  ]
}
