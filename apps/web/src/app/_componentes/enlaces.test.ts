import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { partirEnlaces } from './enlaces.ts'

describe('enlaces en comentarios', () => {
  it('texto sin enlaces queda igual', () => {
    assert.deepEqual(partirEnlaces('Llamar al cliente'), [{ tipo: 'texto', texto: 'Llamar al cliente' }])
  })

  it('reconoce http, https y www., y deja afuera el punto final', () => {
    assert.deepEqual(partirEnlaces('La póliza está en https://drive.google.com/file/d/abc/view?usp=sharing. Revisar'), [
      { tipo: 'texto', texto: 'La póliza está en ' },
      { tipo: 'enlace', texto: 'https://drive.google.com/file/d/abc/view?usp=sharing', href: 'https://drive.google.com/file/d/abc/view?usp=sharing' },
      { tipo: 'texto', texto: '. Revisar' },
    ])
    assert.deepEqual(partirEnlaces('Ver www.ejemplo.com'), [
      { tipo: 'texto', texto: 'Ver ' },
      { tipo: 'enlace', texto: 'www.ejemplo.com', href: 'https://www.ejemplo.com' },
    ])
  })

  it('varios enlaces, entre paréntesis y en distintas líneas', () => {
    const trozos = partirEnlaces('(http://a.com)\nhttps://b.com/x_(y)')
    assert.deepEqual(
      trozos.filter((t) => t.tipo === 'enlace').map((t) => t.texto),
      ['http://a.com', 'https://b.com/x_(y)'],
    )
    assert.equal(trozos.map((t) => t.texto).join(''), '(http://a.com)\nhttps://b.com/x_(y)')
  })

  it('no toma javascript: ni otros esquemas', () => {
    assert.deepEqual(partirEnlaces('javascript:alert(1)'), [{ tipo: 'texto', texto: 'javascript:alert(1)' }])
  })
})
