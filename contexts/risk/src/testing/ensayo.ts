// Ensayo de la aceptación (T-0032, paso 4) con las sintéticas de la 15b: el recorrido que el
// owner hace con las cinco empresas reales, sobre cinco organizaciones sintéticas que hacen de
// H1 a H5, contra una base local vacía. Todo sintético (R-19).
//
// Cada paso va en su propia transacción, como en la app y en los scripts: así las fechas de
// importación, del orden previo y del primer acceso son distintas y se pueden comparar, que es
// lo que mide el script de aceptación. Por eso no corre dentro de una transacción revertida: el
// test lo corre sobre una base propia que crea y borra, y `cli-ensayo.ts` sobre
// delcampo_risk_dev vacía, para la evidencia.
//
// El recorrido, por empresa: un lote por organización (en H1, antes, un intento rechazado; en
// H2, después, el mismo lote otra vez), el orden previo del revisor antes de ver resultados, los
// ciclos de la operadora (en total diez, con los tres tipos de disparador), la revisión del
// revisor de cada evaluación vigente y un reordenamiento suyo con fundamento.

import assert from 'node:assert/strict'

import { sesionVigente, type Sesion } from '../application/acceso.ts'
import {
  cambiarEstadoAccion, cargarReevaluacion, cerrarConReevaluacion, cerrarSinCambio, pantallaOrdenPrevio, registrarNovedad,
  registrarOrdenPrevio, reordenar, revisar,
} from '../application/actualizacion.ts'
import { importarLote, leerContrato } from '../application/importar.ts'
import { vistaLista } from '../application/vistas.ts'
import type { Resultado } from '../domain/informe.ts'
import { rankingOrganizacion } from '../domain/lectura.ts'
import { VERSION_METODOLOGIA } from '../domain/modelo.ts'
import { aEvaluacion, aRiesgo } from '../domain/organizacion.ts'
import { armarLista } from '../domain/vistas.ts'
import { altaPersona } from '../persistence/acceso.ts'
import type { Sql } from '../persistence/database.ts'
import { HASH_SINTETICO } from '../persistence/fixtures.ts'
import { leerOrganizacion } from '../persistence/vistas.ts'
import { filaR01, filasSinCicloS07, filasSinteticas, id, reevaluacionDeFila, PERSONA, REVISOR } from './actualizacion.ts'
import { aLote, casoInvalido, FECHA_CORTE, type Filas } from './lotes.ts'

const V = VERSION_METODOLOGIA

/** Las cinco organizaciones sintéticas que hacen de H1 a H5, por un riesgo de cada una. */
export const RIESGOS_DEL_ENSAYO = { H1: 'S06-R01', H2: 'S07-R01', H3: 'S15-R01', H4: 'S28-R01', H5: 'S32-R01' } as const
type Codigo = keyof typeof RIESGOS_DEL_ENSAYO

/** Las filas de una sola organización: su lote. */
function filasDeOrganizacion(f: Filas, org: string): Filas {
  const riesgos = new Set(f['risks.csv'].filter((r) => r.organizacion_id === org).map((r) => r.risk_id))
  return {
    'risks.csv': f['risks.csv'].filter((r) => r.organizacion_id === org),
    'action-plan.csv': f['action-plan.csv'].filter((a) => riesgos.has(a.risk_id)),
    'risk-transfer.csv': f['risk-transfer.csv'].filter((t) => riesgos.has(t.risk_id)),
  }
}

const porRegla = (r: Resultado, severidad: 'rechazo' | 'aviso'): Record<string, number> => {
  const n: Record<string, number> = {}
  if (r.estado === 'ya_importado') return n
  for (const h of r.hallazgos) if (h.severidad === severidad) n[h.regla_id] = (n[h.regla_id] ?? 0) + 1
  return n
}

const intento = (fecha: string, r: Resultado) => ({
  fecha, estado: r.estado, huella: r.lote.huella, rechazos: porRegla(r, 'rechazo'), avisos: porRegla(r, 'aviso'),
})

const sesionDe = async (sql: Sql, personaId: string): Promise<Sesion> => {
  const [c] = await sql<{ id: string }[]>`select max(id)::text as id from risk.credencial where persona_id = ${personaId}`
  const s = await sesionVigente(sql, personaId, c?.id ?? '')
  assert.ok(s !== null)
  return s
}

/**
 * Corre el recorrido sobre una base de Risk OS migrada y vacía, y devuelve el manifiesto que el
 * owner armaría (el JSON que lee `pnpm --filter @del-campo/risk run aceptacion`).
 */
