// El script de aceptación (T-0032) sobre el ensayo con las sintéticas: el recorrido completo
// cumple A6, A7, A8, A9 y A12; lo que falta en el manifiesto o en la base no cumple; y el
// informe no tiene títulos, textos, observaciones, montos, nombres ni ids de organización (R-19).
//
// El ensayo escribe cada paso en su propia transacción, así que no corre en delcampo_risk_test,
// que no se vacía: el test crea su propia base al lado, en el mismo servidor local, y la borra.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import postgres from 'postgres'

import { connect, notLocalDatabase, type Sql } from '../persistence/database.ts'
import { migrate } from '../persistence/migrations.ts'
import { testDatabaseUrl } from '../persistence/testing.ts'
import { sesionVigente } from '../application/acceso.ts'
import { cargarReevaluacion, revisar } from '../application/actualizacion.ts'
import { armarLista } from '../domain/vistas.ts'
import { VERSION_METODOLOGIA } from '../domain/modelo.ts'
import type { DatosOrganizacion, OrdenPrevioRegistrado } from '../domain/organizacion.ts'
import { filasSinCicloS07, PERSONA, reevaluacionNueva } from '../testing/actualizacion.ts'
import { ensayar } from '../testing/ensayo.ts'
import { leerParaAceptacion, type LecturaAceptacion } from './lectura.ts'
import { leerManifiesto, type Manifiesto } from './manifiesto.ts'
import { informeAceptacion, medir } from './medicion.ts'

const BASE_DEL_ENSAYO = 'delcampo_risk_ensayo_t0032_test'

let sql: Sql
let manifiesto: Manifiesto
let lectura: LecturaAceptacion
let admin: postgres.Sql

before(async () => {
  const raw = testDatabaseUrl()
  const refusal = notLocalDatabase(raw)
  if (refusal !== null) throw new Error(`tests de risk abortados: ${refusal}`)
  const url = new URL(raw)
  url.pathname = '/postgres'
  admin = postgres(url.href, { max: 1, onnotice: () => undefined })
  await admin.unsafe(`drop database if exists ${BASE_DEL_ENSAYO} with (force)`)
  await admin.unsafe(`create database ${BASE_DEL_ENSAYO}`)
  url.pathname = `/${BASE_DEL_ENSAYO}`
  sql = connect(url.href)
  await migrate(sql)
  manifiesto = leerManifiesto(JSON.parse(JSON.stringify(await ensayar(sql))))
  lectura = await leerParaAceptacion(sql, manifiesto)
})

after(async () => {
  await sql.end()
  await admin.unsafe(`drop database if exists ${BASE_DEL_ENSAYO} with (force)`)
  await admin.end()
})

/** Todo texto libre de la base: lo que el informe no puede tener. */
async function textosDeLaBase(): Promise<string[]> {
  const filas = await sql<{ v: string }[]>`
    select titulo as v from risk.riesgo
    union select coalesce(riesgo_causa, '') from risk.evaluacion union select coalesce(riesgo_evento, '') from risk.evaluacion
    union select coalesce(riesgo_consecuencia, '') from risk.evaluacion union select coalesce(evaluador, '') from risk.evaluacion
    union select descripcion from risk.accion union select texto from risk.novedad union select fundamento from risk.reordenamiento
    union select fundamento from risk.cierre_revision where fundamento is not null union select material_ref from risk.orden_previo
    union select nombre from risk.persona union select usuario from risk.usuario
    union select organizacion_id from risk.riesgo union select id from risk.persona
    union select coalesce(cobertura, '') from risk.transferencia union select coalesce(limite_monto::text, '') from risk.transferencia
    union select coalesce(deducible_monto::text, '') from risk.transferencia`
  return filas.map((f) => f.v).filter((v) => v.trim().length >= 5)
}

