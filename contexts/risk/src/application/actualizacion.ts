// Casos de uso de la actualización de Risk OS (T-0031; RO01 §2 «Actualización», «Revisión
// pendiente», «Revisión humana», «Reordenamiento profesional», «Orden previo» e «Historial»;
// EMI-25 y lo que queda de EMI-26).
//
// Cada caso de uso:
//
//   1. pide la sesión de una persona: es el autor de todo lo que escribe (decisión 2 del owner);
//   2. corre en una sola transacción, con las escrituras de esa organización serializadas, y
//      lee lo registrado después de tomar el bloqueo;
//   3. aplica las reglas de `src/domain/actualizacion.ts` antes de escribir: un pedido que no
//      las cumple termina con `RechazoActualizacion` y sin escribir nada;
//   4. escribe sólo filas nuevas. Una operación compuesta (cumplir una acción y abrir su
//      revisión, registrar una novedad que abre una revisión, cerrar una revisión aceptando su
//      reevaluación, reordenar con su foto) es todo o nada: si una escritura falla, o falla
//      cualquier cosa entre dos escrituras, la transacción se revierte entera (RO01 A5).
//
// `opciones.trasEscribir` se llama después de cada fila escrita con el nombre de la tabla. Lo usan
// los tests para inyectar una falla a mitad de una operación y comprobar que no queda nada.
//
// Nada de este archivo calcula ni escribe un factor: una reevaluación la carga una persona con
// los niveles que ella decidió, y queda `pending` hasta que una persona la acepta (D18).

import {
  abreRevision, ESTADOS_ACCION, ESTADOS_REVISION, evidenciaDeEjecucion, exigirFundamento, exigirRevisor, exigirTexto, fecha, MOTIVOS,
  opcional, porQueNoCambia, porQueNoCierra, rechazar, RechazoActualizacion, referencias, TIPOS_NOVEDAD,
  type Disparador, type EstadoAccion, type EstadoRevisionHumana, type TipoNovedad,
} from '../domain/actualizacion.ts'
import { historia, rankingOrganizacion } from '../domain/lectura.ts'
import { BANDAS, NIVELES } from '../domain/metodologia.ts'
import { VERSION_METODOLOGIA, exigirVersion, type VersionFunciones } from '../domain/modelo.ts'
import {
  aEvaluacion, aRiesgo, FACTORES, reviewStatusDe,
  type DatosOrganizacion, type FactorRegistrado, type NombreFactor, type RiesgoRegistrado,
} from '../domain/organizacion.ts'
import { exigirReordenamiento, fotoOrdenCalculado, type PedidoReordenamiento } from '../domain/reordenamiento.ts'
import {
  ahora, bloquearOrganizacion, hoy, insertar, ordenPrevioDe, riesgo, riesgoDe, vioResultados,
  type FilaNueva, type TablaActualizacion,
} from '../persistence/actualizacion.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { leerOrganizacion } from '../persistence/vistas.ts'
import type { Sesion } from './acceso.ts'
import { ulid } from './personas.ts'

export { RechazoActualizacion }

type Db = Sql | TransactionSql

export interface Opciones {
  /** Se llama después de cada fila escrita, con su tabla. Para los tests de falla inyectada. */
  readonly trasEscribir?: (tabla: TablaActualizacion) => void | Promise<void>
}

const nuevoId = (prefijo: string): string => `${prefijo}-${ulid()}`

const BASES = ['observed', 'reported', 'inferred', 'assumed'] as const
const UNCERTAINTY = ['low', 'medium', 'high'] as const

async function enTransaccion<T>(db: Db, cuerpo: (tx: TransactionSql) => Promise<T>): Promise<T> {
  if ('savepoint' in db) return (await db.savepoint(cuerpo)) as T
  return (await db.begin(cuerpo)) as T
}

/** Lo que tiene a mano una operación: la transacción, lo registrado de la organización y cómo escribir. */
interface Operacion {
  readonly tx: TransactionSql
  readonly d: DatosOrganizacion
  readonly sesion: Sesion
  /** Instante de la base para la fila que se va a escribir. */
  readonly ahora: () => Promise<string>
  readonly escribir: (tabla: TablaActualizacion, fila: FilaNueva) => Promise<void>
}

/**
 * Corre `cuerpo` en una transacción con las escrituras de la organización serializadas. Una
 * restricción de la base que rechaza una fila llega como `RechazoActualizacion` con su nombre;
 * cualquier otra falla sube tal cual. En los dos casos no queda nada escrito.
 */
async function operar<T>(db: Db, sesion: Sesion, organizacionId: string, op: Opciones, cuerpo: (o: Operacion) => Promise<T>): Promise<T> {
  try {
    return await enTransaccion(db, async (tx) => {
      await bloquearOrganizacion(tx, organizacionId)
      const d = await leerOrganizacion(tx, organizacionId)
      if (d === null) rechazar(`la organización ${organizacionId} no tiene riesgos registrados`)
      return cuerpo({
        tx, d, sesion,
        ahora: () => ahora(tx),
        escribir: async (tabla, fila) => {
          await insertar(tx, tabla, fila)
          await op.trasEscribir?.(tabla)
        },
      })
    })
  } catch (e) {
    const c = restriccion(e)
    if (c !== null) throw new RechazoActualizacion(`la base rechazó el cambio (${c})`)
    throw e
  }
}

/** El nombre de la restricción de una violación de integridad (SQLSTATE 23…), o `null`. */
function restriccion(e: unknown): string | null {
  if (typeof e !== 'object' || e === null) return null
  const x = e as { code?: unknown; constraint_name?: unknown }
  return typeof x.code === 'string' && x.code.startsWith('23') ? (typeof x.constraint_name === 'string' ? x.constraint_name : x.code) : null
}

