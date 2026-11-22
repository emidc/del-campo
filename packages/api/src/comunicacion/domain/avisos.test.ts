import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { destinatarioDelAviso } from './avisos.ts'

const ana = { userId: 'u-ana', email: 'ana@sintetico.test' }
const victoria = { userId: 'u-vic', email: 'Victoria@delcamposeguros.com' }
const matias = { userId: 'u-mat', email: 'matias@delcamposeguros.com' }
const equipo = [ana, victoria, matias]

describe('a quién le llega el aviso de un mensaje (T-0072)', () => {
  it('al responsable del cliente', () => {
    assert.equal(destinatarioDelAviso(['u-ana'], equipo), ana)
  })

  it('a Victoria si el cliente no tiene responsable', () => {
    assert.equal(destinatarioDelAviso([null], equipo), victoria)
  })

  it('a Victoria si el responsable ya no está en el equipo', () => {
    assert.equal(destinatarioDelAviso(['u-baja'], equipo), victoria)
  })

  it('a Matías si el mensaje no se asocia a ningún cliente', () => {
    assert.equal(destinatarioDelAviso([], equipo), matias)
  })

  it('con varios clientes, al primero que tenga responsable', () => {
    assert.equal(destinatarioDelAviso([null, 'u-ana'], equipo), ana)
  })

  it('a nadie si la cuenta por defecto no está en el equipo', () => {
    assert.equal(destinatarioDelAviso([], [ana]), null)
  })
})
