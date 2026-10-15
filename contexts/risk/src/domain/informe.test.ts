// El informe sin valores (R-19, T-0029 ## Outcome) no contiene ninguna celda del lote: se prueba
// con un lote sintético cuyos textos y montos son marcadores, y con hallazgos cuyos mensajes sí
// los interpolan. El informe con valores, sobre el mismo lote, los muestra.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { leerContrato } from '../application/importar.ts'
import { aLote, FECHA_CORTE, filasBase, type Filas } from '../testing/lotes.ts'
import { ARCHIVOS } from './contrato.ts'
import { informe, type Resultado } from './informe.ts'
import { validarLote } from './validador.ts'

const contrato = leerContrato()

/** El lote base con cada texto y cada monto reemplazado por un marcador único. */
function marcado(): { filas: Filas; marcas: string[] } {
  const filas = filasBase()
  const marcas: string[] = []
  for (const a of ARCHIVOS) {
    const tipos = new Map(contrato.columnas[a].map((c) => [c.nombre, c.tipo]))
    for (const f of filas[a]) {
      for (const [col, v] of Object.entries(f)) {
        if (v === '') continue
        const tipo = tipos.get(col) ?? ''
        if (tipo.startsWith('texto')) f[col] = `MARCA${String(marcas.push(`MARCA${String(marcas.length)}`) - 1)}`
        else if (tipo === 'decimal') { const m = String(970001 + marcas.length); marcas.push(m); f[col] = m }
      }
    }
  }
  return { filas, marcas }
}

describe('informe', () => {
  const { filas, marcas } = marcado()
  // Un rechazo cuyo mensaje interpola la celda (RV-ARCH-05 «{valor}») y avisos.
  Object.assign(filas['risks.csv'][5] ?? {}, { fecha: 'MARCA-FECHA', riesgo_causa: '' })
  marcas.push('MARCA-FECHA')
  // Una celda de id mal cargada con otro dato (RV-ID-01): sin valores no puede salir como id.
  Object.assign(filas['action-plan.csv'][0] ?? {}, { accion_id: 'MARCA-ID-EMPRESA' })
  marcas.push('MARCA-ID-EMPRESA')
  const hallazgos = validarLote(contrato, aLote(contrato, filas), { fechaCorte: FECHA_CORTE })
  const lote = { huella: 'f'.repeat(64), filas: { 'risks.csv': 7, 'action-plan.csv': 3, 'risk-transfer.csv': 2 } }
  const resultados: Resultado[] = [
    { estado: 'rechazado', lote, hallazgos },
    { estado: 'importado', lote, id: 1, hallazgos: hallazgos.filter((h) => h.severidad === 'aviso'), escritas: { riesgo: 6, miembro_escenario: 2, accion: 3, evaluacion: 6, accion_estado: 2, transferencia: 1, evento_poliza: 1, revision_humana: 0 } },
    { estado: 'ya_importado', lote, registrado: { id: 1, huella: lote.huella, origen: '/datos/MARCA-CARPETA', importadoPor: 'MARCA-PERSONA', importadoEn: new Date('2026-10-15T00:00:00Z'), fechaCorte: FECHA_CORTE, escritas: { riesgo: 6 } } },
    { estado: 'falla_escritura', lote, hallazgos: [], falla: { tabla: 'evento_poliza', restriccion: 'evento_poliza_monto', codigo: '23514', mensaje: 'Failing row contains (MARCA-FALLA, …)' } },
    { estado: 'sin_destino', lote, hallazgos: [], sinDestino: [{ archivo: 'risk-transfer.csv', fila: 3, id: 'MARCA-ID-EVT', columna: 'uncertainty' }] },
  ]
  marcas.push('MARCA-CARPETA', 'MARCA-PERSONA', 'MARCA-FALLA', 'MARCA-ID-EVT')

  it('el lote marcado tiene rechazos y avisos con marcadores en sus mensajes', () => {
    assert.ok(hallazgos.some((h) => h.severidad === 'rechazo' && h.mensaje.includes('MARCA-FECHA')))
    assert.ok(hallazgos.some((h) => h.severidad === 'aviso'))
    assert.ok(hallazgos.some((h) => /MARCA\d/.test(h.origen)), 'el origen de la fila también es una celda')
    assert.ok(hallazgos.some((h) => h.regla_id === 'RV-ID-01' && h.id === 'MARCA-ID-EMPRESA'), 'el id de la fila también puede ser una celda cualquiera')
  })

  for (const r of resultados) {
    it(`${r.estado}: sin valores no contiene ninguna celda; con valores, sí`, () => {
      const sin = informe(r, 'sin_valores').join('\n')
      for (const m of marcas) assert.ok(!sin.includes(m), `${m} en:\n${sin}`)
      assert.ok(!sin.includes('MARCA'), sin)
      assert.match(informe(r, 'con_valores').join('\n'), /MARCA/)
    })
  }

  it('sin valores trae conteos por archivo y por regla, líneas e ids', () => {
    const [primero] = resultados
    assert.ok(primero !== undefined)
    const sin = informe(primero, 'sin_valores')
    const rechazosRisks = hallazgos.filter((h) => h.archivo === 'risks.csv' && h.severidad === 'rechazo').length
    const avisosRisks = hallazgos.filter((h) => h.archivo === 'risks.csv' && h.severidad === 'aviso').length
    assert.ok(sin.includes(`  risks.csv: 7 filas, ${String(rechazosRisks)} rechazos, ${String(avisosRisks)} avisos`), sin.join('\n'))
    const rechazo = hallazgos.find((h) => h.severidad === 'rechazo')
    assert.ok(rechazo !== undefined)
    assert.ok(sin.includes(`  rechazo ${rechazo.regla_id} risks.csv:${String(rechazo.fila)} ${rechazo.id}`), sin.join('\n'))
    assert.ok(sin.some((l) => l.startsWith('  rechazo RV-ARCH-05: 1')))
  })
})
