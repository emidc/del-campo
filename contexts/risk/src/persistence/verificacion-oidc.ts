// Comprobación del rol de conexión del modo `oidc` en una base de Risk OS (T-0035, migración
// 0009). La corre el owner contra la base hosteada con la credencial de `risk_oidc`, después de
// `deploy/rol-oidc.sql` y antes de poner `AUTH_MODE=oidc` (procedimiento en
// docs/migration/T-0035-retiro-legado-risk.md). Dice, sin valores ni nombres de personas, si esa
// conexión podría leer datos sin pasar por `risk_persona` y RLS. Sólo lee, y sólo del catálogo.
// Que las migraciones estén al día lo dice `verificar`, con la cadena de `risk_app`: `risk_oidc`
// no puede leer ni el ledger.

import type { Sql, TransactionSql } from './database.ts'

type Db = Sql | TransactionSql

const ROL = 'risk_oidc'
const CATALOGO = ['pg_catalog', 'information_schema', 'pg_toast']
const ADMISION: readonly string[] = ['admision_credencial(text,text)', 'admision_invitacion(text)', 'admision_registrar(text,text,text,text,bigint)']
/** El registro de `jti` del token entre contextos (0010): la otra función que ejecuta la conexión. */
const REGISTRO_JTI = 'registrar_jti(text,text,timestamp with time zone)'
const PROPIAS: readonly string[] = [...ADMISION, REGISTRO_JTI]

export interface PuntoOidc {
  readonly punto: string
  readonly cumple: boolean
  readonly detalle: string
}

const lista = (xs: readonly string[]): string =>
  xs.length === 0 ? 'ninguno' : xs.length <= 6 ? xs.join(', ') : `${xs.slice(0, 6).join(', ')} y ${String(xs.length - 6)} más`