const organizacionDe = async (db: Db, riskId: string): Promise<string> => {
  const r = await riesgo(db, riskId)
  if (r === null) rechazar(`no existe el riesgo ${riskId}`)
  return r.organizacionId
}

const organizacionDeObjeto = async (db: Db, tabla: 'accion' | 'transferencia' | 'evaluacion' | 'revision_pendiente', id: string): Promise<string> => {
  const riskId = await riesgoDe(db, tabla, id)
  if (riskId === null) rechazar(`no existe ${id}`)
  return organizacionDe(db, riskId)
}

const riesgoDeLaOrganizacion = (d: DatosOrganizacion, riskId: string): RiesgoRegistrado => {
  const r = d.riesgos.find((x) => x.id === riskId)
  if (r === undefined) rechazar(`no existe el riesgo ${riskId}`)
  return r
}

const noPadre = (r: RiesgoRegistrado, que: string): void => {
  if (r.tipoObjeto === 'padre') rechazar(`un padre no tiene evaluación propia (§1.4): ${que} va en uno de sus hijos`)
}

const enLista = <T extends string>(valor: string, lista: readonly T[], que: string): T => {
  if (!(lista as readonly string[]).includes(valor)) rechazar(`${que}: «${valor}» no es ${lista.join(', ')}`)
  return valor as T
}

const monto = (valor: string | null | undefined, que: string): string | null => {
  const v = opcional(valor)
  if (v !== null && !/^\d+(\.\d+)?$/.test(v)) rechazar(`${que}: se espera un monto sin signo, con punto decimal`)
  return v
}

/** Abre una revisión pendiente del riesgo, en la misma transacción que el cambio que la dispara. */
async function abrirRevision(
  o: Operacion, r: RiesgoRegistrado, disparador: Disparador, ref: { accionId?: string; novedadId?: string; version?: string },
): Promise<string> {
  noPadre(r, 'la revisión pendiente')
  const id = nuevoId('REV')
  await o.escribir('revision_pendiente', {
    id, risk_id: r.id, riesgo_tipo: r.tipoObjeto, disparador, accion_id: ref.accionId ?? null, novedad_id: ref.novedadId ?? null,
    version_metodologia: ref.version ?? null, origen: 'sesion', autor_persona_id: o.sesion.personaId, abierta_en: await o.ahora(),
  })
  return id
}

// ── Novedades (H2) ───────────────────────────────────────────────────────────

export interface PedidoNovedad {
  readonly riskId: string
  readonly accionId?: string | null
  readonly transferenciaId?: string | null
  readonly tipo: string
  readonly texto: string
  readonly evidencia: string
}

/**
 * Registra un comentario, una información nueva o un cambio de contexto sobre un riesgo, una
 * acción o una cobertura. Las dos últimas abren una revisión pendiente del riesgo, en la misma
 * transacción; un comentario no.
 */
export async function registrarNovedad(
  db: Db, sesion: Sesion, p: PedidoNovedad, op: Opciones = {},
): Promise<{ novedadId: string; revisionId: string | null }> {
  const tipo = enLista<TipoNovedad>(p.tipo, TIPOS_NOVEDAD, 'tipo de novedad')
  const texto = exigirTexto(p.texto, 'el texto de la novedad')
  const evidencia = referencias(p.evidencia)
  const accionId = opcional(p.accionId)
  const transferenciaId = opcional(p.transferenciaId)
  if (accionId !== null && transferenciaId !== null) rechazar('una novedad va sobre el riesgo, una acción o una cobertura: no sobre dos')
  return operar(db, sesion, await organizacionDe(db, p.riskId), op, async (o) => {
    const r = riesgoDeLaOrganizacion(o.d, p.riskId)
    if (accionId !== null && !o.d.acciones.some((a) => a.id === accionId && a.riskId === r.id)) rechazar(`${accionId} no es una acción de este riesgo`)
    if (transferenciaId !== null && !o.d.coberturas.some((c) => c.id === transferenciaId && c.riskId === r.id)) {
      rechazar(`${transferenciaId} no es una cobertura de este riesgo`)
    }
    const disparador = abreRevision({ tipo: 'novedad', novedad: tipo })
    if (disparador !== null) noPadre(r, 'una novedad que abre revisión')
    const novedadId = nuevoId('NOV')
    await o.escribir('novedad', {
      id: novedadId, risk_id: r.id, accion_id: accionId, transferencia_id: transferenciaId, tipo, texto, evidencia,
      autor_persona_id: sesion.personaId, registrada_en: await o.ahora(),
    })
    const revisionId = disparador === null ? null : await abrirRevision(o, r, disparador, { novedadId })
    return { novedadId, revisionId }
  })
}

// ── Acciones y decisiones de tratamiento ─────────────────────────────────────

export interface PedidoAccion {
  readonly riskId: string
  readonly tipoRegistro: string
  readonly descripcion: string
  readonly factorObjetivo?: readonly string[]
  readonly mecanismoCausal?: string | null
  readonly cambioEsperado?: string | null
  readonly decision?: string | null
  readonly fundamento?: string | null
  readonly fechaProximaRevision?: string | null
  readonly fechaAlta: string
  readonly base: string
  readonly evidencia: string
  /** Sólo en una acción: `planificada` o `en_curso`. Una acción se cumple con `cambiarEstadoAccion`. */
  readonly estado?: string | null
}

