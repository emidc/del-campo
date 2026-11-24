import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { decidirNombre } from './titulo-editable.ts'

describe('título editable de tareas y gestiones', () => {
  it('guarda el nombre nuevo sin espacios de más', () => {
    assert.deepEqual(decidirNombre('Probando tarea', '  Llamar a la aseguradora '), { tipo: 'guardar', nombre: 'Llamar a la aseguradora' })
  })

  it('no permite un nombre vacío', () => {
    assert.equal(decidirNombre('Probando tarea', '').tipo, 'error')
    assert.equal(decidirNombre('Probando tarea', '   ').tipo, 'error')
  })

  it('rechaza más de 200 caracteres', () => {
    assert.equal(decidirNombre('x', 'a'.repeat(200)).tipo, 'guardar')
    assert.equal(decidirNombre('x', 'a'.repeat(201)).tipo, 'error')
  })

  it('si no cambió, cierra sin guardar', () => {
    assert.deepEqual(decidirNombre('Probando tarea', ' Probando tarea'), { tipo: 'cerrar' })
  })
})