describe('aceptación de RO01 §6 sobre el ensayo con sintéticas', () => {
  it('el recorrido completo cumple A6, A7, A8, A9 y A12', () => {
    const r = medir(manifiesto, lectura)
    assert.equal(r.a6.cumple, true, JSON.stringify(r.a6))
    assert.deepEqual(r.a6.porEmpresa.map((e) => e.porEstado), [
      { rechazado: 1, importado: 1 }, { importado: 1, ya_importado: 1 }, { importado: 1 }, { importado: 1 }, { importado: 1 },
    ])
    assert.ok(Object.keys(r.a6.porEmpresa[0]?.rechazosPorRegla ?? {}).includes('RV-ACC-01'))
    assert.equal(r.a7.cumple, true, r.a7.faltas.join('; '))
    assert.equal(r.a7.ciclos, 10)
    assert.deepEqual(r.a7.porDisparador, { accion_ejecutada: 1, cambio_contexto: 4, informacion_nueva: 5 })
    assert.ok(r.a7.porEmpresa.every((e) => e.ciclos >= 1))
    assert.equal(r.a8.cumple, true, JSON.stringify(r.a8))
    assert.ok(r.a8.porEmpresa.every((e) => e.previoAntesDelAcceso && e.vigentes > 0 && e.vigentesRevisadas === e.vigentes && e.reordenamientos === 1))
    assert.equal(r.a9.cumple, true, JSON.stringify(r.a9))
    assert.ok(r.a9.porEmpresa.every((e) => e.conCRaw > 0))
    assert.equal(r.a12.cumple, true, JSON.stringify(r.a12))
    assert.equal(r.a12.ciclos, 10)
    assert.equal(r.cumplenTodos, true)
    // Los disparadores: el revisor reordenó con el patrón de la familia S06 en H1 y H2, y dio la banda calculada.
    assert.deepEqual(r.disparadores.familiaS06, { empresas: ['H1', 'H2'], dispara: true })
    assert.equal(r.disparadores.bandas.coinciden, r.disparadores.bandas.n)
    assert.ok(r.disparadores.bandas.n > 0)
  })

  it('el informe sólo tiene códigos, conteos, fechas, reglas, huellas e ids de riesgo y de revisión', async () => {
    const informe = informeAceptacion(medir(manifiesto, lectura)).join('\n')
    assert.match(informe, /todos cumplen/)
    for (const t of await textosDeLaBase()) assert.ok(!informe.includes(t), `el informe tiene un texto de la base (${String(t.length)} caracteres)`)
    assert.doesNotMatch(informe, /\b(ORG|PER|EVA|ACC|TRF|NOV|ROR|OPR)-[0-9A-Z]{26}\b|DOC-ENSAYO|ensayo/i)
    for (const id of informe.match(/\b[A-Z]{3}-[0-9A-Z]{26}\b/g) ?? []) assert.match(id, /^(RSK|REV)-/)
  })

  it('leer para la aceptación no escribe nada ni registra accesos', async () => {
    const antes = await sql<{ n: number }[]>`select count(*)::int as n from risk.registro_acceso`
    await leerParaAceptacion(sql, manifiesto)
    assert.deepEqual(await sql<{ n: number }[]>`select count(*)::int as n from risk.registro_acceso`, antes)
  })

  it('lo que falta en el manifiesto o en la base no cumple, y el informe lo dice sin datos', async () => {
    const base = JSON.parse(JSON.stringify(manifiesto)) as { empresas: Record<string, { organizacionId: string; intentos: unknown[] }>; personas: Record<string, string> }

    // Otro revisor: la operadora no registró orden previo ni revisó.
    const otroRevisor = leerManifiesto({ ...base, personas: { R1: PERSONA } })
    const r1 = medir(otroRevisor, lectura)
    assert.equal(r1.a8.cumple, false)
    assert.ok(r1.a8.porEmpresa.every((e) => !e.cumpleA))
    assert.equal(r1.a6.cumple && r1.a7.cumple && r1.a9.cumple && r1.a12.cumple, true)

    // A8a pide el orden completo y una banda en cada posición: un riesgo sin posición o una posición sin banda no cumple.
    const h1 = manifiesto.empresas.H1.organizacionId
    const d1: DatosOrganizacion | undefined = lectura.datos.get(h1)
    assert.ok(d1 !== undefined)
    type Items = OrdenPrevioRegistrado['items']
    const conPrevio = (cambiar: (items: Items) => Items): LecturaAceptacion => ({
      ...lectura, datos: new Map([...lectura.datos, [h1, { ...d1, ordenesPrevios: d1.ordenesPrevios.map((o) => ({ ...o, items: cambiar(o.items) })) }]]),
    })
    const incompleto = medir(manifiesto, conPrevio((items) => items.slice(1))).a8.porEmpresa.find((e) => e.empresa === 'H1')
    assert.equal(incompleto?.cumpleA, false)
    assert.equal(incompleto.ordenPrevio?.sinPosicion, 1)
    const sinBanda = medir(manifiesto, conPrevio((items) => items.map((i, n) => (n === 0 ? { ...i, banda: null } : i)))).a8.porEmpresa.find((e) => e.empresa === 'H1')
    assert.equal(sinBanda?.cumpleA, false)
    assert.equal(sinBanda.ordenPrevio?.sinPosicion, 0)
    assert.ok(medir(manifiesto, lectura).a8.porEmpresa.every((e) => e.ordenPrevio !== null && e.ordenPrevio.sinPosicion === 0))

    // Un lote de la base que el manifiesto no declara.
    const sinLote = leerManifiesto({ ...base, empresas: { ...base.empresas, H3: { ...base.empresas.H3, intentos: [{ fecha: '2026-10-01', estado: 'rechazado', huella: 'a'.repeat(64), rechazos: { 'RV-RSK-01': 1 }, avisos: {} }] } } })
    const r2 = medir(sinLote, lectura)
    assert.equal(r2.a6.cumple, false)
    assert.deepEqual(r2.a6.porEmpresa.find((e) => e.empresa === 'H3')?.faltas, [
      'ningún intento quedó importado', '1 lotes de la base con filas de esta empresa no están en el manifiesto',
    ])

    // Una empresa que no está en la base: A6, A7 y A8 no cumplen.
    const vacia = leerManifiesto({ ...base, empresas: { ...base.empresas, H5: { ...base.empresas.H5, organizacionId: 'ORG-01M3QSRT00SZK5202RV34YJQRP' } } })
    const r3 = medir(vacia, await leerParaAceptacion(sql, vacia))
    assert.equal(r3.a6.cumple || r3.a7.cumple || r3.a8.cumple, false)
    assert.equal(r3.cumplenTodos, false)
    const informe = informeAceptacion(r3).join('\n')
    assert.match(informe, /H5: 0 \(—\)/)
    assert.doesNotMatch(informe, /ORG-/)
  })

  // Último: escribe en la base del ensayo.
  it('los disparadores comparan con el ranking de cuando R1 registró su orden, no con el de hoy', async () => {
    const antes = medir(manifiesto, lectura).disparadores
    const org = manifiesto.empresas.H1.organizacionId
    const d = lectura.datos.get(org)
    assert.ok(d !== undefined)
    const primero = armarLista(VERSION_METODOLOGIA, d).ranking[0]
    assert.ok(primero !== undefined)
    // La operadora baja la probabilidad del primero de H1 y acepta esa reevaluación: cambia el ranking de hoy.
    const [c] = await sql<{ id: string }[]>`select max(id)::text as id from risk.credencial where persona_id = ${PERSONA}`
    const operadora = await sesionVigente(sql, PERSONA, c?.id ?? '')
    assert.ok(operadora !== null)
    const pedido = reevaluacionNueva(filasSinCicloS07(), primero.riskId, { motivo: 'correccion_evaluacion', accionId: null, fecha: '2026-10-16' })
    const { evaluacionId } = await cargarReevaluacion(sql, operadora, {
      ...pedido, factores: { ...pedido.factores, p: { estado: 'known', valor: 1, min: null, max: null, observacion: 'Baja en el ensayo.' } },
    })
    await revisar(sql, operadora, { evaluacionId }, 'accepted')
    const despues = await leerParaAceptacion(sql, manifiesto)
    const hoy = armarLista(VERSION_METODOLOGIA, despues.datos.get(org) ?? d).ranking
    assert.notEqual(hoy[0]?.riskId, primero.riskId, 'la reevaluación tiene que cambiar el ranking de hoy')
    const r = medir(manifiesto, despues)
    assert.deepEqual(r.disparadores, antes)
    // La evaluación nueva es vigente y R1 no la revisó: A8b de H1 deja de cumplir.
    assert.equal(r.a8.porEmpresa.find((e) => e.empresa === 'H1')?.cumpleB, false)
  })
})