/** Alta de una acción (con su estado inicial) o de una decisión de tratamiento. No abre revisión. */
export async function altaAccion(db: Db, sesion: Sesion, p: PedidoAccion, op: Opciones = {}): Promise<{ accionId: string }> {
  const tipo = enLista(p.tipoRegistro, ['accion', 'decision_tratamiento'] as const, 'tipo de registro')
  const descripcion = exigirTexto(p.descripcion, 'la descripción')
  const fechaAlta = fecha(p.fechaAlta, 'fecha de alta')
  const base = enLista(p.base, BASES, 'base')
  const evidencia = referencias(p.evidencia)
  const esAccion = tipo === 'accion'
  const factorObjetivo = esAccion ? [...(p.factorObjetivo ?? [])] : null
  if (factorObjetivo !== null) {
    if (factorObjetivo.length === 0) rechazar('una acción nombra al menos un factor objetivo (RV-ACC-03)')
    for (const f of factorObjetivo) enLista(f, FACTORES, 'factor objetivo')
  }
  const mecanismo = esAccion ? exigirTexto(p.mecanismoCausal, 'el mecanismo causal (RV-ACC-04)') : null
  const decision = esAccion ? null : enLista(p.decision ?? '', ['tratar', 'aceptar', 'transferir'] as const, 'decisión')
  const fundamento = opcional(p.fundamento)
  if (decision === 'aceptar' && fundamento === null) rechazar('aceptar un riesgo necesita su fundamento (RV-ACC-10)')
  const proxima = esAccion ? null : fecha(p.fechaProximaRevision ?? '', 'fecha de la próxima revisión')
  const estado = esAccion ? enLista(p.estado ?? 'planificada', ['planificada', 'en_curso'] as const, 'estado inicial') : null
  return operar(db, sesion, await organizacionDe(db, p.riskId), op, async (o) => {
    const r = riesgoDeLaOrganizacion(o.d, p.riskId)
    noPadre(r, 'la acción')
    const accionId = nuevoId('ACC')
    await o.escribir('accion', {
      id: accionId, risk_id: r.id, riesgo_tipo: r.tipoObjeto, tipo_registro: tipo, descripcion, factor_objetivo: factorObjetivo,
      mecanismo_causal: mecanismo, cambio_esperado: esAccion ? opcional(p.cambioEsperado) : null, decision,
      fundamento: esAccion ? null : fundamento, fecha_proxima_revision: proxima, fecha_alta: fechaAlta, actor: 'human', base, evidencia,
      origen: 'sesion', autor_persona_id: sesion.personaId, registrada_en: await o.ahora(),
    })
    if (estado !== null) {
      await o.escribir('accion_estado', {
        accion_id: accionId, estado, origen: 'sesion', autor_persona_id: sesion.personaId, registrado_en: await o.ahora(),
      })
    }
    return { accionId }
  })
}

export interface PedidoEstadoAccion {
  readonly accionId: string
  readonly estado: string
  /** Por qué cambia: queda como comentario sobre la acción. */
  readonly comentario: string
  /** De una `cumplida`, la evidencia de ejecución (D25); de otro estado, la del comentario. */
  readonly evidencia: string
  readonly fechaCumplida?: string | null
}

/**
 * Cambia el estado de una acción, con su comentario. Si pasa a `cumplida`, con fecha y
 * evidencia de ejecución, abre la revisión pendiente del riesgo en la misma transacción.
 * Planificar, poner en curso o cancelar no abre nada (D18).
 */
export async function cambiarEstadoAccion(
  db: Db, sesion: Sesion, p: PedidoEstadoAccion, op: Opciones = {},
): Promise<{ novedadId: string; revisionId: string | null }> {
  const estado = enLista<EstadoAccion>(p.estado, ESTADOS_ACCION, 'estado')
  const comentario = exigirTexto(p.comentario, 'el comentario del cambio')
  const cumplida = estado === 'cumplida'
  const evidencia = cumplida ? evidenciaDeEjecucion(p.evidencia) : referencias(p.evidencia)
  const fechaCumplida = cumplida ? fecha(p.fechaCumplida ?? '', 'fecha de cumplimiento') : null
  return operar(db, sesion, await organizacionDeObjeto(db, 'accion', p.accionId), op, async (o) => {
    const a = o.d.acciones.find((x) => x.id === p.accionId)
    if (a === undefined) rechazar(`no existe la acción ${p.accionId}`)
    if (a.tipoRegistro !== 'accion') rechazar('una decisión de tratamiento no tiene estado')
    const motivo = porQueNoCambia(a.estados.at(-1)?.estado ?? null, estado)
    if (motivo !== null) rechazar(motivo)
    const r = riesgoDeLaOrganizacion(o.d, a.riskId)
    await o.escribir('accion_estado', {
      accion_id: a.id, estado, fecha_cumplida: fechaCumplida, evidencia_ejecucion: cumplida ? evidencia : null,
      origen: 'sesion', autor_persona_id: sesion.personaId, registrado_en: await o.ahora(),
    })
    const novedadId = nuevoId('NOV')
    await o.escribir('novedad', {
      id: novedadId, risk_id: r.id, accion_id: a.id, tipo: 'comentario', texto: comentario, evidencia,
      autor_persona_id: sesion.personaId, registrada_en: await o.ahora(),
    })
    const disparador = abreRevision({ tipo: 'estado_accion', estado })
    const revisionId = disparador === null ? null : await abrirRevision(o, r, disparador, { accionId: a.id })
    return { novedadId, revisionId }
  })
}

export interface PedidoEficacia {
  readonly accionId: string
  readonly efecto: string
  readonly nota?: string | null
  /** La reevaluación por `accion_ejecutada` que midió el efecto (RV-ACC-07, RV-ACC-08). */
  readonly evaluacionId: string
}