export async function ensayar(sql: Sql): Promise<unknown> {
  const [{ n } = { n: -1 }] = await sql<{ n: number }[]>`select count(*)::int as n from risk.riesgo`
  if (n !== 0) throw new Error('el ensayo necesita una base de Risk OS vacía')
  const [{ hoy } = { hoy: '' }] = await sql<{ hoy: string }[]>`select current_date::text as hoy`
  const contrato = leerContrato()
  const f = filasSinCicloS07()
  const orgDe = (origen: string): string => f['risks.csv'].find((r) => r.risk_id === id(origen))?.organizacion_id ?? ''
  const codigos = Object.keys(RIESGOS_DEL_ENSAYO) as Codigo[]
  const orgs = Object.fromEntries(codigos.map((c) => [c, orgDe(RIESGOS_DEL_ENSAYO[c])])) as Record<Codigo, string>
  assert.equal(new Set(Object.values(orgs)).size, 5)
  // La acción del ciclo de S07-R06 tiene que ser de una de las cinco.
  const riesgoA01 = f['action-plan.csv'].find((a) => a.id_origen === '15B-A01')?.risk_id ?? ''
  assert.ok(Object.values(orgs).includes(f['risks.csv'].find((r) => r.risk_id === riesgoA01)?.organizacion_id ?? ''))

  // 1. Importación: un lote por empresa (A6).
  const opciones = { origen: 'ensayo T-0032', importadoPor: 'ensayo T-0032', fechaCorte: FECHA_CORTE }
  const intentos: Record<Codigo, ReturnType<typeof intento>[]> = { H1: [], H2: [], H3: [], H4: [], H5: [] }
  const rechazado = await importarLote(sql, contrato, casoInvalido('RV-ACC-01'), opciones)
  assert.equal(rechazado.estado, 'rechazado')
  intentos.H1.push(intento(hoy, rechazado))
  for (const c of codigos) {
    const lote = aLote(contrato, filasDeOrganizacion(f, orgs[c]))
    const r = await importarLote(sql, contrato, lote, opciones)
    assert.equal(r.estado, 'importado', JSON.stringify(r).slice(0, 1000))
    intentos[c].push(intento(hoy, r))
    if (c === 'H2') {
      const otra = await importarLote(sql, contrato, lote, opciones)
      assert.equal(otra.estado, 'ya_importado')
      intentos[c].push(intento(hoy, otra))
    }
  }

  // 2. Personas: la operadora carga los ciclos; el revisor (R1) revisa.
  await sql.begin(async (tx) => {
    await altaPersona(tx, { id: PERSONA, nombre: 'Operadora del ensayo', usuario: 'operadora-del-ensayo', hash: HASH_SINTETICO })
    await altaPersona(tx, { id: REVISOR, nombre: 'Revisor del ensayo', usuario: 'revisor-del-ensayo', hash: HASH_SINTETICO })
  })
  const operadora = await sesionDe(sql, PERSONA)
  const revisor = await sesionDe(sql, REVISOR)

  // 3. Orden previo de R1 en cada empresa, con el material ciego y antes de ver resultados (A8a).
  //    Ordena en el orden de origen y da a cada objeto la banda que después calcula Risk OS (o Media).
  for (const c of codigos) {
    const p = await pantallaOrdenPrevio(sql, revisor, orgs[c])
    assert.ok(p !== null && !p.vioResultados)
    const d = await leerOrganizacion(sql, orgs[c])
    assert.ok(d !== null)
    const banda = new Map(armarLista(V, d).ranking.map((x) => [x.riskId, x.lectura.banda]))
    await registrarOrdenPrevio(sql, revisor, orgs[c], {
      materialRef: `material ciego del ensayo ${c}`,
      items: p.objetos.map((o, i) => ({ riskId: o.riskId, posicion: i + 1, banda: banda.get(o.riskId) ?? 'Media' })),
    })
  }

  // 4. Ciclos de la operadora (A7): la acción 15B-A01 cumplida, con su reevaluación; en cada
  //    empresa una información nueva y, en cuatro, además un cambio de contexto.
  const a = filasSinteticas()['action-plan.csv'].find((x) => x.id_origen === '15B-A01')
  const r = await cambiarEstadoAccion(sql, operadora, {
    accionId: id('15B-A01'), estado: 'cumplida', fechaCumplida: a?.fecha_cumplida ?? '', evidencia: a?.evidencia_ejecucion ?? '', comentario: 'Cumplida en el ensayo.',
  })
  assert.ok(r.revisionId !== null)
  const { evaluacionId } = await cargarReevaluacion(sql, operadora, reevaluacionDeFila(filaR01()))
  await cerrarConReevaluacion(sql, operadora, { revisionId: r.revisionId, evaluacionId })
  for (const [i, c] of codigos.entries()) {
    for (const tipo of i === 0 ? ['informacion_nueva'] : ['informacion_nueva', 'cambio_contexto']) {
      const nov = await registrarNovedad(sql, operadora, { riskId: id(RIESGOS_DEL_ENSAYO[c]), tipo, texto: `Novedad del ensayo en ${c}`, evidencia: 'DOC-ENSAYO' })
      assert.ok(nov.revisionId !== null)
      await cerrarSinCambio(sql, operadora, { revisionId: nov.revisionId, fundamento: 'Sin cambio en los factores (ensayo).' })
    }
  }

  // 5. Revisión de R1 (A8b y c): ve la lista, revisa cada evaluación vigente y reordena un par.
  for (const [i, c] of codigos.entries()) {
    const lista = await vistaLista(sql, revisor, V, orgs[c])
    assert.ok(lista !== null)
    const d = await leerOrganizacion(sql, orgs[c])
    assert.ok(d !== null)
    const vigentes = [...rankingOrganizacion(V, d.riesgos.map(aRiesgo), d.evaluaciones.map(aEvaluacion)).vigentes.values()]
    for (const e of vigentes) await revisar(sql, revisor, { evaluacionId: e.id }, 'accepted')
    const [primero, segundo] = lista.ranking
    assert.ok(primero !== undefined && segundo !== undefined)
    await reordenar(sql, revisor, V, orgs[c], {
      tipo: 'par', riskIdSube: segundo.riskId, riskIdBaja: primero.riskId, causa: 'desacuerdo_de_criterio_profesional',
      fundamento: `Fundamento del ensayo en ${c}.`, patron: i < 2 ? 'familia_s06' : 'otro',
    })
  }

  return {
    empresas: Object.fromEntries(codigos.map((c) => [c, { organizacionId: orgs[c], intentos: intentos[c] }])),
    personas: { R1: REVISOR, O1: PERSONA },
  }
}
