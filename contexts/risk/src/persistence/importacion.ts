// Lo que la importación (T-0029) lee y escribe en el esquema `risk`. No decide nada: el caso de
// uso (`src/application/importar.ts`) valida, arma las filas con `s../domain/` y
// llama a estas funciones dentro de una sola transacción.

import type { Dimension, Factor, Factores, Nivel, Recuperacion, Uncertainty } from '../domain/metodologia.ts'
import type { Evaluacion, ReviewStatus, Riesgo, TipoObjeto } from '../domain/modelo.ts'
import { TABLAS_IMPORTACION, type FilaDb, type FilasParaEscribir, type TablaImportacion } from '../domain/importacion.ts'
import type { LoteRegistrado } from '../domain/informe.ts'
import {
  COLUMNAS_IDENTIDAD, origenClave,
  type AccionExistente, type EvaluacionExistente, type Existentes, type RiesgoExistente,
} from '../domain/validador.ts'
import type { Sql, TransactionSql } from './database.ts'

type Db = Sql | TransactionSql

// Sin sentencias preparadas (`prepare: false`), postgres.js no sabe el tipo de una lista: va como text[].
const TEXT = 25

/**
 * Serializa las importaciones: entre leer lo existente y escribir el lote no entra otro. Se
 * suelta al terminar la transacción.
 */
export const bloquearImportaciones = async (tx: TransactionSql): Promise<void> => {
  await tx`select pg_advisory_xact_lock(hashtext('risk.lote_importacion'))`
}

interface FilaLote {
  id: string
  huella: string
  origen: string
  importado_por: string
  importado_en: Date
  fecha_corte: string
  escritas: Record<string, number>
}

/** El lote ya importado con esa huella, o `null`. */
export const buscarLote = async (db: Db, huella: string): Promise<LoteRegistrado | null> => {
  const [f] = await db<FilaLote[]>`
    select id::text, huella, origen, importado_por, importado_en, fecha_corte::text, escritas
    from risk.lote_importacion where huella = ${huella}`
  if (f === undefined) return null
  return {
    id: Number(f.id), huella: f.huella, origen: f.origen, importadoPor: f.importado_por,
    importadoEn: f.importado_en, fechaCorte: f.fecha_corte, escritas: f.escritas,
  }
}

/** Lo que ya existe en Risk OS, en la forma que el validador usa para resolver referencias. */
export const leerExistentes = async (db: Db): Promise<Existentes> => {
  const riesgos = await db<{ id: string; organizacion_id: string; unidad_id: string | null; tipo_objeto: string; riesgo_padre_id: string | null; titulo: string; miembros: string[] | null }[]>`
    select r.id, r.organizacion_id, r.unidad_id, r.tipo_objeto, r.riesgo_padre_id, r.titulo,
           (select array_agg(m.miembro_id::text order by m.miembro_id) from risk.miembro_escenario m where m.escenario_id = r.id) as miembros
    from risk.riesgo r`
  const evaluaciones = await db<{ id: string; risk_id: string; tipo_evaluacion: string; fecha: string; motivo: string | null; accion_id: string | null; sucesora: string | null }[]>`
    select e.id, e.risk_id, e.tipo_evaluacion, e.fecha::text as fecha, e.motivo, e.accion_id,
           (select s.id from risk.evaluacion s where s.evaluacion_anterior_id = e.id) as sucesora
    from risk.evaluacion e`
  const acciones = await db<{ id: string; risk_id: string; tipo_registro: string; estado: string | null }[]>`
    select a.id, a.risk_id, a.tipo_registro,
           (select s.estado from risk.accion_estado s where s.accion_id = a.id order by s.id desc limit 1) as estado
    from risk.accion a`
  const coberturas = await db<{ id: string; risk_id: string }[]>`select id, risk_id from risk.transferencia`
  const eventos = await db<{ id: string }[]>`select id from risk.evento_poliza`
  const origenes = await db<{ espacio: 'riesgo' | 'evaluacion' | 'accion' | 'transferencia'; lote: string; id_origen: string; entidad: string }[]>`
    select 'riesgo' as espacio, lote_origen as lote, id_origen, 'riesgo ' || id as entidad from risk.riesgo where id_origen is not null
    union all select 'evaluacion', lote_origen, id_origen, 'evaluación ' || id from risk.evaluacion where id_origen is not null
    union all select 'accion', lote_origen, id_origen, id from risk.accion where id_origen is not null
    union all select 'transferencia', lote_origen, id_origen, id from risk.transferencia where id_origen is not null
    union all select 'transferencia', lote_origen, id_origen, id from risk.evento_poliza where id_origen is not null`

  return {
    ids: new Set([...evaluaciones, ...acciones, ...coberturas, ...eventos].map((f) => f.id)),
    riesgos: new Map(riesgos.map((r): [string, RiesgoExistente] => {
      const identidad = {
        organizacion_id: r.organizacion_id,
        unidad_id: r.unidad_id ?? '',
        tipo_objeto: r.tipo_objeto,
        riesgo_padre_id: r.riesgo_padre_id ?? '',
        // El orden de la lista no se guarda: va ordenada y RV-RSK-01 la compara como conjunto.
        miembros: (r.miembros ?? []).join(';'),
        titulo: r.titulo,
      } satisfies Record<(typeof COLUMNAS_IDENTIDAD)[number], string>
      return [r.id, { tipo_objeto: r.tipo_objeto, organizacion_id: r.organizacion_id, identidad }]
    })),
    evaluaciones: new Map(evaluaciones.map((e): [string, EvaluacionExistente] => [e.id, {
      risk_id: e.risk_id, tipo_evaluacion: e.tipo_evaluacion, fecha: e.fecha, motivo: e.motivo ?? '',
      accion_id: e.accion_id ?? '', sucesora: e.sucesora ?? '',
    }])),
    acciones: new Map(acciones.map((a): [string, AccionExistente] => [a.id, {
      risk_id: a.risk_id, tipo_registro: a.tipo_registro, estado: a.estado ?? '',
    }])),
    coberturas: new Map(coberturas.map((c) => [c.id, { risk_id: c.risk_id }])),
    origenes: new Map(origenes.map((o) => [origenClave(o.espacio, o.lote, o.id_origen), o.entidad])),
  }
}

