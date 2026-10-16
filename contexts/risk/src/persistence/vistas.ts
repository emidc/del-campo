// Lo que las vistas de T-0030 leen del esquema `risk`: lo registrado de una organización, en la
// forma de `src/domain/organizacion.ts`. Sólo lectura: no calcula nada (los derivados salen de
// `src/domain/`) y no escribe nada.

import type { Nivel, Uncertainty } from '../domain/metodologia.ts'
import type { TipoObjeto } from '../domain/modelo.ts'
import {
  FACTORES,
  type AccionRegistrada, type CoberturaRegistrada, type DatosOrganizacion, type EstadoAccionRegistrado, type EvaluacionRegistrada,
  type EventoRegistrado, type FactorRegistrado, type NombreFactor, type NovedadRegistrada, type RevisionPendienteRegistrada,
  type RevisionRegistrada, type RiesgoRegistrado,
} from '../domain/organizacion.ts'
import type { Sql, TransactionSql } from './database.ts'

type Db = Sql | TransactionSql
type Fila = Record<string, unknown>

// Las columnas de texto llegan como `string`; las numéricas se leen con `::text`.
const texto = (v: unknown): string | null => (v === null || v === undefined ? null : typeof v === 'string' ? v : JSON.stringify(v))
const nivel = (v: unknown): Nivel | null => (v === null || v === undefined ? null : (Number(v) as Nivel))
const lista = (v: unknown): string[] | null => (Array.isArray(v) ? v.map(String) : null)
const instante = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v))
const origen = (v: unknown): 'importacion' | 'sesion' => (v === 'sesion' ? 'sesion' : 'importacion')
const procedencia = (f: Fila) => ({ actor: String(f.actor), base: String(f.base), evidencia: lista(f.evidencia) ?? [] })

export interface Organizacion {
  readonly organizacionId: string
  readonly objetos: Readonly<Record<TipoObjeto, number>>
  /** Los prefijos de `id_origen` de sus riesgos (`S05`, `H1`), si los tienen: ayudan a reconocerla. */
  readonly referencias: readonly string[]
}

/** Las organizaciones con riesgos registrados. Sólo cuenta objetos: ningún derivado (RO01 §3, regla 2). */
export const leerOrganizaciones = async (db: Db): Promise<Organizacion[]> => {
  const filas = await db<{ organizacion_id: string; tipo_objeto: TipoObjeto; n: number; referencias: string[] | null }[]>`
    select organizacion_id, tipo_objeto, count(*)::int as n,
           array_agg(distinct split_part(id_origen, '-', 1)) filter (where id_origen like '%-%') as referencias
    from risk.riesgo group by organizacion_id, tipo_objeto order by organizacion_id, tipo_objeto`
  const porOrg = new Map<string, { objetos: Record<TipoObjeto, number>; referencias: Set<string> }>()
  for (const f of filas) {
    const o = porOrg.get(f.organizacion_id) ?? { objetos: { riesgo: 0, padre: 0, sub_riesgo: 0, escenario: 0 }, referencias: new Set<string>() }
    o.objetos[f.tipo_objeto] = f.n
    for (const r of f.referencias ?? []) o.referencias.add(r)
    porOrg.set(f.organizacion_id, o)
  }
  return [...porOrg].map(([organizacionId, o]) => ({ organizacionId, objetos: o.objetos, referencias: [...o.referencias].sort() }))
}

/** La organización de un riesgo, o `null` si no existe. */
export const organizacionDeRiesgo = async (db: Db, riskId: string): Promise<string | null> => {
  const [f] = await db<{ organizacion_id: string }[]>`select organizacion_id from risk.riesgo where id = ${riskId}`
  return f?.organizacion_id ?? null
}

