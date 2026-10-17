// Soporte de los tests de integración de la actualización (T-0031): las sintéticas de la 15b
// importadas en `delcampo_risk_test` dentro de una transacción que se revierte, con dos personas
// con sesión. Todo sintético (R-19).
//
// El lote es el de `sinteticos/` con el ciclo de S07-R06 sin recorrer: la acción 15B-A01 queda
// `en_curso` (sin fecha, evidencia de ejecución ni eficacia) y la reevaluación 15B-R01 no está.
// Así el test recorre ese ciclo desde los casos de uso de la app y compara con lo que dicen los
// CSV y la regresión.

import assert from 'node:assert/strict'

import type { PedidoReevaluacion } from '../application/actualizacion.ts'
import { sesionVigente, type Sesion } from '../application/acceso.ts'
import { importarLote, leerContrato } from '../application/importar.ts'
import { FACTORES } from '../domain/organizacion.ts'
import { altaPersona } from '../persistence/acceso.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { HASH_SINTETICO } from '../persistence/fixtures.ts'
import { enTransaccionRevertida } from '../persistence/testing.ts'
import { aLote, FECHA_CORTE, filasDe, leerCarpeta, SINTETICOS, type Fila, type Filas } from './lotes.ts'

/** Las filas de las sintéticas tal como están en disco. */
export const filasSinteticas = (): Filas => filasDe(leerCarpeta(SINTETICOS))

/** Por `id_origen` (riesgos, acciones, coberturas) y por `evaluacion_id_origen` (evaluaciones). */
export function idsSinteticos(f: Filas = filasSinteticas()): Map<string, string> {
  const ids = new Map<string, string>()
  for (const r of f['risks.csv']) {
    ids.set(r.id_origen ?? '', r.risk_id ?? '')
    if ((r.evaluacion_id ?? '') !== '') ids.set(r.evaluacion_id_origen ?? '', r.evaluacion_id ?? '')
  }
  for (const a of f['action-plan.csv']) ids.set(a.id_origen ?? '', a.accion_id ?? '')
  for (const t of f['risk-transfer.csv']) ids.set(t.id_origen ?? '', (t.transferencia_id ?? '') !== '' ? (t.transferencia_id ?? '') : (t.evento_id ?? ''))
  return ids
}

export const id = (origen: string, ids: Map<string, string> = idsSinteticos()): string => {
  const x = ids.get(origen)
  if (x === undefined || x === '') throw new Error(`${origen} no está en las sintéticas`)
  return x
}

/** La fila de risks.csv de la reevaluación 15B-R01. */
export const filaR01 = (f: Filas = filasSinteticas()): Fila => {
  const r = f['risks.csv'].find((x) => x.evaluacion_id_origen === '15B-R01')
  assert.ok(r !== undefined)
  return r
}

/** Las sintéticas con el ciclo de S07-R06 sin recorrer (ver el encabezado). */
export function filasSinCicloS07(): Filas {
  const f = filasSinteticas()
  return {
    ...f,
    'risks.csv': f['risks.csv'].filter((r) => r.evaluacion_id_origen !== '15B-R01'),
    'action-plan.csv': f['action-plan.csv'].map((a) => a.id_origen !== '15B-A01' ? a : {
      ...a, estado: 'en_curso', fecha_cumplida: '', evidencia_ejecucion: '', efecto: '', efecto_nota: '', evaluacion_efecto_id: '',
    }),
  }
}

export const PERSONA = 'PER-01M50T00000000000000000001'
export const REVISOR = 'PER-01M50T00000000000000000002'

const sesionDe = async (tx: TransactionSql, personaId: string): Promise<Sesion> => {
  const [c] = await tx<{ id: string }[]>`select max(id)::text as id from risk.credencial where persona_id = ${personaId}`
  assert.ok(c !== undefined)
  const s = await sesionVigente(tx, personaId, c.id)
  assert.ok(s !== null)
  return s
}

export interface Escenario {
  readonly tx: TransactionSql
  /** La persona que opera los ciclos. */
  readonly sesion: Sesion
  /** Otra persona, que todavía no vio resultados de ninguna empresa. */
  readonly revisor: Sesion
}