/** Registra la eficacia de una acción cumplida, una vez, con la reevaluación que la midió. No abre revisión. */
export async function registrarEficacia(db: Db, sesion: Sesion, p: PedidoEficacia, op: Opciones = {}): Promise<void> {
  const efecto = enLista(p.efecto, ['efecto_total', 'efecto_parcial', 'sin_efecto_medible'] as const, 'efecto')
  const nota = opcional(p.nota)
  if (efecto !== 'efecto_total' && nota === null) rechazar('un efecto parcial o sin efecto medible necesita su nota (RV-ACC-09)')
  await operar(db, sesion, await organizacionDeObjeto(db, 'accion', p.accionId), op, async (o) => {
    const a = o.d.acciones.find((x) => x.id === p.accionId)
    if (a === undefined) rechazar(`no existe la acción ${p.accionId}`)
    const vigente = a.estados.at(-1)
    if (vigente?.estado !== 'cumplida') rechazar('la eficacia se registra sólo en una acción cumplida')
    if (a.estados.some((s) => s.efecto !== null)) rechazar('la acción ya tiene su eficacia registrada')
    const e = o.d.evaluaciones.find((x) => x.id === p.evaluacionId)
    if (e?.motivo !== 'accion_ejecutada' || e.accionId !== a.id) {
      rechazar('la eficacia va con una reevaluación por accion_ejecutada de esta misma acción')
    }
    if (reviewStatusDe(e.revisiones) === 'rejected') rechazar('esa reevaluación está rechazada')
    await o.escribir('accion_estado', {
      accion_id: a.id, estado: 'cumplida', fecha_cumplida: vigente.fechaCumplida, evidencia_ejecucion: vigente.evidenciaEjecucion,
      efecto, efecto_nota: nota, evaluacion_efecto_id: p.evaluacionId, origen: 'sesion', autor_persona_id: sesion.personaId,
      registrado_en: await o.ahora(),
    })
  })
}

// ── Reevaluación ─────────────────────────────────────────────────────────────

export interface FactorPedido {
  readonly estado: string
  readonly valor?: number | null
  readonly min?: number | null
  readonly max?: number | null
  readonly observacion?: string | null
}

export interface PedidoReevaluacion {
  readonly riskId: string
  readonly motivo: string
  readonly accionId?: string | null
  readonly fecha: string
  readonly factores: Readonly<Record<NombreFactor, FactorPedido>>
  readonly base: string
  readonly evidencia: string
  readonly uncertainty: string
  readonly uncertaintyNota?: string | null
  readonly necesidadValidacion?: string | null
  readonly riesgoCausa?: string | null
  readonly riesgoEvento: string
  readonly riesgoConsecuencia?: string | null
  readonly justificacion?: string | null
  readonly montoBruto?: string | null
  readonly moneda?: string | null
}

const nivel = (v: number | null | undefined, que: string): number | null => {
  if (v === null || v === undefined) return null
  if (!(NIVELES as readonly number[]).includes(v)) rechazar(`${que}: los niveles van de 1 a 5`)
  return v
}

function factorDePedido(nombre: NombreFactor, f: FactorPedido): FactorRegistrado {
  const estados = nombre === 'v_rec' ? (['known', 'unknown', 'no_aplica'] as const) : (['known', 'unknown'] as const)
  const estado = enLista(f.estado, estados, `${nombre}: estado`)
  const valor = nivel(f.valor, nombre)
  if ((estado === 'known') !== (valor !== null)) rechazar(`${nombre}: un factor known lleva valor y uno ${estado} no`)
  return {
    estado, valor: valor as FactorRegistrado['valor'], min: nivel(f.min, `${nombre} mínimo`) as FactorRegistrado['min'],
    max: nivel(f.max, `${nombre} máximo`) as FactorRegistrado['max'], observacion: opcional(f.observacion), base: null, evidencia: null,
  }
}

/**
 * Carga una reevaluación hecha por una persona: una evaluación nueva que apunta a la última de
 * la cadena, con su motivo (metodología §11.1). Queda `pending`: no reemplaza a una vigente
 * aceptada hasta que una persona la acepte (decisión 8a), y no cierra ninguna revisión sola.
 */
