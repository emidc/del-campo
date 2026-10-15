// Las reglas de presentación de RO01 §3 sobre el HTML que ve la persona: cada página de la app
// renderizada con `renderToStaticMarkup` sobre las 8 sintéticas, importadas en
// `delcampo_risk_test` dentro de una transacción que se revierte. Y los endpoints de datos con
// una sesión válida, sobre la misma transacción.
//
// La app no toca la base sino a través de @del-campo/risk (R-25): migra, importa y lee con lo que
// exporta su raíz. Los CSV sintéticos se leen en su lugar, en SPIKES/T-0021, sin copiarlos.

import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import {
  connect, importarLote, leerArchivosDeLote, leerContrato, migrate, organizaciones, sesionVigente, VERSION_METODOLOGIA, vistaActividad,
  vistaDetalle, vistaEscenarios, vistaLista, vistaPlan, vistaTransferencia, type Sesion, type Sql, type TransactionSql,
} from '@del-campo/risk'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { guardRequest } from '../lib/guard.ts'
import { detalleResponse, organizacionesResponse, VISTAS_DE_ORGANIZACION, vistaDeOrganizacionResponse } from '../lib/handlers.ts'
import { issueSession, SESSION_COOKIE } from '../lib/sesion.ts'
import { PaginaDetalle } from './detalle.ts'
import { PaginaOrganizaciones } from './inicio.ts'
import { PaginaLista } from './lista.ts'
import { PaginaEscenarios, PaginaPlan, PaginaTransferencia } from './organizacion.ts'

const V = VERSION_METODOLOGIA
const TEST_DATABASE = 'delcampo_risk_test'
const SINTETICOS = fileURLToPath(new URL('../../../../SPIKES/T-0021/v0/fase-15/sinteticos/', import.meta.url))
const PERSONA = 'PER-01M50T00000000000000000004'
const HASH = `scrypt:32768:8:1:${Buffer.alloc(16).toString('base64')}:${Buffer.alloc(32).toString('base64')}`
const SECRET = 'secreto-de-sesion-de-prueba-0123456789abcdef'

/** La misma base que los tests del contexto: RISK_DATABASE_URL o DATABASE_URL con otro nombre (la guarda ya las validó). */
const testUrl = (): string => {
  const own = process.env.RISK_DATABASE_URL
  const url = new URL(own !== undefined && own !== '' ? own : (process.env.DATABASE_URL ?? 'postgres://localhost:5432/postgres'))
  if (own === undefined || own === '') url.pathname = `/${TEST_DATABASE}`
  if (url.pathname !== `/${TEST_DATABASE}`) throw new Error(`este test importa y revierte: sólo corre sobre ${TEST_DATABASE}`)
  return url.href
}

let sql: Sql
before(async () => {
  const url = new URL(testUrl())
  const admin = new URL(url.href)
  admin.pathname = '/postgres'
  const root = connect(admin.href)
  try {
    const existe = await root`select 1 from pg_database where datname = ${TEST_DATABASE}`
    if (existe.length === 0) await root.unsafe(`create database ${TEST_DATABASE}`)
  } finally {
    await root.end()
  }
  sql = connect(url.href)
  await migrate(sql)
})
after(async () => {
  await sql.end()
})

class Revertir extends Error {}

/** Las sintéticas importadas y una persona con credencial, en una transacción que se revierte. */
const conSinteticas = async (cuerpo: (tx: TransactionSql, sesion: Sesion) => Promise<void>): Promise<void> => {
  try {
    await sql.begin(async (tx) => {
      const r = await importarLote(tx, leerContrato(), leerArchivosDeLote(SINTETICOS), { origen: 'test', importadoPor: 'test T-0030', fechaCorte: '2026-10-14' })
      assert.equal(r.estado, 'importado')
      await tx`insert into risk.persona ${tx({ id: PERSONA, nombre: 'Persona de prueba' })}`
      await tx`insert into risk.usuario ${tx({ usuario: 'persona-de-prueba', persona_id: PERSONA })}`
      await tx`insert into risk.credencial ${tx({ persona_id: PERSONA, password_hash: HASH })}`
      const [c] = await tx<{ id: string }[]>`select max(id)::text as id from risk.credencial where persona_id = ${PERSONA}`
      const sesion = await sesionVigente(tx, PERSONA, c?.id ?? '')
      assert.ok(sesion !== null)
      await cuerpo(tx, sesion)
      throw new Revertir()
    })
  } catch (e) {
    if (!(e instanceof Revertir)) throw e
  }
}

interface Pagina {
  readonly nombre: string
  readonly vista: 'organizaciones' | 'lista' | 'escenarios' | 'plan' | 'transferencia' | 'detalle'
  readonly html: string
}

