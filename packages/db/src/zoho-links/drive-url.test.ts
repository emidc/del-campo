// T-0022 / D-0064 — clasificación de URLs de Drive por forma, sin red y sin datos
// reales: cada URL de este archivo es sintética (R-19).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { classifyDriveUrl } from './drive-url.ts'

describe('classifyDriveUrl — T-0022', () => {
  it('reconoce las formas de archivo de Drive y de los documentos nativos', () => {
    for (const url of [
      'https://drive.google.com/file/d/SINTETICO-001/view?usp=sharing',
      'https://docs.google.com/document/d/SINTETICO-002/edit',
      'https://docs.google.com/spreadsheets/d/SINTETICO-003',
      'https://docs.google.com/presentation/d/SINTETICO-004/edit',
    ]) {
      assert.deepEqual(classifyDriveUrl(url), { ok: true, target: 'FILE', url })
    }
  })

  it('reconoce las formas de carpeta, con y sin selector de cuenta', () => {
    for (const url of [
      'https://drive.google.com/drive/folders/SINTETICO-010',
      'https://drive.google.com/drive/u/0/folders/SINTETICO-011',
      'https://drive.google.com/drive/u/3/folders/SINTETICO-012?usp=drive_link',
    ]) {
      assert.deepEqual(classifyDriveUrl(url), { ok: true, target: 'FOLDER', url })
    }
  })

  it('recorta espacios alrededor sin alterar la URL que devuelve', () => {
    const resultado = classifyDriveUrl('  https://drive.google.com/drive/folders/SINTETICO-013  ')
    assert.deepEqual(resultado, {
      ok: true,
      target: 'FOLDER',
      url: 'https://drive.google.com/drive/folders/SINTETICO-013',
    })
  })

  it('una celda vacía o con sólo espacios es VACIA, no un error', () => {
    assert.deepEqual(classifyDriveUrl(''), { ok: false, rejection: 'VACIA' })
    assert.deepEqual(classifyDriveUrl('   '), { ok: false, rejection: 'VACIA' })
  })

  it('lo que no es una URL http(s) es NO_ES_URL', () => {
    assert.deepEqual(classifyDriveUrl('no es una url'), { ok: false, rejection: 'NO_ES_URL' })
    assert.deepEqual(classifyDriveUrl('/carpeta/local'), { ok: false, rejection: 'NO_ES_URL' })
    assert.deepEqual(classifyDriveUrl('file:///tmp/x.pdf'), { ok: false, rejection: 'NO_ES_URL' })
  })

  it('un host que no es Drive es NO_ES_DRIVE, aunque la ruta se le parezca', () => {
    assert.deepEqual(classifyDriveUrl('https://ejemplo.invalid/file/d/SINTETICO-020'), {
      ok: false,
      rejection: 'NO_ES_DRIVE',
    })
  })

  /**
   * `open?id=` sirve para archivo y para carpeta en Drive: no distingue. Adivinar sería
   * arriesgarse a ofrecer una carpeta como documento, que es lo que D-0057 prohíbe.
   */
  it('una forma de Drive que no distingue archivo de carpeta se omite', () => {
    for (const url of [
      'https://drive.google.com/open?id=SINTETICO-030',
      'https://drive.google.com/drive/my-drive',
      'https://drive.google.com/',
    ]) {
      assert.deepEqual(classifyDriveUrl(url), { ok: false, rejection: 'FORMA_DESCONOCIDA' })
    }
  })
})