export async function cargarReevaluacion(db: Db, sesion: Sesion, p: PedidoReevaluacion, op: Opciones = {}): Promise<{ evaluacionId: string }> {
  const motivo = enLista(p.motivo, MOTIVOS, 'motivo')
  const accionId = opcional(p.accionId)
  if ((motivo === 'accion_ejecutada') !== (accionId !== null)) rechazar('una reevaluación por accion_ejecutada nombra su acción, y sólo esa (RV-EVA-04)')
  const fechaEval = fecha(p.fecha, 'fecha de la reevaluación')
  const factores = Object.fromEntries(FACTORES.map((f) => [f, factorDePedido(f, p.factores[f])])) as Record<NombreFactor, FactorRegistrado>
  const base = enLista(p.base, BASES, 'base')
  const evidencia = referencias(p.evidencia)
  const uncertainty = enLista(p.uncertainty, UNCERTAINTY, 'uncertainty')
  const uncertaintyNota = opcional(p.uncertaintyNota)
  if (uncertainty !== 'low' && uncertaintyNota === null) rechazar('una uncertainty medium o high necesita su nota (RV-UNC-02)')
  const riesgoEvento = exigirTexto(p.riesgoEvento, 'el evento del riesgo')
  const montoBruto = monto(p.montoBruto, 'monto bruto')
  const moneda = opcional(p.moneda)
  return operar(db, sesion, await organizacionDe(db, p.riskId), op, async (o) => {
    const r = riesgoDeLaOrganizacion(o.d, p.riskId)
    noPadre(r, 'la evaluación')
    const cadena = historia(o.d.evaluaciones.map(aEvaluacion), r.id)
    const anterior = cadena.at(-1)
    if (anterior === undefined) rechazar('el riesgo no tiene evaluación inicial: la inicial llega con la importación')
    if (accionId !== null) {
      const a = o.d.acciones.find((x) => x.id === accionId && x.riskId === r.id && x.tipoRegistro === 'accion')
      if (a === undefined) rechazar(`${accionId} no es una acción de este riesgo`)
      if (a.estados.at(-1)?.estado !== 'cumplida') rechazar('la acción no está cumplida (RV-EVA-05)')
    }
    const evaluacionId = nuevoId('EVA')
    const columnas: Record<string, FilaNueva[string]> = {}
    for (const f of FACTORES) {
      const x = factores[f]
      columnas[`${f}_estado`] = x.estado
      columnas[`${f}_valor`] = x.valor
      columnas[`${f}_min`] = x.min
      columnas[`${f}_max`] = x.max
      columnas[`${f}_observacion`] = x.observacion
    }
    await o.escribir('evaluacion', {
      id: evaluacionId, risk_id: r.id, riesgo_tipo: r.tipoObjeto, tipo_evaluacion: 'reevaluacion', evaluacion_anterior_id: anterior.id,
      motivo, accion_id: accionId, fecha: fechaEval, version_metodologia: VERSION_METODOLOGIA, actor: 'human', base, evidencia,
      riesgo_causa: opcional(p.riesgoCausa), riesgo_evento: riesgoEvento, riesgo_consecuencia: opcional(p.riesgoConsecuencia), ...columnas,
      i_econ_monto_bruto: montoBruto, moneda, uncertainty, uncertainty_nota: uncertaintyNota, necesidad_validacion: opcional(p.necesidadValidacion),
      justificacion: opcional(p.justificacion), origen: 'sesion', autor_persona_id: sesion.personaId, registrada_en: await o.ahora(),
    })
    return { evaluacionId }
  })
}

// ── Revisión humana ──────────────────────────────────────────────────────────

export type ObjetoRevisado =
  | { readonly evaluacionId: string }
  | { readonly accionId: string }
  | { readonly transferenciaId: string }

/** Deja una evaluación, una acción o una cobertura en `accepted`, `needs_revision` o `rejected`. Sólo una persona acepta (EMI-17). */
export async function revisar(
  db: Db, sesion: Sesion, objeto: ObjetoRevisado, estado: string, op: Opciones = {},
): Promise<void> {
  const e = enLista<EstadoRevisionHumana>(estado, ESTADOS_REVISION, 'estado de la revisión')
  exigirRevisor('human', e)
  const [tabla, id, columna] = 'evaluacionId' in objeto
    ? (['evaluacion', objeto.evaluacionId, 'evaluacion_id'] as const)
    : 'accionId' in objeto ? (['accion', objeto.accionId, 'accion_id'] as const) : (['transferencia', objeto.transferenciaId, 'transferencia_id'] as const)
  await operar(db, sesion, await organizacionDeObjeto(db, tabla, id), op, async (o) => {
    // Lo que cerró una revisión no se desdice (migración 0004): se corrige con otra reevaluación.
    if (tabla === 'evaluacion' && e !== 'accepted' && o.d.revisionesPendientes.some((r) => r.cierre?.evaluacionId === id)) {
      rechazar('esta reevaluación cerró una revisión: para corregirla, cargá otra reevaluación')
    }
    await o.escribir('revision_humana', {
      [columna]: id, estado: e, revisado_por_actor: 'human', revisor_persona_id: sesion.personaId, fecha_revision: await hoy(o.tx),
      origen: 'sesion', registrada_en: await o.ahora(),
    })
  })
}

// ── Cierre de una revisión pendiente ─────────────────────────────────────────

const revisionAbierta = (d: DatosOrganizacion, revisionId: string) => {
  const r = d.revisionesPendientes.find((x) => x.id === revisionId)
  if (r === undefined) rechazar(`no existe la revisión ${revisionId}`)
  if (r.cierre !== null) rechazar('la revisión ya está cerrada')
  return r
}

/**
 * Cierra una revisión con la reevaluación que la responde. Si la reevaluación todavía no está
 * aceptada, la persona que cierra la acepta en el mismo acto: la aceptación y el cierre van en
 * la misma transacción. Una reevaluación rechazada o `needs_revision` no cierra: la revisión
 * sigue abierta.
 */
export async function cerrarConReevaluacion(
  db: Db, sesion: Sesion, p: { readonly revisionId: string; readonly evaluacionId: string }, op: Opciones = {},
): Promise<{ aceptada: boolean }> {
  return operar(db, sesion, await organizacionDeObjeto(db, 'revision_pendiente', p.revisionId), op, async (o) => {
    const r = revisionAbierta(o.d, p.revisionId)
    const e = o.d.evaluaciones.find((x) => x.id === p.evaluacionId && x.riskId === r.riskId)
    if (e === undefined) rechazar(`${p.evaluacionId} no es una evaluación de este riesgo`)
    const status = reviewStatusDe(e.revisiones)
    const motivo = porQueNoCierra(
      { disparador: r.disparador as Disparador, accionId: r.accionId, abiertaEn: r.abiertaEn },
      { tipo: e.tipo, motivo: e.motivo, accionId: e.accionId, registradaEn: e.registradaEn, reviewStatus: status },
    )
    if (motivo !== null) rechazar(motivo)
    if (o.d.revisionesPendientes.some((x) => x.cierre?.evaluacionId === e.id)) rechazar('esa reevaluación ya cerró otra revisión')
    const aceptada = status !== 'accepted'
    if (aceptada) {
      await o.escribir('revision_humana', {
        evaluacion_id: e.id, estado: 'accepted', revisado_por_actor: 'human', revisor_persona_id: sesion.personaId,
        fecha_revision: await hoy(o.tx), origen: 'sesion', registrada_en: await o.ahora(),
      })
    }
    await o.escribir('cierre_revision', {
      revision_id: r.id, risk_id: r.riskId, resultado: 'reevaluacion_aceptada', evaluacion_id: e.id, cerrada_por: sesion.personaId,
      cerrada_en: await o.ahora(),
    })
    return { aceptada }
  })
}