const aParametros = (tx: TransactionSql, f: FilaDb): Record<string, never> =>
  Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Array.isArray(v) ? tx.array(v as string[], TEXT) : v])) as Record<string, never>

/**
 * Escribe las filas en el orden de `TABLAS_IMPORTACION` y devuelve cuántas por tabla. Las
 * evaluaciones van de a una: el trigger `evaluacion_anterior_registrada` exige que la anterior
 * ya esté escrita. Si algo falla, el error sube y la transacción del llamador se revierte.
 */
export const escribirFilas = async (tx: TransactionSql, filas: FilasParaEscribir): Promise<Record<TablaImportacion, number>> => {
  const escritas = {} as Record<TablaImportacion, number>
  for (const tabla of TABLAS_IMPORTACION) {
    const deTabla = filas[tabla]
    if (tabla === 'evaluacion') {
      for (const f of deTabla) await tx`insert into risk.evaluacion ${tx(aParametros(tx, f))}`
    } else {
      for (let i = 0; i < deTabla.length; i += 200) {
        const tramo = deTabla.slice(i, i + 200).map((f) => aParametros(tx, f))
        await tx`insert into ${tx(`risk.${tabla}`)} ${tx(tramo)}`
      }
    }
    escritas[tabla] = deTabla.length
  }
  return escritas
}

export interface RegistroDeLote {
  readonly huella: string
  readonly huellas: Readonly<Record<'risks' | 'action_plan' | 'risk_transfer', string>>
  readonly origen: string
  readonly importadoPor: string
  readonly fechaCorte: string
  readonly filas: Readonly<Record<'risks' | 'action_plan' | 'risk_transfer', number>>
  readonly avisos: number
  readonly escritas: Readonly<Record<string, number>>
}

/** Registra el lote. Va al final de la transacción: si está, el lote entero está. */
export const registrarLote = async (tx: TransactionSql, r: RegistroDeLote): Promise<number> => {
  const [f] = await tx<{ id: string }[]>`
    insert into risk.lote_importacion ${tx({
      huella: r.huella,
      huella_risks: r.huellas.risks,
      huella_action_plan: r.huellas.action_plan,
      huella_risk_transfer: r.huellas.risk_transfer,
      origen: r.origen,
      importado_por: r.importadoPor,
      fecha_corte: r.fechaCorte,
      filas_risks: r.filas.risks,
      filas_action_plan: r.filas.action_plan,
      filas_risk_transfer: r.filas.risk_transfer,
      avisos: r.avisos,
      escritas: tx.json(r.escritas),
    })}
    returning id::text`
  return Number(f?.id)
}

