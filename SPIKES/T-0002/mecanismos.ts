// Los tres mecanismos de D-0022 detrás de la misma interfaz, para correr la misma matriz.
//
//   RLS          la app consulta sin filtros; Postgres filtra con las políticas.
//   APLICACION   la app evalúa los predicados en TypeScript/SQL propio, con un rol que
//                tiene BYPASSRLS: si una consulta olvida el filtro, no hay red.
//   HIBRIDO      la app decide la ACCIÓN (rol, regla de autor, explicación de quién puede)
//                y RLS decide las FILAS. Corre sobre la conexión con RLS.
import { conectar, enContexto, probarYDeshacer, type Contexto, type Sql, type Tx } from './db.ts'

export type Recurso = 'empresa' | 'poliza' | 'nota_interna' | 'informe'

export interface Mecanismo {
  readonly nombre: 'RLS' | 'APLICACION' | 'HIBRIDO'
  /** Ids visibles (para notas, el id de la empresa de cada nota), ordenados. */
  leer(ctx: Contexto, recurso: Recurso): Promise<string[]>
  escribirNota(ctx: Contexto, empresaId: string, autorId: string): Promise<boolean>
  aprobarInforme(ctx: Contexto, informeId: string): Promise<boolean>
  cerrar(): Promise<void>
}

const ordenar = (filas: readonly { id: string }[]): string[] => filas.map((f) => String(f.id)).sort()

const esRls = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === '42501'

// ── Consultas "sin filtro": las que escribe la app cuando confía en RLS ─────────────

async function leerSinFiltro(tx: Tx, recurso: Recurso): Promise<string[]> {
  switch (recurso) {
    case 'empresa': return ordenar(await tx`select id from broker.empresa`)
    case 'poliza': return ordenar(await tx`select id from broker.poliza`)
    case 'nota_interna': return ordenar(await tx`select empresa_id as id from broker.nota_interna`)
    case 'informe': return ordenar(await tx`select id from broker.informe`)
  }
}

async function insertarNota(tx: Tx, empresaId: string, autorId: string): Promise<boolean> {
  try {
    await tx.savepoint(async (sp) => {
      await sp`insert into broker.nota_interna (empresa_id, autor_id, texto) values (${empresaId}, ${autorId}, 'nota de prueba')`
    })
    return true
  } catch (error) {
    if (esRls(error)) return false
    throw error
  }
}

async function actualizarAprobacion(tx: Tx, informeId: string, aprobador: string): Promise<boolean> {
  try {
    const filas = await tx.savepoint(async (sp) =>
      sp`update broker.informe set estado = 'APROBADO', aprobado_por = ${aprobador} where id = ${informeId} returning id`)
    return filas.length === 1
  } catch (error) {
    if (esRls(error)) return false
    throw error
  }
}

// ── Predicados en la aplicación (mecanismo APLICACION) ─────────────────────────────

interface Principal { readonly id: string; readonly tipo: 'INTERNO' | 'CONTACTO'; readonly rol: string | null }

async function principal(tx: Tx, ctx: Contexto): Promise<Principal | null> {
  if (ctx.usuario === undefined) return null
  const [p] = await tx<Principal[]>`select id, tipo, rol from broker.usuario where id = ${ctx.usuario} and estado = 'ACTIVO'`
  return p ?? null
}

const instante = (ctx: Contexto): string => ctx.instante ?? new Date().toISOString()

async function empresasAsignadas(tx: Tx, p: Principal, t: string): Promise<string[]> {
  if (p.rol !== 'OPERADOR' && p.rol !== 'REVISOR') return []
  return (await tx<{ id: string }[]>`select empresa_id as id from broker.asignacion
    where usuario_id = ${p.id} and tstzrange(desde, coalesce(hasta, 'infinity')) @> ${t}::timestamptz`).map((f) => f.id)
}

async function empresaPortal(tx: Tx, p: Principal, t: string): Promise<string | null> {
  if (p.tipo !== 'CONTACTO') return null
  const [f] = await tx<{ id: string }[]>`select empresa_id as id from broker.acceso_portal
    where usuario_id = ${p.id} and tstzrange(desde, coalesce(hasta, 'infinity')) @> ${t}::timestamptz`
  return f?.id ?? null
}

async function leerAplicacion(tx: Tx, ctx: Contexto, recurso: Recurso): Promise<string[]> {
  const p = await principal(tx, ctx)
  if (p === null) return []
  const t = instante(ctx)
  const admin = p.rol === 'ADMINISTRADOR'
  const asignadas = await empresasAsignadas(tx, p, t)
  const operadas = p.rol === 'OPERADOR' ? asignadas : []
  const portal = await empresaPortal(tx, p, t)
  switch (recurso) {
    case 'empresa': {
      const ids = [...asignadas, ...(portal === null ? [] : [portal])]
      return ordenar(admin ? await tx`select id from broker.empresa` : await tx`select id from broker.empresa where id = any(${ids}::uuid[])`)
    }
    case 'poliza':
      return ordenar(admin ? await tx`select id from broker.poliza` : await tx`select id from broker.poliza where empresa_id = any(${operadas}::uuid[])`)
    case 'nota_interna':
      return ordenar(admin
        ? await tx`select empresa_id as id from broker.nota_interna`
        : await tx`select empresa_id as id from broker.nota_interna where empresa_id = any(${operadas}::uuid[])`)
    case 'informe':
      return ordenar(admin
        ? await tx`select id from broker.informe`
        : await tx`select id from broker.informe where empresa_id = any(${operadas}::uuid[])
                     or (estado = 'COMPARTIDO' and empresa_id = ${portal})`)
  }
}