/** Cierra una revisión sin evaluación nueva: el riesgo no cambió, y el fundamento dice por qué (dossier 15a §5). */
export async function cerrarSinCambio(
  db: Db, sesion: Sesion, p: { readonly revisionId: string; readonly fundamento: string }, op: Opciones = {},
): Promise<void> {
  const fundamento = exigirFundamento(p.fundamento)
  await operar(db, sesion, await organizacionDeObjeto(db, 'revision_pendiente', p.revisionId), op, async (o) => {
    const r = revisionAbierta(o.d, p.revisionId)
    await o.escribir('cierre_revision', {
      revision_id: r.id, risk_id: r.riskId, resultado: 'sin_cambio', fundamento, cerrada_por: sesion.personaId, cerrada_en: await o.ahora(),
    })
  })
}

// ── Transferencia (D17, D-0067) ──────────────────────────────────────────────

export interface PedidoCobertura {
  readonly riskId: string
  readonly polizaRef: string
  readonly cobertura: string
  readonly vigenciaDesde: string
  readonly vigenciaHasta: string
  readonly limite?: string | null
  readonly sublimite?: string | null
  readonly sublimitesTexto?: string | null
  readonly deducible?: string | null
  readonly deducibleTexto?: string | null
  readonly exclusiones?: string | null
  readonly exposicionRetenida?: string | null
  readonly exposicionRetenidaNota?: string | null
  readonly suficiencia: string
  readonly suficienciaNota?: string | null
  readonly moneda?: string | null
  readonly base: string
  readonly evidencia: string
  readonly uncertainty: string
  readonly uncertaintyNota?: string | null
}

const SUFICIENCIAS = ['suficiente', 'parcial', 'insuficiente', 'sin_cobertura', 'no_evaluada'] as const

/** Alta de una cobertura sobre un riesgo. Ninguna columna entra al cálculo (D17); no abre revisión. */
export async function altaCobertura(db: Db, sesion: Sesion, p: PedidoCobertura, op: Opciones = {}): Promise<{ transferenciaId: string }> {
  const desde = fecha(p.vigenciaDesde, 'vigencia desde')
  const hasta = fecha(p.vigenciaHasta, 'vigencia hasta')
  if (hasta < desde) rechazar('la vigencia termina antes de empezar (RV-TRF-02)')
  const montos = {
    limite_monto: monto(p.limite, 'límite'), sublimite_aplicable_monto: monto(p.sublimite, 'sublímite'),
    deducible_monto: monto(p.deducible, 'deducible'), exposicion_retenida_monto: monto(p.exposicionRetenida, 'exposición retenida'),
  }
  const moneda = opcional(p.moneda)
  if (Object.values(montos).some((m) => m !== null) && moneda === null) rechazar('un monto va con su moneda (RV-TRF-03)')
  const uncertainty = enLista(p.uncertainty, UNCERTAINTY, 'uncertainty')
  const uncertaintyNota = opcional(p.uncertaintyNota)
  if (uncertainty !== 'low' && uncertaintyNota === null) rechazar('una uncertainty medium o high necesita su nota')
  const fila = {
    poliza_ref: exigirTexto(p.polizaRef, 'la referencia de la póliza'), cobertura: exigirTexto(p.cobertura, 'la cobertura'),
    vigencia_desde: desde, vigencia_hasta: hasta, ...montos, sublimites_texto: opcional(p.sublimitesTexto), deducible_texto: opcional(p.deducibleTexto),
    exclusiones: opcional(p.exclusiones), exposicion_retenida_nota: opcional(p.exposicionRetenidaNota),
    suficiencia: enLista(p.suficiencia, SUFICIENCIAS, 'suficiencia'), suficiencia_nota: opcional(p.suficienciaNota), moneda,
    actor: 'human', base: enLista(p.base, BASES, 'base'), evidencia: referencias(p.evidencia), uncertainty, uncertainty_nota: uncertaintyNota,
  }
  return operar(db, sesion, await organizacionDe(db, p.riskId), op, async (o) => {
    const r = riesgoDeLaOrganizacion(o.d, p.riskId)
    noPadre(r, 'la cobertura')
    const transferenciaId = nuevoId('TRF')
    await o.escribir('transferencia', {
      id: transferenciaId, risk_id: r.id, riesgo_tipo: r.tipoObjeto, ...fila, origen: 'sesion', autor_persona_id: sesion.personaId,
      registrada_en: await o.ahora(),
    })
    return { transferenciaId }
  })
}

export interface PedidoEvento {
  readonly transferenciaId: string
  readonly tipo: string
  readonly fecha: string
  readonly monto?: string | null
  readonly moneda?: string | null
  readonly nota?: string | null
  readonly base: string
  readonly evidencia: string
}

const TIPOS_EVENTO = ['firma', 'ampliacion', 'renovacion', 'consumo_limite', 'vencimiento', 'cancelacion'] as const

/**
 * Registra un evento de póliza como observación local de Risk OS, con su procedencia (D-0067).
 * No crea una reevaluación, no abre una revisión y no cambia ningún derivado del riesgo (D17).
 */
