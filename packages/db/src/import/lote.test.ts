// Fixtures sintéticas únicamente: ningún valor de este archivo viene de un lote real. → R-19
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { FORMATO_LOTE, LoteInvalido, MODULOS, modulosVerificados, parsearLote } from './lote.ts'
import type { ManifestArchive } from './verify-manifest.ts'

const valido = (): Record<string, unknown> => ({
  formato: FORMATO_LOTE,
  perfil: 'profile/perfil.json',
  modulos: {
    polizas: { csv: 'raw/aaa/0001.csv', exportadoEl: '2026-11-03' },
    endosos: { csv: 'raw/bbb/0001.csv', exportadoEl: '2026-11-04' },
    contactos: { csv: 'raw/ccc/0001.csv', exportadoEl: '2026-11-04' },
    cuentas: { csv: 'raw/ddd/0001.csv', exportadoEl: '2026-11-05' },
  },
})

const conModulo = (modulo: string, valor: unknown): Record<string, unknown> => {
  const base = valido()
  return { ...base, modulos: { ...(base.modulos as Record<string, unknown>), [modulo]: valor } }
}

const rechaza = (contenido: unknown, patron: RegExp): void => {
  assert.throws(
    () => parsearLote('/tmp/lote', typeof contenido === 'string' ? contenido : JSON.stringify(contenido)),
    (error: unknown) => error instanceof LoteInvalido && patron.test(error.message),
  )
}

describe('parsearLote', () => {
  it('acepta un manifiesto completo y conserva la fecha de export de cada módulo', () => {
    const lote = parsearLote('/tmp/lote', JSON.stringify(valido()))
    assert.equal(lote.raiz, '/tmp/lote')
    assert.equal(lote.perfil, 'profile/perfil.json')
    assert.deepEqual(Object.keys(lote.modulos), [...MODULOS])
    assert.equal(lote.modulos.polizas.exportadoEl, '2026-11-03')
    assert.equal(lote.modulos.cuentas.exportadoEl, '2026-11-05')
  })

  it('rechaza JSON roto, otro formato y claves desconocidas', () => {
    rechaza('{', /no es JSON/)
    rechaza({ ...valido(), formato: 'lote-zoho/0' }, /formato/)
    rechaza({ ...valido(), directorio: 'data/x' }, /claves desconocidas: directorio/)
  })

  it('exige los cuatro módulos y no acepta otros', () => {
    const sinEndosos = valido()
    delete (sinEndosos.modulos as Record<string, unknown>).endosos
    rechaza(sinEndosos, /modulos\.endosos: falta/)
    rechaza(conModulo('tareas', { csv: 'raw/eee/0001.csv', exportadoEl: '2026-11-05' }), /módulos desconocidos: tareas/)
  })

  it('exige una fecha de export real por módulo', () => {
    rechaza(conModulo('polizas', { csv: 'raw/aaa/0001.csv' }), /polizas\.exportadoEl/)
    rechaza(conModulo('polizas', { csv: 'raw/aaa/0001.csv', exportadoEl: '03/11/2026' }), /polizas\.exportadoEl/)
    rechaza(conModulo('polizas', { csv: 'raw/aaa/0001.csv', exportadoEl: '2026-02-30' }), /polizas\.exportadoEl/)
  })

  it('no deja que una ruta salga de la raíz del lote', () => {
    rechaza({ ...valido(), perfil: '../otro-lote/profile/perfil.json' }, /perfil: la ruta tiene que ser relativa/)
    rechaza({ ...valido(), perfil: '/etc/perfil.json' }, /perfil: la ruta tiene que ser relativa/)
    rechaza(conModulo('cuentas', { csv: 'raw/../../x.csv', exportadoEl: '2026-11-05' }), /cuentas\.csv/)
  })

  it('no acepta el mismo CSV para dos módulos', () => {
    rechaza(conModulo('cuentas', { csv: 'raw/ccc/0001.csv', exportadoEl: '2026-11-05' }), /mismo CSV/)
  })
})

describe('modulosVerificados', () => {
  const perfil = (rutas: readonly string[]): readonly ManifestArchive[] => [
    {
      archiveId: 'ZIP-01',
      localArchiveName: 'Sintetico.zip',
      sha256: 'f'.repeat(64),
      files: rutas.map((ruta, i) => ({ fileId: `F-${String(i)}`, rawRelativePath: ruta, sha256: String(i).repeat(64) })),
    },
  ]

  it('toma el SHA-256 de cada CSV del perfil', () => {
    const lote = parsearLote('/tmp/lote', JSON.stringify(valido()))
    const modulos = modulosVerificados(
      lote,
      perfil(['raw/aaa/0001.csv', 'raw/bbb/0001.csv', 'raw/ccc/0001.csv', 'raw/ddd/0001.csv']),
    )
    assert.deepEqual(
      modulos.map((m) => [m.modulo, m.sha256.slice(0, 1), m.exportadoEl]),
      [
        ['polizas', '0', '2026-11-03'],
        ['endosos', '1', '2026-11-04'],
        ['contactos', '2', '2026-11-04'],
        ['cuentas', '3', '2026-11-05'],
      ],
    )
  })

  it('rechaza un CSV que el perfil no verifica', () => {
    const lote = parsearLote('/tmp/lote', JSON.stringify(valido()))
    assert.throws(
      () => modulosVerificados(lote, perfil(['raw/aaa/0001.csv', 'raw/bbb/0001.csv', 'raw/ccc/0001.csv'])),
      (error: unknown) => error instanceof LoteInvalido && error.message.includes('cuentas.csv: el perfil del lote no verifica'),
    )
  })
})