// ── Regla de acción en la aplicación (APLICACION e HIBRIDO) ─────────────────────────
// Función pura: devuelve null si se permite, o la explicación de quién puede (la v25
// muestra esa explicación). Lo que cambia entre mecanismos es de dónde salen los datos.

export interface Actor { readonly id: string; readonly rol: string | null; readonly asignadas: readonly string[] }
interface InformeRef { readonly empresa_id: string; readonly autor_id: string; readonly estado: string }

export function decidirAprobacion(a: Actor | null, inf: InformeRef | undefined, verificarAutor = true): string | null {
  if (a === null) return 'Sin sesión vigente.'
  if (a.rol !== 'ADMINISTRADOR' && a.rol !== 'OPERADOR') return 'Aprueban el Administrador o un Operador con la empresa asignada.'
  if (inf === undefined || inf.estado !== 'BORRADOR') return 'Sólo se aprueba un borrador visible.'
  if (a.rol === 'OPERADOR' && !a.asignadas.includes(inf.empresa_id)) return 'La empresa no está asignada a esta persona.'
  if (verificarAutor && inf.autor_id === a.id) return 'Quien escribe el informe no lo aprueba: lo aprueba otra persona.'
  return null
}

export function decidirNota(a: Actor | null, empresaId: string, autorId: string): boolean {
  if (a === null || autorId !== a.id) return false
  return a.rol === 'ADMINISTRADOR' || (a.rol === 'OPERADOR' && a.asignadas.includes(empresaId))
}

/** APLICACION: la app lee las tablas de permisos con su propio SQL. */
async function actorAplicacion(tx: Tx, ctx: Contexto): Promise<Actor | null> {
  const p = await principal(tx, ctx)
  return p === null ? null : { id: p.id, rol: p.rol, asignadas: await empresasAsignadas(tx, p, instante(ctx)) }
}

/** HIBRIDO: la app pregunta a las mismas funciones que usan las políticas RLS. */
async function actorHibrido(tx: Tx): Promise<Actor | null> {
  const [f] = await tx<{ id: string | null; rol: string | null; asignadas: string[] | null }[]>`
    select authz.usuario() as id, authz.rol() as rol,
           (select array_agg(x) from authz.empresas_asignadas() x) as asignadas`
  return f?.id == null ? null : { id: f.id, rol: f.rol, asignadas: f.asignadas ?? [] }
}

const informe = async (tx: Tx, id: string): Promise<InformeRef | undefined> =>
  (await tx<InformeRef[]>`select empresa_id, autor_id, estado from broker.informe where id = ${id}`)[0]

// ── Fábricas ───────────────────────────────────────────────────────────────────────

export function rls(sql: Sql = conectar('app')): Mecanismo {
  return {
    nombre: 'RLS',
    leer: (ctx, r) => enContexto(sql, ctx, (tx) => leerSinFiltro(tx, r)),
    escribirNota: (ctx, e, a) => probarYDeshacer(sql, ctx, (tx) => insertarNota(tx, e, a)),
    aprobarInforme: (ctx, i) => probarYDeshacer(sql, ctx, (tx) => actualizarAprobacion(tx, i, ctx.usuario ?? '00000000-0000-0000-0000-000000000000')),
    cerrar: () => sql.end(),
  }
}

export function aplicacion(sql: Sql = conectar('plain')): Mecanismo {
  return {
    nombre: 'APLICACION',
    leer: (ctx, r) => enContexto(sql, ctx, (tx) => leerAplicacion(tx, ctx, r)),
    escribirNota: (ctx, e, a) => probarYDeshacer(sql, ctx, async (tx) =>
      decidirNota(await actorAplicacion(tx, ctx), e, a) && insertarNota(tx, e, a)),
    aprobarInforme: (ctx, i) => probarYDeshacer(sql, ctx, async (tx) =>
      decidirAprobacion(await actorAplicacion(tx, ctx), await informe(tx, i)) === null && actualizarAprobacion(tx, i, ctx.usuario ?? '')),
    cerrar: () => sql.end(),
  }
}

/** Híbrido: una sola conexión, la de RLS. La app decide la acción; RLS, las filas. */
export function hibrido(sql: Sql = conectar('app')): Mecanismo {
  return {
    nombre: 'HIBRIDO',
    leer: (ctx, r) => enContexto(sql, ctx, async (tx) => {
      // Gate de acción en la app: el revisor no consulta pólizas ni notas, y la UI lo explica.
      const actor = await actorHibrido(tx)
      if (actor?.rol === 'REVISOR' && (r === 'poliza' || r === 'nota_interna')) return []
      return leerSinFiltro(tx, r)
    }),
    escribirNota: (ctx, e, a) => probarYDeshacer(sql, ctx, async (tx) =>
      decidirNota(await actorHibrido(tx), e, a) && insertarNota(tx, e, a)),
    aprobarInforme: (ctx, i) => probarYDeshacer(sql, ctx, async (tx) =>
      decidirAprobacion(await actorHibrido(tx), await informe(tx, i)) === null && actualizarAprobacion(tx, i, ctx.usuario ?? '')),
    cerrar: () => sql.end(),
  }
}

/**
 * La misma app con un defecto: olvida la regla de autor. `sql` decide qué red queda:
 * con la conexión RLS (_app) la política lo frena; con _plain, no.
 */
export function aprobarConDefecto(sql: Sql, ctx: Contexto, informeId: string, conPermisosDe: 'rls' | 'plain'): Promise<boolean> {
  return probarYDeshacer(sql, ctx, async (tx) => {
    const actor = conPermisosDe === 'rls' ? await actorHibrido(tx) : await actorAplicacion(tx, ctx)
    return decidirAprobacion(actor, await informe(tx, informeId), false) === null
      && actualizarAprobacion(tx, informeId, ctx.usuario ?? '')
  })
}

export { leerSinFiltro }
