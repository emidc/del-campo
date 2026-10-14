// El export ciego falla ante cualquier columna, archivo o id prohibido, se niega a escribir dentro
// del repositorio y deja un manifiesto con la huella de cada archivo.

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

import { comprobar, exportar, planificar, RAIZ, type Plan } from './export-ciego.ts'

const ACEPTAR_EV = { token: 'EV-11-0063', motivo: 'Cita de la metodología v1 congelada; es de S02-R07, fuera del export' }
const tmp = mkdtempSync(join(tmpdir(), 'export-ciego-'))
after(() => { rmSync(tmp, { recursive: true, force: true }) })
const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex')
const con = (plan: Plan, cambio: (p: Plan) => Plan): Plan => cambio({ ...plan, entradas: [...plan.entradas] })

describe('Fase 15b: export ciego', () => {
  const plan = planificar(['S29'], 'v1')

  it('la lista blanca de S29: fichas de la empresa, lista de riesgos, metodología, protocolo y plantilla', () => {
    assert.deepEqual(plan.entradas.map((e) => e.destino).filter((d) => !d.startsWith('empresas/')), [
      'lista-riesgos.csv', 'metodologia/metodologia-v1.md', 'metodologia/protocolo.md', 'plantilla/ficha-evaluacion.csv',
    ])
    assert.ok(plan.entradas.every((e) => !e.origen.startsWith('v0/fase-') && !e.origen.includes('cerrado')))
    const lista = plan.entradas.find((e) => e.destino === 'lista-riesgos.csv')?.contenido.toString('utf8') ?? ''
    assert.equal(lista.split('\n')[0], 'risk_id,empresa,tipo_objeto,riesgo_padre_id,miembros,titulo')
  })

  it('limpio salvo la cita EV-11-0063 de la metodología, que sólo pasa aceptada', () => {
    const h = comprobar(plan)
    assert.deepEqual(h.map((x) => [x.comprobacion, x.token, x.aceptable]), [[2, 'EV-11-0063', true]])
  })

  it('falla con un archivo fuera de la lista blanca', () => {
    const origen = 'v0/fase-11/regresion-emi41.csv'
    const p = con(plan, (x) => ({ ...x, entradas: [...x.entradas, { origen, destino: 'regresion.csv', modo: 'copia', contenido: readFileSync(join(RAIZ, origen)) }] }))
    const h = comprobar(p).filter((x) => x.archivo === 'regresion.csv')
    assert.ok(h.some((x) => x.comprobacion === 1 && !x.aceptable))
    // y además trae ids de evaluación y columnas de resultado
    assert.ok(h.some((x) => x.comprobacion === 2 && !x.aceptable))
  })

  it('falla si un archivo copiado no tiene la huella de su origen', () => {
    const p = con(plan, (x) => ({ ...x, entradas: x.entradas.map((e) => (e.destino.endsWith('empresa.md') ? { ...e, contenido: Buffer.concat([e.contenido, Buffer.from('\n')]) } : e)) }))
    assert.ok(comprobar(p).some((x) => x.comprobacion === 1 && x.archivo.endsWith('empresa.md')))
  })

  it('falla con un id de evaluación en una ficha de la empresa, y no se puede aceptar', () => {
    const p = con(plan, (x) => ({ ...x, entradas: x.entradas.map((e) => (e.destino.endsWith('empresa.md') ? { ...e, contenido: Buffer.concat([e.contenido, Buffer.from('Ver EV-8-tecnologia-y-pagos-0012.\n')]) } : e)) }))
    const h = comprobar(p).filter((x) => x.comprobacion === 2 && x.archivo.endsWith('empresa.md'))
    assert.deepEqual(h.map((x) => [x.token, x.aceptable]), [['EV-8-tecnologia-y-pagos-0012', false]])
    // Las referencias de evidencia de las fichas de información no son ids de evaluación.
    const ok = con(plan, (x) => ({ ...x, entradas: x.entradas.map((e) => (e.destino.endsWith('empresa.md') ? { ...e, contenido: Buffer.from('EV-S29-010; EV-S29-15B-01') } : e)) }))
    assert.ok(!comprobar(ok).some((x) => x.comprobacion === 2 && x.archivo.endsWith('empresa.md')))
  })

  it('falla con una columna de resultado en un CSV; la plantilla vacía está exenta, con filas no', () => {
    for (const c of ['c_raw', 'banda', 'review_status', 'v1_posicion', 'contrastes_intencion']) {
      const p = con(plan, (x) => ({ ...x, entradas: x.entradas.map((e) => (e.destino === 'lista-riesgos.csv' ? { ...e, contenido: Buffer.from(`risk_id,${c}\n`) } : e)) }))
      assert.ok(comprobar(p).some((x) => x.comprobacion === 3 && x.token === c), c)
    }
    const conFilas = con(plan, (x) => ({ ...x, entradas: x.entradas.map((e) => (e.destino.startsWith('plantilla/') ? { ...e, contenido: Buffer.concat([e.contenido, Buffer.from('x\n')]) } : e)) }))
    assert.ok(comprobar(conFilas).some((x) => x.comprobacion === 3 && x.archivo.startsWith('plantilla/')))
  })

  it('contaminación: S06 está citada en la metodología y no se exporta sin aceptación explícita', () => {
    const h = comprobar(planificar(['S06'], 'v1')).filter((x) => x.comprobacion === 4)
    assert.deepEqual(h.map((x) => x.token).sort(), ['S06-R01', 'S06-R04'])
    assert.throws(() => exportar(['S06'], 'v1', join(tmp, 's06'), [ACEPTAR_EV]), /comprobación 4/)
  })

  it('se niega a escribir dentro del repositorio', () => {
    assert.throws(() => exportar(['S29'], 'v1', join(RAIZ, 'export-prueba'), [ACEPTAR_EV]), /dentro de un repositorio/)
  })

  it('no acepta algo que no aparece', () => {
    assert.throws(() => exportar(['S29'], 'v1', join(tmp, 'sobra'), [ACEPTAR_EV, { token: 'S29-R04', motivo: 'x' }]), /no aparece/)
  })

  it('escribe fuera, con un manifiesto que lista cada archivo con su huella y la aceptación', () => {
    const salida = join(tmp, 's29')
    const { manifiesto } = exportar(['S29'], 'v1', salida, [ACEPTAR_EV])
    for (const e of plan.entradas) {
      const escrito = readFileSync(join(salida, e.destino))
      assert.ok(manifiesto.includes(`${sha(escrito)}  ${e.destino}  ←  ${e.origen}`), e.destino)
    }
    assert.match(manifiesto, /EV-11-0063 \(comprobación 2 en metodologia\/metodologia-v1\.md\)/)
    assert.equal(readFileSync(join(salida, 'MANIFIESTO.txt'), 'utf8'), manifiesto)
    assert.throws(() => exportar(['S29'], 'v1', salida, [ACEPTAR_EV]), /no está vacía/)
    assert.equal(readdirSync(join(salida, 'empresas/S29')).length, 10)
  })
})
