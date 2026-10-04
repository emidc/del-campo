import assert from 'node:assert/strict'
import test from 'node:test'
import { motivoDeRechazo, motivoDelEntorno, valorDeEnv } from '../guard-db-tests.mjs'

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

test('rechaza el query string que redirige la conexión a otro host', () => {
  assert.match(motivoDeRechazo('postgres://localhost:5432/delcampo_dev?host=aws-0-sa-east-1.pooler.supabase.com'), /redirige/)
  assert.match(motivoDeRechazo('postgres://localhost:5432/delcampo_dev?hostaddr=10.0.0.1'), /redirige/)
  assert.equal(motivoDeRechazo('postgres://localhost:5432/delcampo_dev?sslmode=require'), null)
})

test('del .env toma la última asignación, como los consumidores', () => {
  const texto = 'DATABASE_URL=postgres://localhost:5432/delcampo_dev\nDATABASE_URL=postgres://x@pooler.supabase.com:5432/postgres\n'
  assert.equal(valorDeEnv(texto).ambiguo, 2)
  assert.equal(valorDeEnv('DATABASE_URL=postgres://localhost:5432/delcampo_dev\n').valor,
    'postgres://localhost:5432/delcampo_dev')
  assert.equal(valorDeEnv('# DATABASE_URL=postgres://remoto/x\nDATABASE_URL=postgres://localhost:5432/delcampo_dev\n').valor,
    'postgres://localhost:5432/delcampo_dev')
  assert.equal(valorDeEnv('OTRA=1\n').valor, undefined)
})

test('la base del contexto communication pasa por la misma guarda', () => {
  const sinArchivo = () => ({})
  assert.equal(motivoDelEntorno({ COMMUNICATION_DATABASE_URL: 'postgres://localhost:5432/delcampo_communication_test' }, sinArchivo), null)
  assert.match(motivoDelEntorno({ COMMUNICATION_DATABASE_URL: 'postgres://db.example.com:5432/delcampo_communication_test' }, sinArchivo),
    /^COMMUNICATION_DATABASE_URL: .*no es local/)
  assert.match(motivoDelEntorno({ COMMUNICATION_DATABASE_URL: 'postgres://localhost:5432/postgres' }, sinArchivo), /no termina/)
  assert.match(motivoDelEntorno({ DATABASE_URL: 'postgres://remoto.example.com/x_test',
    COMMUNICATION_DATABASE_URL: 'postgres://localhost:5432/delcampo_communication_test' }, sinArchivo), /no es local/)
  assert.equal(motivoDelEntorno({}, () => ({ ambiguo: 2 })).includes('valores distintos'), true)
})