/** Filas por tabla del esquema `risk`, sin el ledger de migraciones. */
export const contarFilas = async (db: Db): Promise<Record<string, number>> => {
  const tablas = await db<{ t: string }[]>`
    select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'risk' and c.relkind = 'r' and c.relname <> 'schema_migrations' order by c.relname`
  const conteos: Record<string, number> = {}
  for (const { t } of tablas) {
    const [f] = await db<{ n: number }[]>`select count(*)::int as n from ${db(`risk.${t}`)}`
    conteos[t] = f?.n ?? 0
  }
  return conteos
}

// ── Lectura para calcular ───────────────────────────────────────────────────

/** Riesgos y evaluaciones en la forma de `src/domain/modelo.ts`, con su origen. */
export interface ParaCalculo {
  readonly riesgos: Riesgo[]
  readonly evaluaciones: Evaluacion[]
  /** Por id de riesgo o de evaluación: su `id_origen` y su `lote_origen`. */
  readonly origen: ReadonlyMap<string, { readonly idOrigen: string; readonly loteOrigen: string }>
}

const DIMS: readonly Dimension[] = ['econ', 'pers', 'cont', 'legal']

type FilaEvaluacion = Record<string, string | number | null>

function factor(f: FilaEvaluacion, x: string): Factor<Nivel> {
  const min = f[`${x}_min`]
  const max = f[`${x}_max`]
  return {
    valor: f[`${x}_estado`] === 'known' ? (Number(f[`${x}_valor`]) as Nivel) : 'unknown',
    ...(min === null || min === undefined ? {} : { min: Number(min) as Nivel }),
    ...(max === null || max === undefined ? {} : { max: Number(max) as Nivel }),
  }
}

function factoresDe(f: FilaEvaluacion): Factores {
  const vRec: Factor<Recuperacion> = f.v_rec_estado === 'no_aplica' ? { valor: 'no_aplica' } : factor(f, 'v_rec')
  return {
    p: factor(f, 'p'),
    i: Object.fromEntries(DIMS.map((d) => [d, factor(f, `i_${d}`)])) as Record<Dimension, Factor<Nivel>>,
    vCont: factor(f, 'v_cont'),
    vRec,
  }
}

/**
 * Lo que las funciones v1 necesitan para calcular, leído de la base. El `review_status` de una
 * evaluación es el de su última revisión humana; sin ninguna, `pending` (T-0028).
 */
export const leerParaCalculo = async (db: Db): Promise<ParaCalculo> => {
  const riesgos = await db<{ id: string; organizacion_id: string; tipo_objeto: TipoObjeto; riesgo_padre_id: string | null; id_origen: string | null; lote_origen: string | null; miembros: string[] | null }[]>`
    select r.id, r.organizacion_id, r.tipo_objeto, r.riesgo_padre_id, r.id_origen, r.lote_origen,
           (select array_agg(m.miembro_id::text order by m.miembro_id) from risk.miembro_escenario m where m.escenario_id = r.id) as miembros
    from risk.riesgo r order by r.id`
  const evaluaciones = await db<FilaEvaluacion[]>`
    select e.*, coalesce((select h.estado from risk.revision_humana h where h.evaluacion_id = e.id order by h.id desc limit 1), 'pending') as review_status
    from risk.evaluacion e order by e.id`
  const origen = new Map<string, { idOrigen: string; loteOrigen: string }>()
  for (const r of riesgos) origen.set(r.id, { idOrigen: r.id_origen ?? '', loteOrigen: r.lote_origen ?? '' })
  for (const e of evaluaciones) origen.set(String(e.id), { idOrigen: String(e.id_origen ?? ''), loteOrigen: String(e.lote_origen ?? '') })
  return {
    riesgos: riesgos.map((r) => ({
      id: r.id, organizacionId: r.organizacion_id, tipoObjeto: r.tipo_objeto, riesgoPadreId: r.riesgo_padre_id, miembros: r.miembros ?? [],
    })),
    evaluaciones: evaluaciones.map((e) => ({
      id: String(e.id),
      riskId: String(e.risk_id),
      tipo: e.tipo_evaluacion === 'inicial' ? 'inicial' : 'reevaluacion',
      anteriorId: e.evaluacion_anterior_id === null ? null : String(e.evaluacion_anterior_id),
      factores: factoresDe(e),
      uncertainty: e.uncertainty as Uncertainty,
      reviewStatus: e.review_status as ReviewStatus,
    })),
    origen,
  }
}
