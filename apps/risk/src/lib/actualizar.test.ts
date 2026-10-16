// `volver` de los formularios (T-0031): sólo una página propia de la app, ni otra URL ni una
// ruta que salga de /r u /o, tampoco codificada.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { volverA } from './actualizar.ts'

const DEFECTO = '/r/RSK-01M3QSRT00NDS8K3ZZ1MQZ9A32'

describe('volverA', () => {
  it('acepta las páginas de un riesgo y de una organización', () => {
    for (const ruta of ['/r/RSK-01M3QSRT00NDS8K3ZZ1MQZ9A32', '/o/ORG-01M3QSRT00VT0W3XH3JG6NDTEX/plan', '/o/ORG-X/orden-previo']) {
      assert.equal(volverA(ruta, DEFECTO), ruta)
    }
  })
  it('vuelve al defecto con otra URL, otra ruta o una salida codificada', () => {
    for (const ruta of [
      '', 'https://otro.example/r/x', '//otro.example/r/x', '/api/logout', '/r/../api/logout', '/r/%2e%2e/api/logout',
      '/o/%2E%2E/%2E%2E/login', '/r/%2f%2fotro.example', '/r/%5c%5cotro', '/r/%zz', '/r/x?y=1',
    ]) {
      assert.equal(volverA(ruta, DEFECTO), DEFECTO, ruta)
    }
  })
})