/** Todas las páginas de las 8 organizaciones, y el detalle de cada objeto del ranking, de los no evaluables y de los escenarios. */
async function paginas(tx: TransactionSql, sesion: Sesion): Promise<Pagina[]> {
  const html = (e: ReactElement): string => renderToStaticMarkup(e)
  const os = await organizaciones(tx, sesion)
  const ps: Pagina[] = [{ nombre: 'organizaciones', vista: 'organizaciones', html: html(PaginaOrganizaciones(os, sesion.nombre)) }]
  for (const { organizacionId: org } of os) {
    const lista = await vistaLista(tx, sesion, V, org)
    const escenarios = await vistaEscenarios(tx, sesion, V, org)
    const plan = await vistaPlan(tx, sesion, org)
    const transferencia = await vistaTransferencia(tx, sesion, V, org)
    const actividad = await vistaActividad(tx, sesion, org)
    assert.ok(lista !== null && escenarios !== null && plan !== null && transferencia !== null && actividad !== null)
    ps.push(
      { nombre: `lista ${org}`, vista: 'lista', html: html(PaginaLista(lista, sesion.nombre)) },
      { nombre: `escenarios ${org}`, vista: 'escenarios', html: html(PaginaEscenarios(escenarios, sesion.nombre)) },
      { nombre: `plan ${org}`, vista: 'plan', html: html(PaginaPlan(plan, sesion.nombre)) },
      { nombre: `transferencia ${org}`, vista: 'transferencia', html: html(PaginaTransferencia(transferencia, actividad, sesion.nombre)) },
    )
    const ids = new Set([
      ...lista.ranking.flatMap((f) => [f.riskId, ...(f.padre?.hijos.map((h) => h.riskId) ?? [])]),
      ...lista.noEvaluables.map((f) => f.riskId),
      ...escenarios.escenarios.flatMap((e) => [e.riskId, ...e.miembros.map((m) => m.riskId)]),
    ])
    for (const id of ids) {
      const d = await vistaDetalle(tx, sesion, V, id)
      assert.ok(d !== null)
      ps.push({ nombre: `detalle ${id}`, vista: 'detalle', html: html(PaginaDetalle(d, sesion.nombre)) })
    }
  }
  return ps
}

