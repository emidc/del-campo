// Las reglas de presentación de RO01 §3 sobre las vistas de T-0030, con las 8 sintéticas
// importadas en `delcampo_risk_test` dentro de una transacción que se revierte. Lo que se prueba
// es la salida de los casos de uso: lo mismo que entregan los endpoints de `apps/risk` y lo que
// renderizan sus páginas (allí, `paginas.integration.test.ts` prueba el HTML).
//
//   1. `C_raw` sólo en el detalle, junto al vector completo y las dos banderas (H6).
//   2. Ninguna vista suma ni agrega `C_raw`: no hay otra clave con `C_raw` que la de la criticidad.
//   3. El techo plausible no entra al ranking: sólo en la cola y el detalle, y cambiarlo no mueve
//      ninguna posición.
//   4. El orden es de una organización: cada vista trae sólo sus riesgos, y el filtro por unidad
//      conserva las posiciones.
//   5. `unknown` se entrega como `unknown`, sin valor.
//   6. Cada fila dice qué evaluación usa; la no aceptada, rotulada.
//   7. Lo calculado lleva la versión.
// Más: la transferencia no tiene "riesgo neto", el cambio esperado es una hipótesis rotulada, y
// cada vista con resultados registra el acceso de la persona a esa organización.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { armarLista } from '../domain/vistas.ts'
import { numeroDePosicion, rankingOrganizacion } from '../domain/lectura.ts'
import { VERSION_METODOLOGIA } from '../domain/modelo.ts'
import type { DatosOrganizacion } from '../domain/organizacion.ts'
import { altaPersona, nuevaCredencial } from '../persistence/acceso.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { HASH_SINTETICO } from '../persistence/fixtures.ts'
import { leerParaCalculo } from '../persistence/importacion.ts'
import { enTransaccionRevertida, openTestDatabase } from '../persistence/testing.ts'
import { leerOrganizacion } from '../persistence/vistas.ts'
import { FECHA_CORTE, leerCarpeta, SINTETICOS } from '../testing/lotes.ts'
import { leerArchivo, LOTE_EMI41, REGRESION_EMI41 } from '../testing/sinteticos.ts'
import { sesionVigente, type Sesion } from './acceso.ts'
import { importarLote, leerContrato } from './importar.ts'
import {
  organizaciones, vistaActividad, vistaDetalle, vistaEscenarios, vistaLista, vistaPlan, vistaTransferencia,
} from './vistas.ts'

const V = VERSION_METODOLOGIA
const PERSONA = 'PER-01M50T00000000000000000000'

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await sql.end()
})

/** Las sintéticas importadas y una persona con credencial: el estado del que parte cada caso. */
const conSinteticas = (cuerpo: (tx: TransactionSql, sesion: Sesion) => Promise<void>): Promise<void> =>
  enTransaccionRevertida(sql, async (tx) => {
    const r = await importarLote(tx, leerContrato(), leerCarpeta(SINTETICOS), { origen: 'test', importadoPor: 'test T-0030', fechaCorte: FECHA_CORTE })
    assert.equal(r.estado, 'importado')
    await altaPersona(tx, { id: PERSONA, nombre: 'Persona de prueba', usuario: 'persona-de-prueba', hash: HASH_SINTETICO })
    const sesion = await sesionVigente(tx, PERSONA, await credencialId(tx))
    assert.ok(sesion !== null)
    await cuerpo(tx, sesion)
  })

const credencialId = async (tx: TransactionSql): Promise<string> => {
  const [f] = await tx<{ id: string }[]>`select max(id)::text as id from risk.credencial where persona_id = ${PERSONA}`
  assert.ok(f !== undefined)
  return f.id
}

/** Todas las rutas (`a.b[3].c`) de un valor JSON cuyo nombre de clave cumple `test`. */
function rutas(valor: unknown, test: (clave: string) => boolean, ruta = ''): string[] {
  if (Array.isArray(valor)) return valor.flatMap((v, i) => rutas(v, test, `${ruta}[${String(i)}]`))
  if (valor === null || typeof valor !== 'object') return []
  return Object.entries(valor).flatMap(([k, v]) => [...(test(k) ? [`${ruta}.${k}`] : []), ...rutas(v, test, `${ruta}.${k}`)])
}

/** Cada objeto anidado de un valor JSON, para revisar los que tienen una forma. */
function objetos(valor: unknown): Record<string, unknown>[] {
  if (Array.isArray(valor)) return valor.flatMap(objetos)
  if (valor === null || typeof valor !== 'object') return []
  return [valor as Record<string, unknown>, ...Object.values(valor).flatMap(objetos)]
}

const esCRaw = (k: string): boolean => /c_?raw/i.test(k)
const json = (x: unknown): unknown => JSON.parse(JSON.stringify(x))

