import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  archivosDeMigracion,
  ErrorDeMigraciones,
  parsearNombre,
  pendientes,
} from './migraciones.ts'

describe('parsearNombre', () => {
  it('acepta NNNN_slug.sql y devuelve el número que ordena', () => {
    assert.deepEqual(parsearNombre('0012_policy-version.sql'), {
      numero: 12,
      slug: 'policy-version',
      archivo: '0012_policy-version.sql',
    })
  })

  it('rechaza un nombre sin número, nombrando lo que esperaba', () => {
    assert.throws(() => parsearNombre('policy.sql'), (error: unknown) => {
      assert.ok(error instanceof ErrorDeMigraciones)
      assert.match(error.message, /NNNN_slug\.sql/)
      return true
    })
  })

  it('rechaza un número de menos de cuatro dígitos: 2 y 10 no ordenan como texto', () => {
    assert.throws(() => parsearNombre('2_party.sql'), ErrorDeMigraciones)
  })
})

describe('archivosDeMigracion', () => {
  it('ordena por número y no por el orden del directorio', () => {
    const orden = archivosDeMigracion([
      '0010_endorsement.sql',
      '0002_policy.sql',
      '0001_party.sql',
    ]).map((migracion) => migracion.archivo)

    assert.deepEqual(orden, ['0001_party.sql', '0002_policy.sql', '0010_endorsement.sql'])
  })

  it('ignora lo que no es .sql, como el README del directorio', () => {
    assert.deepEqual(archivosDeMigracion(['README.md', '0001_party.sql']).length, 1)
  })

  it('rechaza dos migraciones con el mismo número', () => {
    assert.throws(
      () => archivosDeMigracion(['0001_party.sql', '0001_policy.sql']),
      /duplicado 1/,
    )
  })

  it('un directorio vacío es una lista vacía, no un error', () => {
    assert.deepEqual(archivosDeMigracion([]), [])
  })
})

describe('pendientes', () => {
  it('devuelve sólo lo no aplicado, en orden', () => {
    const todas = archivosDeMigracion(['0001_party.sql', '0002_policy.sql', '0003_link.sql'])
    const faltan = pendientes(todas, ['0001_party.sql']).map((migracion) => migracion.archivo)

    assert.deepEqual(faltan, ['0002_policy.sql', '0003_link.sql'])
  })

  it('falla con el directorio vacío y el ledger no vacío: es el caso que más fácil se esconde', () => {
    // Regresión: el runner devolvía temprano al no encontrar archivos y reportaba
    // "sin migraciones" sobre una base que tenía migraciones aplicadas.
    assert.throws(() => pendientes([], ['0001_party.sql']), /0001_party\.sql/)
  })

  it('falla si la base registra una migración que ya no está en el repositorio', () => {
    const todas = archivosDeMigracion(['0001_party.sql'])

    assert.throws(
      () => pendientes(todas, ['0001_party.sql', '0002_borrada.sql']),
      /0002_borrada\.sql/,
    )
  })
})