/** Importa las filas, da de alta dos personas y corre `cuerpo`; al final, todo se revierte. */
export const conEscenario = (sql: Sql, cuerpo: (e: Escenario) => Promise<void>, filas: Filas = filasSinCicloS07()): Promise<void> =>
  enTransaccionRevertida(sql, async (tx) => {
    const r = await importarLote(tx, leerContrato(), aLote(leerContrato(), filas), { origen: 'test', importadoPor: 'test T-0031', fechaCorte: FECHA_CORTE })
    assert.equal(r.estado, 'importado', JSON.stringify(r).slice(0, 2000))
    await altaPersona(tx, { id: PERSONA, nombre: 'Operadora de prueba', usuario: 'operadora-de-prueba', hash: HASH_SINTETICO })
    await altaPersona(tx, { id: REVISOR, nombre: 'Revisor de prueba', usuario: 'revisor-de-prueba', hash: HASH_SINTETICO })
    await cuerpo({ tx, sesion: await sesionDe(tx, PERSONA), revisor: await sesionDe(tx, REVISOR) })
  })

/** Cuántas filas tiene cada tabla de `risk`: lo que una operación revertida no puede cambiar. */
export async function conteos(tx: TransactionSql): Promise<Record<string, number>> {
  const tablas = await tx<{ t: string }[]>`
    select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'risk' and c.relkind = 'r' order by 1`
  const n: Record<string, number> = {}
  for (const { t } of tablas) {
    const [f] = await tx<{ n: number }[]>`select count(*)::int as n from ${tx(`risk.${t}`)}`
    n[t] = f?.n ?? -1
  }
  return n
}

const num = (v: string | undefined): number | null => (v === undefined || v === '' ? null : Number(v))
const txt = (v: string | undefined): string | null => (v === undefined || v === '' ? null : v)

/** Una reevaluación con los valores de una fila de risks.csv, como la cargaría una persona en la app. */
export function reevaluacionDeFila(f: Fila, cambios: Partial<PedidoReevaluacion> = {}): PedidoReevaluacion {
  const factores = Object.fromEntries(FACTORES.map((x) => [x, {
    estado: f[`${x}_estado`] ?? '', valor: num(f[`${x}_valor`]), min: num(f[`${x}_min`]), max: num(f[`${x}_max`]),
    observacion: txt(f[`${x}_observacion`]),
  }])) as PedidoReevaluacion['factores']
  return {
    riskId: f.risk_id ?? '', motivo: f.motivo ?? '', accionId: txt(f.accion_id), fecha: f.fecha ?? '', factores,
    base: f.base ?? '', evidencia: f.evidencia ?? '', uncertainty: f.uncertainty ?? '', uncertaintyNota: txt(f.uncertainty_nota),
    necesidadValidacion: txt(f.necesidad_validacion), riesgoCausa: txt(f.riesgo_causa), riesgoEvento: f.riesgo_evento ?? '',
    riesgoConsecuencia: txt(f.riesgo_consecuencia), justificacion: txt(f.justificacion), montoBruto: txt(f.i_econ_monto_bruto),
    moneda: txt(f.moneda), ...cambios,
  }
}

/** La última evaluación de la cadena de un riesgo, como fila de risks.csv. */
export function ultimaFila(f: Filas, riskId: string): Fila {
  const propias = f['risks.csv'].filter((r) => r.risk_id === riskId && (r.evaluacion_id ?? '') !== '')
  const ultima = propias.find((r) => !propias.some((o) => o.evaluacion_anterior_id === r.evaluacion_id))
  assert.ok(ultima !== undefined, riskId)
  return ultima
}


/**
 * Una reevaluación de la última evaluación de un riesgo con una evidencia más: un cambio evaluativo
 * mínimo, porque una reevaluación materialmente idéntica a la vigente se rechaza.
 */
export function reevaluacionNueva(f: Filas, riskId: string, cambios: Partial<PedidoReevaluacion> = {}): PedidoReevaluacion {
  const fila = ultimaFila(f, riskId)
  return reevaluacionDeFila(fila, { evidencia: `${fila.evidencia ?? ''}, DOC-SINT-NUEVA`, ...cambios })
}
