import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { CredencialEncontrada, InvitacionEncontrada } from './admision.ts'
import { decidirLogin, evaluarSesion } from './admision.ts'
import type { Identidad } from './identidad.ts'

const AHORA = Date.UTC(2026, 10, 3, 12)

const identidad = (cambios: Partial<Identidad> = {}): Identidad => ({
  proveedor: 'google',
  sujeto: 'sub-ana',
  email: 'ana@ejemplo.test',
  emailVerificado: true,
  nombre: 'Ana',
  ...cambios,
})

const credencial = (estadoUsuario: CredencialEncontrada['estadoUsuario']): CredencialEncontrada => ({
  usuarioId: 'U1',
  estadoUsuario,
})

const invitacion = (cambios: Partial<InvitacionEncontrada> = {}): InvitacionEncontrada => ({
  usuarioId: 'U1',
  email: 'ana@ejemplo.test',
  venceEn: AHORA + 60_000,
  estadoUsuario: 'INVITADO',
  ...cambios,
})

describe('evaluarSesion', () => {
  it('sin cookie, cookie inválida o vencida: no hay identidad', () => {
    assert.deepEqual(evaluarSesion({ tipo: 'NINGUNA' }), { ok: false, motivo: 'SIN_SESION' })
    assert.deepEqual(evaluarSesion({ tipo: 'INVALIDA' }), { ok: false, motivo: 'SESION_INVALIDA' })
    assert.deepEqual(evaluarSesion({ tipo: 'VENCIDA' }), { ok: false, motivo: 'SESION_VENCIDA' })
  })

  it('una identidad sin sujeto o sin email es una sesión inválida', () => {
    assert.deepEqual(evaluarSesion({ tipo: 'IDENTIDAD', identidad: identidad({ sujeto: ' ' }) }), {
      ok: false,
      motivo: 'SESION_INVALIDA',
    })
    assert.deepEqual(evaluarSesion({ tipo: 'IDENTIDAD', identidad: identidad({ email: '' }) }), {
      ok: false,
      motivo: 'SESION_INVALIDA',
    })
  })

  it('una identidad completa pasa: la base decide después si la persona sigue activa', () => {
    const id = identidad()
    assert.deepEqual(evaluarSesion({ tipo: 'IDENTIDAD', identidad: id }), { ok: true, identidad: id })
  })
})

describe('decidirLogin', () => {
  it('con credencial de un usuario activo, entra', () => {
    assert.deepEqual(decidirLogin(identidad(), credencial('ACTIVO'), null, AHORA), { tipo: 'ENTRA', usuarioId: 'U1' })
  })

  it('entra aunque el email haya cambiado: la clave es el sujeto', () => {
    const otraDireccion = identidad({ email: 'ana.nueva@ejemplo.test' })
    assert.deepEqual(decidirLogin(otraDireccion, credencial('ACTIVO'), null, AHORA), { tipo: 'ENTRA', usuarioId: 'U1' })
  })

  it('con credencial de un usuario dado de baja, no entra', () => {
    assert.deepEqual(decidirLogin(identidad(), credencial('BAJA'), null, AHORA), {
      tipo: 'RECHAZA',
      motivo: 'DADO_DE_BAJA',
    })
  })

  it('una credencial de un usuario todavía invitado no deja entrar', () => {
    assert.deepEqual(decidirLogin(identidad(), credencial('INVITADO'), null, AHORA), {
      tipo: 'RECHAZA',
      motivo: 'NO_INVITADO',
    })
  })

  it('sin credencial ni invitación, autenticarse con Google no da acceso', () => {
    assert.deepEqual(decidirLogin(identidad(), null, null, AHORA), { tipo: 'RECHAZA', motivo: 'NO_INVITADO' })
  })

  it('con invitación vigente para el mismo email verificado, vincula', () => {
    assert.deepEqual(decidirLogin(identidad(), null, invitacion(), AHORA), { tipo: 'VINCULA', usuarioId: 'U1' })
  })

  it('el email se compara sin mayúsculas ni espacios', () => {
    const conMayusculas = identidad({ email: ' Ana@Ejemplo.TEST ' })
    assert.deepEqual(decidirLogin(conMayusculas, null, invitacion(), AHORA), { tipo: 'VINCULA', usuarioId: 'U1' })
  })

  it('una invitación para otro email no vincula', () => {
    assert.deepEqual(decidirLogin(identidad(), null, invitacion({ email: 'otra@ejemplo.test' }), AHORA), {
      tipo: 'RECHAZA',
      motivo: 'NO_INVITADO',
    })
  })

  it('una invitación vencida no vincula, tampoco en el instante exacto del vencimiento', () => {
    assert.deepEqual(decidirLogin(identidad(), null, invitacion({ venceEn: AHORA }), AHORA), {
      tipo: 'RECHAZA',
      motivo: 'NO_INVITADO',
    })
  })

  it('una invitación de un usuario dado de baja no vincula', () => {
    assert.deepEqual(decidirLogin(identidad(), null, invitacion({ estadoUsuario: 'BAJA' }), AHORA), {
      tipo: 'RECHAZA',
      motivo: 'DADO_DE_BAJA',
    })
  })

  it('un email no verificado no entra ni vincula, aunque haya credencial o invitación', () => {
    const sinVerificar = identidad({ emailVerificado: false })
    assert.deepEqual(decidirLogin(sinVerificar, credencial('ACTIVO'), null, AHORA), {
      tipo: 'RECHAZA',
      motivo: 'EMAIL_NO_VERIFICADO',
    })
    assert.deepEqual(decidirLogin(sinVerificar, null, invitacion(), AHORA), {
      tipo: 'RECHAZA',
      motivo: 'EMAIL_NO_VERIFICADO',
    })
  })

  it('una identidad sin sujeto no entra', () => {
    assert.deepEqual(decidirLogin(identidad({ sujeto: '' }), credencial('ACTIVO'), null, AHORA), {
      tipo: 'RECHAZA',
      motivo: 'IDENTIDAD_INVALIDA',
    })
  })
})