/** Las filas marcadas (`<tr data-fila="…">…</tr>`); ninguna tiene otra tabla adentro. */
const filas = (html: string): { readonly tipo: string; readonly html: string }[] =>
  [...html.matchAll(/<tr[^>]*data-fila="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => ({ tipo: m[1] ?? '', html: m[0] }))
const cuenta = (html: string, re: RegExp): number => [...html.matchAll(re)].length

let todas: Pagina[] = []
describe('HTML de las vistas sobre las 8 sintéticas (RO01 §3)', () => {
  before(async () => {
    await conSinteticas(async (tx, sesion) => {
      todas = await paginas(tx, sesion)
    })
  })

  it('renderiza todas las páginas', () => {
    assert.equal(todas.filter((p) => p.vista === 'lista').length, 8)
    assert.ok(todas.filter((p) => p.vista === 'detalle').length > 40)
  })

  it('regla 1: C_raw sólo aparece en el detalle, en una fila con el vector completo y las dos banderas', () => {
    let criticidades = 0
    for (const p of todas) {
      if (p.vista !== 'detalle') {
        assert.equal(cuenta(p.html, /data-c-raw/g), 0, `${p.nombre} trae C_raw`)
        assert.ok(!/c_?raw/i.test(p.html), `${p.nombre} nombra C_raw`)
        continue
      }
      const conCRaw = filas(p.html).filter((f) => f.html.includes('data-c-raw'))
      assert.equal(cuenta(p.html, /data-c-raw/g), conCRaw.length, `${p.nombre}: un C_raw fuera de una fila marcada`)
      for (const f of conCRaw) {
        criticidades++
        assert.equal(f.tipo, 'criticidad')
        assert.equal(cuenta(f.html, /data-factor=/g), 7, `${p.nombre}: la fila de C_raw no tiene los 7 factores`)
        assert.equal(cuenta(f.html, /data-bandera="consecuencia_extrema"/g), 1)
        assert.equal(cuenta(f.html, /data-bandera="safety_critical"/g), 1)
      }
    }
    assert.ok(criticidades > 40)
  })

  it('regla 1: toda fila que muestra factores muestra los 7 y las dos banderas', () => {
    let n = 0
    for (const p of todas) {
      for (const f of filas(p.html)) {
        if (!f.html.includes('data-factor=')) {
          assert.match(f.html, /sin evaluación vigente|no tiene evaluación propia/, `${p.nombre}: una fila ${f.tipo} sin factores ni motivo`)
          continue
        }
        n++
        assert.equal(cuenta(f.html, /data-factor=/g), 7, `${p.nombre}: fila ${f.tipo} con el vector incompleto`)
        assert.equal(cuenta(f.html, /data-bandera=/g), 2, `${p.nombre}: fila ${f.tipo} sin las dos banderas`)
      }
    }
    assert.ok(n > 100)
  })

  it('regla 3: el techo plausible sólo está en la cola y en el detalle, nunca en una fila del ranking ni en la criticidad', () => {
    for (const p of todas) {
      const techos = cuenta(p.html, /data-techo=/g)
      if (p.vista !== 'lista' && p.vista !== 'detalle') assert.equal(techos, 0, `${p.nombre} trae el techo`)
      for (const f of filas(p.html)) {
        if (f.tipo !== 'cola') assert.ok(!f.html.includes('data-techo'), `${p.nombre}: techo en una fila ${f.tipo}`)
      }
      if (p.vista === 'lista') assert.equal(techos, filas(p.html).filter((f) => f.tipo === 'cola').length)
    }
  })

  it('regla 4: la lista de una organización sólo enlaza riesgos de esa organización', async () => {
    await conSinteticas(async (tx, sesion) => {
      for (const o of await organizaciones(tx, sesion)) {
        const p = todas.find((x) => x.nombre === `lista ${o.organizacionId}`)
        assert.ok(p !== undefined)
        const riesgos = await tx<{ id: string }[]>`select id from risk.riesgo where organizacion_id = ${o.organizacionId}`
        const propios = new Set(riesgos.map((r) => r.id))
        for (const m of p.html.matchAll(/data-risk-id="([^"]+)"/g)) assert.ok(propios.has(m[1] ?? ''), `${m[1] ?? ''} no es de ${o.organizacionId}`)
      }
    })
  })

  it('regla 5: un unknown se muestra como unknown', () => {
    let n = 0
    for (const p of todas) {
      for (const m of p.html.matchAll(/<td[^>]*data-estado="unknown"[^>]*>([^<]*)<\/td>/g)) {
        n++
        assert.match(m[1] ?? '', /^unknown/)
      }
    }
    assert.ok(n > 0)
  })

  it('regla 6: cada fila del ranking, de seguridad y de la cola dice qué evaluación usa', () => {
    for (const p of todas.filter((x) => x.vista === 'lista')) {
      for (const f of filas(p.html).filter((x) => ['ranking', 'seguridad', 'cola'].includes(x.tipo))) {
        assert.match(f.html, /data-evaluacion="EVA-/, `${p.nombre}: fila ${f.tipo} sin su evaluación`)
        assert.match(f.html, /aceptada|pendiente de revisión/)
      }
    }
    assert.ok(todas.some((p) => p.html.includes('>aceptada<')))
  })

  it('regla 6 en el detalle: dice qué evaluación usa; el de un padre, la de su hijo prioritario', () => {
    let padres = 0
    for (const p of todas.filter((x) => x.vista === 'detalle')) {
      if (p.html.includes('data-lee-por=')) {
        padres++
        assert.match(p.html, /data-lee-por="RSK-[^"]+"[^>]*>[\s\S]*?data-evaluacion="EVA-/, `${p.nombre}: el padre no dice qué evaluación usa`)
      } else if (!p.html.includes('data-posicion-detalle=""')) {
        assert.match(p.html, /Evaluación usada: <span data-evaluacion="EVA-/, `${p.nombre}: sin la evaluación usada`)
      }
    }
    assert.equal(padres, 2)
  })

  it('regla 7: las vistas con algo calculado dicen la versión; las demás dicen que no calculan', () => {
    for (const p of todas) {
      // Un detalle sin evaluaciones y fuera del ranking (un padre no evaluable) no muestra nada calculado.
      if (p.vista === 'detalle' && !p.html.includes('data-c-raw') && p.html.includes('data-posicion-detalle=""')) continue
      if (['lista', 'escenarios', 'transferencia', 'detalle'].includes(p.vista)) assert.ok(p.html.includes(`calculado con las funciones de ${V}`), p.nombre)
      if (p.vista === 'plan') assert.match(p.html, /No usa ninguna evaluación ni calcula nada/)
    }
  })

  it('la transferencia no muestra riesgo neto; los eventos y el cambio esperado van rotulados', () => {
    let cambios = 0
    for (const p of todas) {
      // "neto" puede estar en un texto registrado (una sintética dice "sin ajuste neto"); lo que no
      // puede haber es un riesgo o una exposición neta.
      assert.ok(!/riesgo neto|exposición neta|neto de transferencia/i.test(p.html), `${p.nombre} muestra un riesgo neto`)
      for (const m of p.html.matchAll(/data-cambio-esperado=""[^>]*>([\s\S]*?)<\/span>/g)) {
        cambios++
        assert.match(m[1] ?? '', /hipótesis/)
      }
      if (p.html.includes('data-evento=')) assert.match(p.html, /observación local de Risk OS/)
    }
    assert.ok(cambios > 0)
  })
})

describe('endpoints de datos con una sesión válida (sobre la transacción)', () => {
  it('cada uno responde la vista de una organización; C_raw sólo en el detalle; la baja corta el acceso', async () => {
    await conSinteticas(async (tx, sesion) => {
      const deps = { env: { RISK_UI_SESSION_SECRET: SECRET, RISK_DATABASE_URL: 'postgres://no-se-usa' }, db: () => tx }
      const cookie = `${SESSION_COOKIE}=${issueSession(SECRET, { personaId: sesion.personaId, credencialId: sesion.credencialId })}`
      const pedir = async (path: string): Promise<Response> => {
        const request = new Request(`http://localhost:3200${path}`, { headers: { cookie } })
        const o = await guardRequest(request, deps)
        if (!o.ok) return o.response
        if (path === '/api/organizaciones') return organizacionesResponse(o.sesion, o.db)
        const det = /^\/api\/r\/(.+)$/.exec(path)
        if (det !== null) return detalleResponse(o.sesion, o.db, det[1] ?? '')
        const m = /^\/api\/o\/([^/]+)\/([a-z]+)/.exec(path)
        const vista = VISTAS_DE_ORGANIZACION.find((v) => v === m?.[2])
        assert.ok(m !== null && vista !== undefined)
        return vistaDeOrganizacionResponse(request, o.sesion, o.db, vista, m[1] ?? '')
      }

      const os = (await (await pedir('/api/organizaciones')).json()) as { organizaciones: { organizacionId: string }[] }
      assert.equal(os.organizaciones.length, 8)
      let detalles = 0
      for (const { organizacionId } of os.organizaciones) {
        for (const v of VISTAS_DE_ORGANIZACION) {
          const r = await pedir(`/api/o/${encodeURIComponent(organizacionId)}/${v}`)
          assert.equal(r.status, 200, v)
          const body = await r.text()
          assert.ok(!/c_?raw/i.test(body), `${v} de ${organizacionId} trae C_raw`)
          assert.ok(body.includes(organizacionId))
        }
        const lista = (await (await pedir(`/api/o/${encodeURIComponent(organizacionId)}/lista`)).json()) as { ranking: { riskId: string }[] }
        for (const { riskId } of lista.ranking) {
          const detalle = await pedir(`/api/r/${riskId}`)
          assert.equal(detalle.status, 200)
          // Cada `cRaw` del JSON está en un objeto con el vector de 7 factores y las dos banderas.
          const conCRaw = (x: unknown): Record<string, unknown>[] =>
            Array.isArray(x) ? x.flatMap(conCRaw)
              : x !== null && typeof x === 'object' ? [...('cRaw' in x ? [x as Record<string, unknown>] : []), ...Object.values(x).flatMap(conCRaw)] : []
          const body = (await detalle.json()) as { riesgo: { tipoObjeto: string } }
          const criticidades = conCRaw(body)
          // Un padre no tiene evaluación propia: su detalle no tiene criticidad.
          assert.ok(criticidades.length > 0 || body.riesgo.tipoObjeto === 'padre')
          for (const c of criticidades) {
            assert.equal((c.vector as unknown[]).length, 7)
            assert.deepEqual(Object.keys(c.banderas as object).sort(), ['consecuenciaExtrema', 'dimensionesExtremas', 'safetyCritical'])
          }
          detalles++
        }
      }
      assert.ok(detalles > 40)
      const org = os.organizaciones[0]?.organizacionId ?? ''
      assert.equal((await pedir('/api/o/ORG-QUE-NO-EXISTE/lista')).status, 404)
      assert.equal((await pedir(`/api/o/${encodeURIComponent(org)}/lista?unidad=U-QUE-NO-EXISTE`)).status, 404)
      assert.equal((await pedir('/api/r/no-es-un-id')).status, 404)

      await tx`insert into risk.credencial ${tx({ persona_id: PERSONA, password_hash: null })}`
      const r = await pedir(`/api/o/${encodeURIComponent(org)}/lista`)
      assert.equal(r.status, 401)
      assert.deepEqual(await r.json(), { error: 'sin credencial válida' })
    })
  })
})
