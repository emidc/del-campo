import assert from 'node:assert/strict'
import test from 'node:test'
import { motivoDeRechazo } from '../guard-db-tests.mjs'

test('acepta bases locales de desarrollo y de prueba', () => {
  assert.equal(motivoDeRechazo('postgres://localhost:5432/delcampo_t0018_test'), null)
  assert.equal(motivoDeRechazo('postgres://127.0.0.1:5432/delcampo_dev'), null)
  assert.equal(motivoDeRechazo(undefined), null)
})

test('rechaza hosts remotos aunque el nombre parezca de prueba', () => {
  assert.match(motivoDeRechazo('postgresql://postgres.ref:x@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'), /no es local/)
  assert.match(motivoDeRechazo('postgres://db.example.com:5432/algo_test'), /no es local/)
})

test('rechaza bases locales que no son de desarrollo ni de prueba', () => {
  assert.match(motivoDeRechazo('postgres://localhost:5432/postgres'), /no termina/)
  assert.match(motivoDeRechazo('no-es-url'), /no es una URL/)
})

test('rechaza la base local de T-0013, que tiene datos reales', () => {
  assert.match(motivoDeRechazo('postgres://localhost:5432/delcampo_t0013_dev'), /T-0013/)
})
