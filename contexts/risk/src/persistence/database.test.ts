import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { connect, notLocalDatabase } from './database.ts'

describe('conexión', () => {
  it('no usa sentencias preparadas: el Transaction pooler de Supabase no las admite', async () => {
    // `postgres` no se conecta hasta la primera consulta: esto no toca ninguna base.
    const sql = connect('postgres://localhost:1/delcampo_risk_test')
    try {
      assert.equal(sql.options.prepare, false)
    } finally {
      await sql.end()
    }
  })
})

describe('bases que el runner y los tests pueden tocar', () => {
  it('solo delcampo_risk_dev y delcampo_risk_test, en localhost', () => {
    assert.equal(notLocalDatabase('postgres://localhost:5432/delcampo_risk_dev'), null)
    assert.equal(notLocalDatabase('postgres://127.0.0.1:5432/delcampo_risk_test'), null)
  })

  it('rechaza la de Broker, la de Communication OS, un host remoto y un desvío por parámetro', () => {
    assert.match(notLocalDatabase('postgres://localhost:5432/delcampo_test') ?? '', /no es delcampo_risk_dev/)
    assert.match(notLocalDatabase('postgres://localhost:5432/delcampo_communication_test') ?? '', /no es delcampo_risk_dev/)
    assert.match(notLocalDatabase('postgres://db.example.supabase.co:5432/delcampo_risk_dev') ?? '', /no es local/)
    assert.match(notLocalDatabase('postgres://localhost:5432/delcampo_risk_dev?host=db.example.com') ?? '', /redirige/)
  })
})