const accesos = async (tx: TransactionSql): Promise<{ tipo: string; organizacion_id: string | null; vista: string | null }[]> =>
  (await tx<{ tipo: string; organizacion_id: string | null; vista: string | null }[]>`
    select tipo, organizacion_id, vista from risk.registro_acceso where persona_id = ${PERSONA} order by id`).map((f) => ({ ...f }))

describe('vistas de T-0030 sobre las 8 sintéticas (RO01 §3)', () => {
  it('las organizaciones son las 8 sintéticas, sin ningún derivado', async () => {
    await conSinteticas(async (tx, sesion) => {
      const os = await organizaciones(tx, sesion)
      assert.equal(os.length, 8)
      assert.deepEqual(rutas(json(os), (k) => esCRaw(k) || /banda|posicion|techo/i.test(k)), [])
    })
  })

  it('regla 1 y 2: C_raw sólo en la criticidad del detalle, con el vector completo y las dos banderas', async () => {
    await conSinteticas(async (tx, sesion) => {
      let detalles = 0
      for (const o of await organizaciones(tx, sesion)) {
        const org = o.organizacionId
        for (const vista of [
          await vistaLista(tx, sesion, V, org), await vistaEscenarios(tx, sesion, V, org), await vistaPlan(tx, sesion, org),
          await vistaTransferencia(tx, sesion, V, org), await vistaActividad(tx, sesion, org),
        ]) {
          assert.ok(vista !== null)
          assert.deepEqual(rutas(json(vista), esCRaw), [], `${org}: una vista que no es el detalle trae C_raw`)
        }
        const lista = await vistaLista(tx, sesion, V, org)
        assert.ok(lista !== null)
        const ids = [...lista.ranking.map((f) => f.riskId), ...lista.noEvaluables.map((f) => f.riskId)]
        for (const id of ids) {
          const d = json(await vistaDetalle(tx, sesion, V, id))
          detalles++
          const conCRaw = rutas(d, esCRaw)
          assert.ok(conCRaw.every((r) => /\.historial\[\d+\]\.criticidad\.cRaw$/.test(r)), `${id}: C_raw fuera de la criticidad: ${conCRaw.join(', ')}`)
          for (const c of objetos(d).filter((x) => 'cRaw' in x)) {
            assert.equal((c.vector as unknown[]).length, 7, `${id}: la criticidad no tiene el vector completo`)
            const b = c.banderas as Record<string, unknown>
            assert.equal(typeof b.consecuenciaExtrema, 'boolean')
            assert.equal(typeof b.safetyCritical, 'boolean')
          }
        }
      }
      assert.ok(detalles > 40)
    })
  })

  it('regla 4: el ranking es de una organización y coincide con rankingOrganizacion sobre lo importado', async () => {
    await conSinteticas(async (tx, sesion) => {
      const p = await leerParaCalculo(tx)
      for (const o of await organizaciones(tx, sesion)) {
        const lista = await vistaLista(tx, sesion, V, o.organizacionId)
        assert.ok(lista !== null)
        const propios = new Set(p.riesgos.filter((r) => r.organizacionId === o.organizacionId).map((r) => r.id))
        for (const f of [...lista.ranking, ...lista.seguridad, ...lista.noEvaluables, ...lista.cola]) {
          assert.ok(propios.has(f.riskId), `${f.riskId} no es de ${o.organizacionId}`)
        }
        const ranking = rankingOrganizacion(V, p.riesgos.filter((r) => propios.has(r.id)), p.evaluaciones.filter((e) => propios.has(e.riskId)))
        assert.deepEqual(lista.ranking.map((f) => [f.riskId, f.posicion]), ranking.posiciones.flatMap((x) => [...x.ids].sort().map((id) => [id, numeroDePosicion(ranking, id)])))
        const pos = lista.ranking.map((f) => f.posicion)
        assert.deepEqual(pos, [...pos].sort((a, b) => a - b), 'las posiciones no van en orden')
      }
    })
  })

  it('regla 4: en las organizaciones sin filas de la 15b, las posiciones son las de regresion-emi41.csv', async () => {
    // El oráculo externo de T-0028: una implementación independiente. Sin S15, cuyos riesgos
    // siguen historias de evaluadores distintos (ver `testing/regresion.ts`).
    const regresion = leerArchivo(REGRESION_EMI41)
    const unicas = new Map<string, string>()
    for (const f of regresion) unicas.set(f.risk_id ?? '', unicas.has(f.risk_id ?? '') ? '' : (f.resultado_nuevo ?? ''))
    await conSinteticas(async (tx, sesion) => {
      const p = await leerParaCalculo(tx)
      let comparadas = 0
      for (const o of await organizaciones(tx, sesion)) {
        if (o.referencias.includes('S15')) continue
        const propios = new Set(p.riesgos.filter((r) => r.organizacionId === o.organizacionId).map((r) => r.id))
        const sola15b = p.evaluaciones.some((e) => propios.has(e.riskId) && p.origen.get(e.id)?.loteOrigen !== LOTE_EMI41)
        if (sola15b) continue
        const lista = await vistaLista(tx, sesion, V, o.organizacionId)
        assert.ok(lista !== null)
        for (const f of lista.ranking) {
          // Un riesgo que la regresión evalúa con más de un evaluador no tiene una sola posición.
          const esperado = /· pos (\d+)/.exec(unicas.get(f.idOrigen ?? '') ?? '')?.[1]
          if (esperado === undefined) continue
          assert.equal(f.posicion, Number(esperado), f.idOrigen ?? '')
          comparadas++
        }
      }
      console.log(`posiciones comparadas con regresion-emi41.csv: ${String(comparadas)}`)
      assert.ok(comparadas >= 10, `sólo ${String(comparadas)} posiciones comparadas con la regresión`)
    })
  })

  it('regla 3: el techo plausible sólo está en la cola y el detalle, y no mueve ninguna posición', async () => {
    await conSinteticas(async (tx, sesion) => {
      for (const o of await organizaciones(tx, sesion)) {
        const lista = json(await vistaLista(tx, sesion, V, o.organizacionId))
        assert.ok(rutas(lista, (k) => /techo/i.test(k)).every((r) => /^\.cola\[\d+\]\.techoPlausible$/.test(r)))
        for (const v of [await vistaEscenarios(tx, sesion, V, o.organizacionId), await vistaTransferencia(tx, sesion, V, o.organizacionId), await vistaPlan(tx, sesion, o.organizacionId)]) {
          assert.deepEqual(rutas(json(v), (k) => /techo/i.test(k)), [])
        }

        // Lo que fija el techo son las cotas máximas de los rangos (§6.6). Llevarlas todas a 5
        // cambia el techo y no cambia ninguna posición del ranking.
        const d = await leerOrganizacion(tx, o.organizacionId)
        assert.ok(d !== null)
        const techoAlto: DatosOrganizacion = {
          ...d,
          evaluaciones: d.evaluaciones.map((e) => ({
            ...e,
            factores: Object.fromEntries(Object.entries(e.factores).map(([k, f]) => [k, f.max === null ? f : { ...f, max: 5 }])) as typeof e.factores,
          })),
        }
        const antes = armarLista(V, d)
        const despues = armarLista(V, techoAlto)
        assert.deepEqual(despues.ranking.map((f) => [f.riskId, f.posicion]), antes.ranking.map((f) => [f.riskId, f.posicion]))
      }
    })
  })

  it('regla 4: el filtro por unidad oculta filas y conserva las posiciones de la organización', async () => {
    await conSinteticas(async (tx, sesion) => {
      const [o] = (await organizaciones(tx, sesion)).filter((x) => x.referencias.includes('S05'))
      assert.ok(o !== undefined)
      // Las sintéticas no traen unidades: se asignan dos, alternadas, a lo leído de la base.
      const d = await leerOrganizacion(tx, o.organizacionId)
      assert.ok(d !== null)
      const conUnidades: DatosOrganizacion = { ...d, riesgos: d.riesgos.map((r, i) => ({ ...r, unidadId: i % 2 === 0 ? 'U-NORTE' : 'U-SUR' })) }
      const toda = armarLista(V, conUnidades)
      const norte = armarLista(V, conUnidades, 'U-NORTE')
      assert.deepEqual(toda.unidades, ['U-NORTE', 'U-SUR'])
      assert.ok(norte.ranking.length > 0 && norte.ranking.length < toda.ranking.length)
      const posicionEnToda = new Map(toda.ranking.map((f) => [f.riskId, f.posicion]))
      for (const f of norte.ranking) {
        assert.equal(f.unidadId, 'U-NORTE')
        assert.equal(f.posicion, posicionEnToda.get(f.riskId), `${f.idOrigen ?? ''} cambió de posición con el filtro`)
      }
      assert.throws(() => armarLista(V, conUnidades, 'U-OTRA'))
      // Por el caso de uso: una unidad que la organización no tiene es `null`, y no registra acceso.
      assert.equal(await vistaLista(tx, sesion, V, o.organizacionId, 'U-NORTE'), null)
      assert.deepEqual(await accesos(tx), [])
    })
  })

  it('regla 5: un unknown se entrega como unknown, sin valor', async () => {
    await conSinteticas(async (tx, sesion) => {
      let unknowns = 0
      for (const o of await organizaciones(tx, sesion)) {
        const lista = await vistaLista(tx, sesion, V, o.organizacionId)
        for (const f of objetos(json(lista)).filter((x) => 'factor' in x && 'estado' in x)) {
          if (f.estado === 'unknown') {
            unknowns++
            assert.equal(f.valor, null)
          } else if (f.estado === 'known') assert.equal(typeof f.valor, 'number')
        }
      }
      assert.ok(unknowns > 0)
    })
  })

  it('regla 6: cada fila dice qué evaluación usa, y la no aceptada va rotulada', async () => {
    await conSinteticas(async (tx, sesion) => {
      const rotulos = new Set<string>()
      for (const o of await organizaciones(tx, sesion)) {
        const lista = await vistaLista(tx, sesion, V, o.organizacionId)
        assert.ok(lista !== null)
        for (const f of [...lista.ranking, ...lista.seguridad, ...lista.cola]) {
          assert.match(f.lectura.evaluacion.id, /^EVA-/)
          assert.equal(f.lectura.evaluacion.rotulo, f.lectura.evaluacion.reviewStatus === 'accepted' ? 'aceptada' : 'pendiente de revisión')
          rotulos.add(f.lectura.evaluacion.rotulo)
        }
      }
      // Las sintéticas tienen exactamente una evaluación aceptada (punto abierto 5 de T-0029).
      assert.deepEqual([...rotulos].sort(), ['aceptada', 'pendiente de revisión'])
    })
  })

  it('regla 7: lo calculado lleva la versión; los eventos de póliza, su rótulo; la transferencia, ningún riesgo neto', async () => {
    await conSinteticas(async (tx, sesion) => {
      let coberturas = 0
      let cambios = 0
      for (const o of await organizaciones(tx, sesion)) {
        const org = o.organizacionId
        for (const v of [await vistaLista(tx, sesion, V, org), await vistaEscenarios(tx, sesion, V, org), await vistaTransferencia(tx, sesion, V, org)]) {
          assert.equal(v?.version, V)
        }
        const t = await vistaTransferencia(tx, sesion, V, org)
        assert.ok(t !== null)
        assert.deepEqual(rutas(json(t), (k) => /neto|net/i.test(k)), [])
        for (const c of t.riesgos.flatMap((r) => r.coberturas)) {
          coberturas++
          assert.equal(c.limiteDisponible.version, V)
          for (const e of c.eventos) assert.match(e.rotulo, /observación local/)
        }
        const plan = await vistaPlan(tx, sesion, org)
        for (const a of plan?.riesgos.flatMap((r) => r.acciones) ?? []) {
          if (a.cambioEsperado === null) continue
          cambios++
          assert.match(a.cambioEsperado.rotulo, /hipótesis/)
        }
        const lista = await vistaLista(tx, sesion, V, org)
        for (const id of lista?.ranking.map((f) => f.riskId) ?? []) {
          const d = await vistaDetalle(tx, sesion, V, id)
          for (const e of d?.historial ?? []) {
            assert.equal(e.criticidad.version, V)
            assert.equal(e.techoPlausible.version, V)
          }
        }
      }
      assert.ok(coberturas > 0 && cambios > 0)
    })
  })

  it('acceso: cada vista con resultados registra persona, organización y vista; las demás no', async () => {
    await conSinteticas(async (tx, sesion) => {
      const [o] = await organizaciones(tx, sesion)
      assert.ok(o !== undefined)
      const org = o.organizacionId
      await vistaPlan(tx, sesion, org)
      await vistaTransferencia(tx, sesion, V, org)
      await vistaActividad(tx, sesion, org)
      assert.deepEqual(await accesos(tx), [])
      const lista = await vistaLista(tx, sesion, V, org)
      await vistaEscenarios(tx, sesion, V, org)
      const id = lista?.ranking[0]?.riskId
      assert.ok(id !== undefined)
      await vistaDetalle(tx, sesion, V, id)
      assert.deepEqual(await accesos(tx), [
        { tipo: 'vista_resultados', organizacion_id: org, vista: 'lista' },
        { tipo: 'vista_resultados', organizacion_id: org, vista: 'escenarios' },
        { tipo: 'vista_resultados', organizacion_id: org, vista: 'detalle' },
      ])
      // Lo que no existe no devuelve nada ni registra nada.
      assert.equal(await vistaLista(tx, sesion, V, 'ORG-QUE-NO-EXISTE'), null)
      assert.equal(await vistaDetalle(tx, sesion, V, 'RSK-00000000000000000000000000'), null)
      assert.equal((await accesos(tx)).length, 3)
    })
  })

  it('acceso: la baja de la persona deja su sesión sin valor', async () => {
    await conSinteticas(async (tx, sesion) => {
      assert.ok(await sesionVigente(tx, sesion.personaId, sesion.credencialId))
      await nuevaCredencial(tx, PERSONA, null)
      assert.equal(await sesionVigente(tx, sesion.personaId, sesion.credencialId), null)
    })
  })
})