export async function registrarEventoPoliza(db: Db, sesion: Sesion, p: PedidoEvento, op: Opciones = {}): Promise<{ eventoId: string }> {
  const tipo = enLista(p.tipo, TIPOS_EVENTO, 'tipo de evento')
  const m = monto(p.monto, 'monto del evento')
  if (tipo === 'consumo_limite' && m === null) rechazar('un consumo del límite trae su monto (RV-TRF-05)')
  if (m !== null && tipo !== 'consumo_limite' && tipo !== 'ampliacion') rechazar('sólo un consumo del límite o una ampliación traen monto (RV-TRF-05)')
  const moneda = opcional(p.moneda)
  if (m !== null && moneda === null) rechazar('un monto va con su moneda (RV-TRF-03)')
  const fila = {
    tipo_evento: tipo, fecha_evento: fecha(p.fecha, 'fecha del evento'), monto_evento: m, moneda, nota_evento: opcional(p.nota),
    actor: 'human', base: enLista(p.base, BASES, 'base'), evidencia: referencias(p.evidencia),
  }
  return operar(db, sesion, await organizacionDeObjeto(db, 'transferencia', p.transferenciaId), op, async (o) => {
    const c = o.d.coberturas.find((x) => x.id === p.transferenciaId)
    if (c === undefined) rechazar(`no existe la cobertura ${p.transferenciaId}`)
    const eventoId = nuevoId('EVT')
    await o.escribir('evento_poliza', {
      id: eventoId, risk_id: c.riskId, transferencia_ref: c.id, ...fila, origen: 'sesion', autor_persona_id: sesion.personaId,
      registrado_en: await o.ahora(),
    })
    return { eventoId }
  })
}

// ── Reordenamiento profesional (decisión 5) ──────────────────────────────────

/**
 * Registra un reordenamiento con la foto del orden calculado de la organización y las
 * evaluaciones vigentes con que se calculó (decisión 6a). Si la persona registró su orden previo
 * de esa empresa, lo enlaza. No cambia factores, `C_raw` ni banda, y no abre revisión.
 */
export async function reordenar(
  db: Db, sesion: Sesion, version: VersionFunciones, organizacionId: string, p: PedidoReordenamiento, op: Opciones = {},
): Promise<{ reordenamientoId: string }> {
  exigirVersion(version)
  return operar(db, sesion, organizacionId, op, async (o) => {
    const ranking = rankingOrganizacion(version, o.d.riesgos.map(aRiesgo), o.d.evaluaciones.map(aEvaluacion))
    const calculado = fotoOrdenCalculado(ranking)
    exigirReordenamiento(p, calculado)
    const reordenamientoId = nuevoId('ROR')
    const par = p.tipo === 'par'
    await o.escribir('reordenamiento', {
      id: reordenamientoId, organizacion_id: organizacionId, autor_persona_id: sesion.personaId, tipo: p.tipo,
      risk_id_sube: par ? (p.riskIdSube ?? null) : null, risk_id_baja: par ? (p.riskIdBaja ?? null) : null, risk_id: par ? null : (p.riskId ?? null),
      posicion_profesional: p.tipo === 'posicion' ? (p.posicion ?? null) : null, banda_profesional: p.tipo === 'banda' ? (p.banda ?? null) : null,
      orden_calculado: { version, filas: calculado }, version_funciones: version, causa: p.causa, fundamento: p.fundamento.trim(),
      patron: p.patron, orden_previo_id: await ordenPrevioDe(o.tx, sesion.personaId, organizacionId), registrado_en: await o.ahora(),
    })
    for (const [riskId, e] of [...ranking.vigentes].sort(([a], [b]) => a.localeCompare(b))) {
      await o.escribir('reordenamiento_vigente', { reordenamiento_id: reordenamientoId, organizacion_id: organizacionId, evaluacion_id: e.id, risk_id: riskId })
    }
    return { reordenamientoId }
  })
}

// ── Orden previo del revisor (decisión 6; A8a) ───────────────────────────────

/** Un objeto del material ciego: su identidad, sin ranking, banda, `C_raw` ni factores. */
export interface ObjetoCiego {
  readonly riskId: string
  readonly tipoObjeto: 'riesgo' | 'padre'
  readonly titulo: string
  readonly idOrigen: string | null
  readonly unidadId: string | null
  /** De un padre, sus hijos: se ordena el padre, que se lee por ellos (§1.4). */
  readonly hijos: readonly { readonly riskId: string; readonly titulo: string; readonly idOrigen: string | null }[]
}

export interface PantallaOrdenPrevio {
  readonly organizacionId: string
  /** En orden de origen, nunca en el del ranking. */
  readonly objetos: readonly ObjetoCiego[]
  readonly registrado: { readonly id: string; readonly registradoEn: string; readonly items: readonly { readonly riskId: string; readonly posicion: number; readonly banda: string | null }[] } | null
  /** La persona ya vio resultados de esta empresa: un orden suyo ya no sería previo. */
  readonly vioResultados: boolean
}

const porOrigen = (a: { idOrigen: string | null; titulo: string; id: string }, b: { idOrigen: string | null; titulo: string; id: string }): number =>
  (a.idOrigen ?? '').localeCompare(b.idOrigen ?? '') || a.titulo.localeCompare(b.titulo) || a.id.localeCompare(b.id)

