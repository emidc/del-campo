// Cuándo aparece la barra de carga: sólo si de verdad se va a otra pantalla de la app.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { destinoDeFormularioGet, esClicSimple, llevaAOtraPantalla } from './indicador-carga.ts'

const AQUI = 'https://broker.example/clientes?tipo=empresas'

describe('llevaAOtraPantalla', () => {
  it('una pestaña o un filtro que cambia la búsqueda sí', () => {
    assert.equal(llevaAOtraPantalla({ href: '/clientes?tipo=personas', actual: AQUI }), true)
  })

  it('otra sección del menú sí', () => {
    assert.equal(llevaAOtraPantalla({ href: '/tareas', actual: AQUI }), true)
  })

  it('la misma pantalla, o sólo un ancla, no', () => {
    assert.equal(llevaAOtraPantalla({ href: '/clientes?tipo=empresas', actual: AQUI }), false)
    assert.equal(llevaAOtraPantalla({ href: '#polizas', actual: AQUI }), false)
  })

  it('afuera de la app, en otra pestaña, descargas y rutas que no son pantallas no', () => {
    assert.equal(llevaAOtraPantalla({ href: 'https://drive.google.com/x', actual: AQUI }), false)
    assert.equal(llevaAOtraPantalla({ href: '/tareas', actual: AQUI, target: '_blank' }), false)
    assert.equal(llevaAOtraPantalla({ href: '/tareas', actual: AQUI, descarga: true }), false)
    assert.equal(llevaAOtraPantalla({ href: '/api/auth/logout', actual: AQUI }), false)
    assert.equal(llevaAOtraPantalla({ href: 'mailto:a@b.c', actual: AQUI }), false)
  })

  it('con target _self sí', () => {
    assert.equal(llevaAOtraPantalla({ href: '/tareas', actual: AQUI, target: '_self' }), true)
  })
})

describe('esClicSimple', () => {
  const base = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }
  it('un clic izquierdo sin teclas sí; con Cmd/Ctrl o botón del medio no', () => {
    assert.equal(esClicSimple(base), true)
    assert.equal(esClicSimple({ ...base, metaKey: true }), false)
    assert.equal(esClicSimple({ ...base, ctrlKey: true }), false)
    assert.equal(esClicSimple({ ...base, button: 1 }), false)
  })
})

describe('destinoDeFormularioGet', () => {
  it('arma la dirección con los campos, como el navegador', () => {
    assert.equal(
      destinoDeFormularioGet('https://broker.example/clientes', [['tipo', 'empresas'], ['q', 'acme sa']]),
      'https://broker.example/clientes?tipo=empresas&q=acme+sa',
    )
  })
})