export const verificarOidc = async (db: Db): Promise<{ readonly rol: string; readonly puntos: readonly PuntoOidc[] }> => {
  const [r] = await db<{ rol: string; atributos: string[] }[]>`
    select current_user as rol, array_remove(array[
      case when rolsuper then 'superusuario' end, case when rolbypassrls then 'salta RLS' end,
      case when rolcreaterole then 'crea roles' end, case when rolcreatedb then 'crea bases' end,
      case when rolreplication then 'replicación' end, case when rolinherit then 'hereda' end], null) as atributos
    from pg_roles where rolname = current_user`
  const miembro = await db<{ rol: string; inherit: boolean; set: boolean }[]>`
    select g.rolname as rol, m.inherit_option as inherit, m.set_option as set
    from pg_auth_members m join pg_roles g on g.oid = m.roleid
    where m.member = (select oid from pg_roles where rolname = current_user) order by 1`
  // 'member': aun sin heredar, con SET ROLE tendría sus privilegios. `risk_persona` es la única
  // esperada, sin heredar y con SET; desde ella, RLS decide.
  const alcanza = await db<{ rol: string }[]>`
    select rolname as rol from pg_roles
    where rolname not in (current_user, 'risk_persona') and pg_has_role(current_user, oid, 'member') order by 1`
  // Tablas, vistas, materializadas, foráneas y particionadas, y también grants por columna.
  const privilegios = await db<{ p: string }[]>`
    select c.relname || ' ' || p.p as p from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join unnest(array['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger']) as p(p)
    where n.nspname = 'risk' and c.relkind in ('r', 'v', 'm', 'f', 'p')
      and (has_table_privilege(c.oid, p.p)
           or (p.p in ('select', 'insert', 'update', 'references') and has_any_column_privilege(c.oid, p.p)))
      and not (c.relname = 'evento_auditoria' and p.p = 'insert')
    order by 1`
  const [auditoria] = await db<{ columnas: string[] }[]>`
    select coalesce(array_agg(a.attname::text order by a.attnum) filter (where has_column_privilege(a.attrelid, a.attnum, 'insert')), '{}') as columnas
    from pg_attribute a where a.attrelid = 'risk.evento_auditoria'::regclass and a.attnum > 0 and not a.attisdropped`
  const [dueno] = await db<{ n: number }[]>`
    select count(*)::int as n from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'risk' and pg_has_role(c.relowner, 'member')`
  // Toda SECURITY DEFINER de `risk` que la conexión o PUBLIC pueden ejecutar: sólo las tres de
  // admisión y el registro de jti, y ninguna para PUBLIC (una restauración con --no-privileges las abre).
  const secdef = await db<{ f: string; publico: boolean; propia: boolean }[]>`
    select p.oid::regprocedure::text as f, has_function_privilege('public', p.oid, 'execute') as publico,
           has_function_privilege(p.oid, 'execute') as propia
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'risk' and p.prosecdef order by 1`
  // `risk_persona` tiene que poder usarse: sin sus grants (otra vez, una restauración), el modo
  // oidc niega todo aunque esta conexión esté bien.
  const [persona] = await db<{ usa: boolean; lee: boolean }[]>`
    select has_schema_privilege('risk_persona', 'risk', 'usage') as usa,
           has_table_privilege('risk_persona', 'risk.riesgo', 'select') as lee`
  const fuera = await db<{ esquema: string; n: number }[]>`
    select n.nspname as esquema, count(*)::int as n
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'v', 'm', 'p', 'f') and n.nspname <> 'risk' and n.nspname <> all (${CATALOGO})
      and has_schema_privilege(n.oid, 'usage') and has_table_privilege(c.oid, 'select')
    group by n.nspname order by n.nspname`
  const [crea] = await db<{ crea: boolean }[]>`select coalesce(has_schema_privilege('risk', 'create'), false) as crea`

  const rol = r?.rol ?? ''
  const ejecuta = new Set(secdef.filter((f) => f.propia).map((f) => f.f.replace(/^risk\./, '')))
  const faltaAdmision = ADMISION.filter((f) => !ejecuta.has(f))
  const faltaJti = !ejecuta.has(REGISTRO_JTI)
  const deMas = [...ejecuta].filter((f) => !PROPIAS.includes(f))
  const paraPublic = secdef.filter((f) => f.publico).map((f) => f.f.replace(/^risk\./, ''))
  const membresias = miembro.map((m) => `${m.rol}${m.inherit ? ' (hereda)' : ''}${m.set ? '' : ' (sin SET)'}`)
  const columnasEsperadas = ['actor_persona_id', 'origen', 'accion', 'tipo_objeto', 'id_objeto', 'resultado', 'motivo']
  const columnas = auditoria?.columnas ?? []
  return {
    rol,
    puntos: [
      { punto: `conectado como ${ROL}`, cumple: rol === ROL, detalle: rol },
      { punto: 'sin atributos de administración y sin heredar', cumple: (r?.atributos ?? []).length === 0, detalle: lista(r?.atributos ?? []) },
      { punto: 'miembro sólo de risk_persona, sin heredar y con SET', cumple: membresias.length === 1 && membresias[0] === 'risk_persona', detalle: lista(membresias) },
      { punto: 'no alcanza a risk_app ni a otro rol (legado_risk_app no le llega)', cumple: alcanza.length === 0, detalle: lista(alcanza.map((a) => a.rol)) },
      { punto: 'no es dueño de nada en risk', cumple: (dueno?.n ?? 0) === 0, detalle: `dueño de ${String(dueno?.n ?? 0)}` },
      { punto: 'ningún privilegio sobre tablas ni vistas de risk, salvo insertar en la auditoría', cumple: privilegios.length === 0, detalle: lista(privilegios.map((p) => p.p)) },
      {
        punto: 'en la auditoría inserta sólo las columnas del evento (no id ni ocurrido_en)',
        cumple: columnas.join(',') === columnasEsperadas.join(','), detalle: lista(columnas),
      },
      { punto: 'ejecuta las tres funciones de admisión', cumple: faltaAdmision.length === 0, detalle: `le falta: ${lista(faltaAdmision)}` },
      { punto: 'ejecuta el registro de jti (0010)', cumple: !faltaJti, detalle: faltaJti ? 'le falta: registrar_jti' : 'ok' },
      { punto: 'ninguna otra función SECURITY DEFINER de risk', cumple: deMas.length === 0, detalle: lista(deMas) },
      { punto: 'PUBLIC no ejecuta ninguna función SECURITY DEFINER de risk', cumple: paraPublic.length === 0, detalle: lista(paraPublic) },
      {
        punto: 'risk_persona conserva sus permisos (si no, oidc niega todo)', cumple: (persona?.usa ?? false) && (persona?.lee ?? false),
        detalle: persona?.usa !== true ? 'sin USAGE sobre risk' : persona.lee ? 'ok' : 'no lee risk.riesgo',
      },
      { punto: 'no crea objetos en risk', cumple: !(crea?.crea ?? false), detalle: crea?.crea === true ? 'puede crear' : 'no puede' },
      {
        punto: 'no lee tablas fuera de risk', cumple: fuera.length === 0,
        detalle: lista(fuera.map((f) => `${f.esquema} (${String(f.n)})`)),
      },
    ],
  }
}

export const informeVerificacionOidc = (v: { readonly rol: string; readonly puntos: readonly PuntoOidc[] }): string[] => [
  `rol conectado: ${v.rol}`,
  ...v.puntos.map((p) => `${p.cumple ? '✓' : '✗'} ${p.punto}: ${p.detalle}`),
  v.puntos.every((p) => p.cumple) ? 'conexión de oidc: cumple' : 'conexión de oidc: no cumple',
]