// Revisiones humanas: el revisor es el nombre de la persona de la sesión o el texto del CSV.
const revisionesDe = async (db: Db, columna: 'evaluacion_id' | 'accion_id' | 'transferencia_id', ids: readonly string[]): Promise<Map<string, RevisionRegistrada[]>> => {
  const porId = new Map<string, RevisionRegistrada[]>()
  if (ids.length === 0) return porId
  const filas = await db<Fila[]>`
    select h.${db(columna)} as objeto, h.estado, h.revisado_por_actor, coalesce(p.nombre, h.revisado_por_origen) as revisor,
           h.fecha_revision::text as fecha, h.origen, h.registrada_en
    from risk.revision_humana h left join risk.persona p on p.id = h.revisor_persona_id
    where h.${db(columna)} in ${db(ids as string[])} order by h.id`
  for (const f of filas) {
    const id = String(f.objeto)
    const r: RevisionRegistrada = {
      estado: f.estado as RevisionRegistrada['estado'], actor: f.revisado_por_actor === 'ai' ? 'ai' : 'human', revisor: String(f.revisor),
      fecha: String(f.fecha), origen: origen(f.origen), registradaEn: instante(f.registrada_en),
    }
    porId.set(id, [...(porId.get(id) ?? []), r])
  }
  return porId
}

function factorDe(f: Fila, x: NombreFactor): FactorRegistrado {
  return {
    estado: f[`${x}_estado`] as FactorRegistrado['estado'],
    valor: nivel(f[`${x}_valor`]),
    min: nivel(f[`${x}_min`]),
    max: nivel(f[`${x}_max`]),
    observacion: texto(f[`${x}_observacion`]),
    base: texto(f[`${x}_base`]),
    evidencia: lista(f[`${x}_evidencia`]),
  }
}