const objetosCiegos = (d: DatosOrganizacion): ObjetoCiego[] =>
  d.riesgos
    .filter((r) => r.tipoObjeto === 'riesgo' || r.tipoObjeto === 'padre')
    .sort(porOrigen)
    .map((r): ObjetoCiego => ({
      riskId: r.id, tipoObjeto: r.tipoObjeto === 'padre' ? 'padre' : 'riesgo', titulo: r.titulo, idOrigen: r.idOrigen, unidadId: r.unidadId,
      hijos: d.riesgos.filter((h) => h.riesgoPadreId === r.id).sort(porOrigen).map((h) => ({ riskId: h.id, titulo: h.titulo, idOrigen: h.idOrigen })),
    }))

/**
 * El material ciego para el orden previo: los riesgos y padres que compiten en el orden de la
 * empresa, con su identidad y nada calculado. No es una vista con resultados: no registra acceso.
 */
export async function pantallaOrdenPrevio(db: Db, sesion: Sesion, organizacionId: string): Promise<PantallaOrdenPrevio | null> {
  return enTransaccion(db, async (tx) => {
    const d = await leerOrganizacion(tx, organizacionId)
    if (d === null) return null
    const propio = d.ordenesPrevios.find((x) => x.revisorPersonaId === sesion.personaId)
    return {
      organizacionId,
      objetos: objetosCiegos(d),
      registrado: propio === undefined ? null : { id: propio.id, registradoEn: propio.registradoEn, items: propio.items },
      vioResultados: await vioResultados(tx, sesion.personaId, organizacionId),
    }
  })
}

export interface PedidoOrdenPrevio {
  readonly materialRef: string
  readonly items: readonly { readonly riskId: string; readonly posicion: number; readonly banda?: string | null }[]
}

/**
 * Registra el orden previo de la persona para una empresa: una posición (y, si quiere, una
 * banda) para cada riesgo y padre del material ciego. Se rechaza si la persona ya accedió a una
 * vista con resultados de esa empresa, o si ya registró uno (decisión 6; A8a).
 */
export async function registrarOrdenPrevio(
  db: Db, sesion: Sesion, organizacionId: string, p: PedidoOrdenPrevio, op: Opciones = {},
): Promise<{ ordenPrevioId: string }> {
  const materialRef = exigirTexto(p.materialRef, 'la referencia del material ciego')
  return operar(db, sesion, organizacionId, op, async (o) => {
    if (await vioResultados(o.tx, sesion.personaId, organizacionId)) {
      rechazar('ya accediste a resultados de esta empresa: un orden registrado ahora no sería previo (A8a)')
    }
    if (await ordenPrevioDe(o.tx, sesion.personaId, organizacionId) !== null) rechazar('ya registraste tu orden previo de esta empresa')
    const objetos = objetosCiegos(o.d)
    const ids = new Set(objetos.map((x) => x.riskId))
    const vistos = new Set<string>()
    const posiciones = new Set<number>()
    for (const i of p.items) {
      if (!ids.has(i.riskId)) rechazar(`${i.riskId} no está en el material de esta empresa`)
      if (vistos.has(i.riskId)) rechazar(`${i.riskId} aparece dos veces`)
      vistos.add(i.riskId)
      if (!Number.isInteger(i.posicion) || i.posicion < 1 || i.posicion > objetos.length) rechazar(`las posiciones van de 1 a ${String(objetos.length)}`)
      if (posiciones.has(i.posicion)) rechazar(`la posición ${String(i.posicion)} está dos veces: cada riesgo va en una posición distinta`)
      posiciones.add(i.posicion)
      if (opcional(i.banda) !== null) enLista(i.banda ?? '', BANDAS, 'banda')
    }
    if (vistos.size !== ids.size) rechazar(`faltan ${String(ids.size - vistos.size)} riesgos: el orden previo cubre todos los de la empresa`)
    const ordenPrevioId = nuevoId('OPR')
    await o.escribir('orden_previo', { id: ordenPrevioId, organizacion_id: organizacionId, revisor_persona_id: sesion.personaId, material_ref: materialRef })
    for (const i of p.items) {
      await o.escribir('orden_previo_item', {
        orden_previo_id: ordenPrevioId, organizacion_id: organizacionId, risk_id: i.riskId, posicion: i.posicion, banda: opcional(i.banda),
      })
    }
    return { ordenPrevioId }
  })
}

// ── Cambio de versión de la metodología (sin UI en v1) ───────────────────────

/**
 * Abre una revisión por cambio de versión sólo en los riesgos que la regresión marca como que
 * su resultado podría cambiar (dossier 15a §5). En v1 no hay otra versión: la operación queda
 * lista y probada, sin pantalla (T-0031, Non-scope). Un riesgo que ya tiene su revisión por esa
 * versión no abre otra.
 */
export async function abrirRevisionesPorCambioDeVersion(
  db: Db, sesion: Sesion, organizacionId: string,
  p: { readonly version: string; readonly regresion: readonly { readonly riskId: string; readonly podriaCambiar: boolean }[] },
  op: Opciones = {},
): Promise<{ revisiones: string[] }> {
  const version = exigirTexto(p.version, 'la versión nueva')
  return operar(db, sesion, organizacionId, op, async (o) => {
    const revisiones: string[] = []
    for (const x of p.regresion) {
      const r = riesgoDeLaOrganizacion(o.d, x.riskId)
      const disparador = abreRevision({ tipo: 'cambio_version', marcadoPorRegresion: x.podriaCambiar })
      if (disparador === null) continue
      if (o.d.revisionesPendientes.some((v) => v.riskId === r.id && v.versionMetodologia === version)) continue
      revisiones.push(await abrirRevision(o, r, disparador, { version }))
    }
    return { revisiones }
  })
}

// Los valores fijos de los formularios de la app.
export { BASES, SUFICIENCIAS, TIPOS_EVENTO, UNCERTAINTY }
