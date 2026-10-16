// Lo que la actualización (T-0031) escribe en el esquema `risk`. No decide nada: los casos de uso
// de `src/application/actualizacion.ts` leen lo registrado, aplican las reglas de
// `src/domain/actualizacion.ts` y llaman a estas funciones dentro de una sola transacción.
//
// Todo es INSERT: no hay ninguna sentencia UPDATE ni DELETE en este archivo (R-22, R-23), y la
// base las rechazaría igual (`risk.solo_insercion()`).

import type { RevisionParaContar } from '../domain/ciclos.ts'
import type { Sql, TransactionSql } from './database.ts'

type Db = Sql | TransactionSql

// Sin sentencias preparadas (`prepare: false`), postgres.js no sabe el tipo de una lista: va como text[].
const TEXT = 25

/** Un valor de columna; un objeto va como `jsonb`. */
type Valor = string | number | boolean | null | readonly string[] | Readonly<Record<string, unknown>>
export type FilaNueva = Readonly<Record<string, Valor>>

/**
 * Serializa las escrituras sobre una organización: entre leer lo registrado y escribir no entra
 * otra actualización de la misma empresa. Se suelta al terminar la transacción.
 */
export const bloquearOrganizacion = async (tx: TransactionSql, organizacionId: string): Promise<void> => {
  await tx`select pg_advisory_xact_lock(hashtext('risk.actualizacion'), hashtext(${organizacionId}))`
}

/**
 * La hora de la base en este momento, no la del inicio de la transacción: dentro de una misma
 * operación, cada fila queda con su instante y el historial las ordena como ocurrieron.
 */
export const ahora = async (tx: TransactionSql): Promise<string> => {
  const [f] = await tx<{ t: string }[]>`select clock_timestamp()::text as t`
  if (f === undefined) throw new Error('la base no devolvió la hora')
  return f.t
}

/** La fecha de hoy en la base (AAAA-MM-DD). */
export const hoy = async (tx: TransactionSql): Promise<string> => {
  const [f] = await tx<{ d: string }[]>`select current_date::text as d`
  if (f === undefined) throw new Error('la base no devolvió la fecha')
  return f.d
}

const TABLAS = [
  'novedad', 'accion', 'accion_estado', 'evaluacion', 'revision_humana', 'revision_pendiente', 'cierre_revision',
  'transferencia', 'evento_poliza', 'reordenamiento', 'reordenamiento_vigente', 'orden_previo', 'orden_previo_item',
] as const
export type TablaActualizacion = (typeof TABLAS)[number]

/** Inserta una fila. Las listas van como text[] y los objetos como jsonb; los `null` quedan fuera y toman el default de la columna. */
export const insertar = async (tx: TransactionSql, tabla: TablaActualizacion, fila: FilaNueva): Promise<void> => {
  if (!TABLAS.includes(tabla)) throw new Error(`risk.${tabla} no es una tabla de la actualización`)
  const parametros = Object.fromEntries(
    Object.entries(fila)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => [k, Array.isArray(v) ? tx.array(v as string[], TEXT) : typeof v === 'object' && v !== null ? tx.json(v as never) : v]),
  ) as Record<string, never>
  await tx`insert into ${tx(`risk.${tabla}`)} ${tx(parametros)}`
}

/** La organización de un riesgo, su tipo y si existe. */
export const riesgo = async (tx: Db, riskId: string): Promise<{ organizacionId: string; tipoObjeto: string } | null> => {
  const [f] = await tx<{ organizacion_id: string; tipo_objeto: string }[]>`select organizacion_id, tipo_objeto from risk.riesgo where id = ${riskId}`
  return f === undefined ? null : { organizacionId: f.organizacion_id, tipoObjeto: f.tipo_objeto }
}

/** El riesgo de una acción, una cobertura, una evaluación o una revisión pendiente. */
export const riesgoDe = async (
  tx: Db, tabla: 'accion' | 'transferencia' | 'evaluacion' | 'revision_pendiente', id: string,
): Promise<string | null> => {
  const [f] = await tx<{ risk_id: string }[]>`select risk_id from ${tx(`risk.${tabla}`)} where id = ${id}`
  return f?.risk_id ?? null
}

/** Si la persona ya accedió a una vista con resultados de esa organización (decisión 6; A8a). */
export const vioResultados = async (tx: Db, personaId: string, organizacionId: string): Promise<boolean> => {
  const [f] = await tx<{ n: number }[]>`
    select count(*)::int as n from risk.registro_acceso
    where persona_id = ${personaId} and organizacion_id = ${organizacionId} and tipo = 'vista_resultados'`
  return (f?.n ?? 0) > 0
}

/** El orden previo de la persona para esa organización, si lo registró. */
export const ordenPrevioDe = async (tx: Db, personaId: string, organizacionId: string): Promise<string | null> => {
  const [f] = await tx<{ id: string }[]>`
    select id from risk.orden_previo where revisor_persona_id = ${personaId} and organizacion_id = ${organizacionId}`
  return f?.id ?? null
}

/** Todas las revisiones pendientes con su cierre, para el conteo de A7. Sin textos ni nombres (R-19). */
export const revisionesParaContar = async (db: Db): Promise<RevisionParaContar[]> => {
  const filas = await db<{
    id: string; organizacion_id: string; disparador: string; referencia: string | null; origen: string; abierta_en: Date
    resultado: string | null; evaluacion_id: string | null; cerrada_por: string | null; cerrada_en: Date | null
  }[]>`
    select r.id, g.organizacion_id, r.disparador, coalesce(r.accion_id, r.novedad_id, r.version_metodologia) as referencia, r.origen,
           r.abierta_en, c.resultado, c.evaluacion_id, c.cerrada_por, c.cerrada_en
    from risk.revision_pendiente r
    join risk.riesgo g on g.id = r.risk_id
    left join risk.cierre_revision c on c.revision_id = r.id
    order by r.abierta_en, r.id`
  return filas.map((f): RevisionParaContar => ({
    id: f.id, organizacionId: f.organizacion_id, disparador: f.disparador, referencia: f.referencia,
    origen: f.origen === 'sesion' ? 'sesion' : 'importacion', abiertaEn: f.abierta_en.toISOString(),
    cierre: f.resultado === null || f.cerrada_en === null ? null : {
      resultado: f.resultado === 'sin_cambio' ? 'sin_cambio' : 'reevaluacion_aceptada',
      evaluacionId: f.evaluacion_id, cerradaPor: f.cerrada_por ?? '', cerradaEn: f.cerrada_en.toISOString(),
    },
  }))
}