/** Todo lo registrado de una organización, o `null` si no tiene riesgos. */
export const leerOrganizacion = async (db: Db, organizacionId: string): Promise<DatosOrganizacion | null> => {
  const riesgosF = await db<Fila[]>`
    select r.id, r.organizacion_id, r.unidad_id, r.tipo_objeto, r.riesgo_padre_id, r.titulo, r.consecuencia_comun, r.id_origen, r.lote_origen,
           (select array_agg(m.miembro_id::text order by m.miembro_id) from risk.miembro_escenario m where m.escenario_id = r.id) as miembros
    from risk.riesgo r where r.organizacion_id = ${organizacionId} order by r.id`
  if (riesgosF.length === 0) return null
  const ids = riesgosF.map((r) => String(r.id))

  const riesgos = riesgosF.map((r): RiesgoRegistrado => ({
    id: String(r.id), organizacionId: String(r.organizacion_id), unidadId: texto(r.unidad_id), tipoObjeto: r.tipo_objeto as TipoObjeto,
    riesgoPadreId: texto(r.riesgo_padre_id), miembros: lista(r.miembros) ?? [], titulo: String(r.titulo),
    consecuenciaComun: texto(r.consecuencia_comun), idOrigen: texto(r.id_origen), loteOrigen: texto(r.lote_origen),
  }))

  const evaluacionesF = await db<Fila[]>`
    select e.*, e.fecha::text as fecha, e.i_econ_monto_bruto::text as i_econ_monto_bruto, coalesce(p.nombre, e.evaluador) as evaluador_nombre
    from risk.evaluacion e left join risk.persona p on p.id = e.autor_persona_id
    where e.risk_id in ${db(ids)} order by e.id`
  const revEval = await revisionesDe(db, 'evaluacion_id', evaluacionesF.map((e) => String(e.id)))
  const evaluaciones = evaluacionesF.map((e): EvaluacionRegistrada => ({
    id: String(e.id), riskId: String(e.risk_id), tipo: e.tipo_evaluacion === 'inicial' ? 'inicial' : 'reevaluacion',
    anteriorId: texto(e.evaluacion_anterior_id), motivo: texto(e.motivo), accionId: texto(e.accion_id), fecha: String(e.fecha),
    versionMetodologia: String(e.version_metodologia), evaluador: String(e.evaluador_nombre), procedencia: procedencia(e),
    riesgoCausa: texto(e.riesgo_causa), riesgoEvento: String(e.riesgo_evento), riesgoConsecuencia: texto(e.riesgo_consecuencia),
    factores: Object.fromEntries(FACTORES.map((x) => [x, factorDe(e, x)])) as Record<NombreFactor, FactorRegistrado>,
    montoBruto: texto(e.i_econ_monto_bruto), moneda: texto(e.moneda), uncertainty: e.uncertainty as Uncertainty,
    uncertaintyNota: texto(e.uncertainty_nota), necesidadValidacion: texto(e.necesidad_validacion),
    motivoNoEvaluable: texto(e.motivo_no_evaluable), justificacion: texto(e.justificacion), reglasAplicadas: lista(e.reglas_aplicadas),
    idOrigen: texto(e.id_origen), origen: origen(e.origen), registradaEn: instante(e.registrada_en), revisiones: revEval.get(String(e.id)) ?? [],
  }))

  const accionesF = await db<Fila[]>`
    select a.*, a.fecha_alta::text as fecha_alta, a.fecha_proxima_revision::text as fecha_proxima_revision
    from risk.accion a where a.risk_id in ${db(ids)} order by a.id`
  const accionIds = accionesF.map((a) => String(a.id))
  const estadosF = accionIds.length === 0 ? [] : await db<Fila[]>`
    select s.*, s.fecha_cumplida::text as fecha_cumplida, p.nombre as autor
    from risk.accion_estado s left join risk.persona p on p.id = s.autor_persona_id
    where s.accion_id in ${db(accionIds)} order by s.id`
  const revAcc = await revisionesDe(db, 'accion_id', accionIds)
  const acciones = accionesF.map((a): AccionRegistrada => ({
    id: String(a.id), riskId: String(a.risk_id), tipoRegistro: a.tipo_registro === 'accion' ? 'accion' : 'decision_tratamiento',
    descripcion: String(a.descripcion), factorObjetivo: lista(a.factor_objetivo), mecanismoCausal: texto(a.mecanismo_causal),
    cambioEsperado: texto(a.cambio_esperado), decision: texto(a.decision), fundamento: texto(a.fundamento),
    fechaProximaRevision: texto(a.fecha_proxima_revision), fechaAlta: String(a.fecha_alta), procedencia: procedencia(a),
    idOrigen: texto(a.id_origen), origen: origen(a.origen), registradaEn: instante(a.registrada_en),
    estados: estadosF.filter((s) => s.accion_id === a.id).map((s): EstadoAccionRegistrado => ({
      estado: s.estado as EstadoAccionRegistrado['estado'], fechaCumplida: texto(s.fecha_cumplida), evidenciaEjecucion: lista(s.evidencia_ejecucion),
      efecto: texto(s.efecto), efectoNota: texto(s.efecto_nota), evaluacionEfectoId: texto(s.evaluacion_efecto_id), origen: origen(s.origen),
      autor: texto(s.autor), registradoEn: instante(s.registrado_en),
    })),
    revisiones: revAcc.get(String(a.id)) ?? [],
  }))

  const coberturasF = await db<Fila[]>`
    select t.*, t.vigencia_desde::text as vigencia_desde, t.vigencia_hasta::text as vigencia_hasta,
           t.limite_monto::text as limite_monto, t.sublimite_aplicable_monto::text as sublimite_aplicable_monto,
           t.deducible_monto::text as deducible_monto, t.exposicion_retenida_monto::text as exposicion_retenida_monto
    from risk.transferencia t where t.risk_id in ${db(ids)} order by t.id`
  const coberturaIds = coberturasF.map((t) => String(t.id))
  const eventosF = coberturaIds.length === 0 ? [] : await db<Fila[]>`
    select v.*, v.fecha_evento::text as fecha_evento, v.monto_evento::text as monto_evento
    from risk.evento_poliza v where v.transferencia_ref in ${db(coberturaIds)} order by v.fecha_evento, v.id`
  const revTrf = await revisionesDe(db, 'transferencia_id', coberturaIds)
  const coberturas = coberturasF.map((t): CoberturaRegistrada => ({
    id: String(t.id), riskId: String(t.risk_id), polizaRef: String(t.poliza_ref), cobertura: String(t.cobertura),
    vigenciaDesde: String(t.vigencia_desde), vigenciaHasta: String(t.vigencia_hasta), limite: texto(t.limite_monto),
    sublimite: texto(t.sublimite_aplicable_monto), sublimitesTexto: texto(t.sublimites_texto), deducible: texto(t.deducible_monto),
    deducibleTexto: texto(t.deducible_texto), exclusiones: texto(t.exclusiones), exposicionRetenida: texto(t.exposicion_retenida_monto),
    exposicionRetenidaNota: texto(t.exposicion_retenida_nota), suficiencia: String(t.suficiencia), suficienciaNota: texto(t.suficiencia_nota),
    moneda: texto(t.moneda), procedencia: procedencia(t), uncertainty: t.uncertainty as Uncertainty, uncertaintyNota: texto(t.uncertainty_nota),
    idOrigen: texto(t.id_origen), origen: origen(t.origen), registradaEn: instante(t.registrada_en),
    eventos: eventosF.filter((v) => v.transferencia_ref === t.id).map((v): EventoRegistrado => ({
      id: String(v.id), riskId: String(v.risk_id), transferenciaId: String(v.transferencia_ref), tipo: String(v.tipo_evento),
      fecha: String(v.fecha_evento), monto: texto(v.monto_evento), moneda: texto(v.moneda), nota: texto(v.nota_evento),
      procedencia: procedencia(v), idOrigen: texto(v.id_origen), origen: origen(v.origen), registradoEn: instante(v.registrado_en),
    })),
    revisiones: revTrf.get(String(t.id)) ?? [],
  }))

  const novedadesF = await db<Fila[]>`
    select n.*, p.nombre as autor from risk.novedad n join risk.persona p on p.id = n.autor_persona_id
    where n.risk_id in ${db(ids)} order by n.registrada_en, n.id`
  const novedades = novedadesF.map((n): NovedadRegistrada => ({
    id: String(n.id), riskId: String(n.risk_id), accionId: texto(n.accion_id), transferenciaId: texto(n.transferencia_id),
    tipo: n.tipo as NovedadRegistrada['tipo'], texto: String(n.texto), evidencia: lista(n.evidencia) ?? [], autor: String(n.autor),
    registradaEn: instante(n.registrada_en),
  }))

  const pendientesF = await db<Fila[]>`
    select r.*, a.nombre as autor, c.resultado, c.evaluacion_id as cierre_evaluacion_id, c.fundamento as cierre_fundamento,
           pc.nombre as cerrada_por, c.cerrada_en
    from risk.revision_pendiente r
    left join risk.persona a on a.id = r.autor_persona_id
    left join risk.cierre_revision c on c.revision_id = r.id
    left join risk.persona pc on pc.id = c.cerrada_por
    where r.risk_id in ${db(ids)} order by r.abierta_en, r.id`
  const revisionesPendientes = pendientesF.map((r): RevisionPendienteRegistrada => ({
    id: String(r.id), riskId: String(r.risk_id), disparador: String(r.disparador), accionId: texto(r.accion_id), novedadId: texto(r.novedad_id),
    versionMetodologia: texto(r.version_metodologia), origen: origen(r.origen), autor: texto(r.autor), abiertaEn: instante(r.abierta_en),
    cierre: r.resultado === null || r.resultado === undefined ? null : {
      resultado: r.resultado as 'reevaluacion_aceptada' | 'sin_cambio', evaluacionId: texto(r.cierre_evaluacion_id),
      fundamento: texto(r.cierre_fundamento), cerradaPor: String(r.cerrada_por), cerradaEn: instante(r.cerrada_en),
    },
  }))

  return { organizacionId, riesgos, evaluaciones, acciones, coberturas, novedades, revisionesPendientes }
}
