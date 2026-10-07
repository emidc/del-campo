import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { connect } from './database.ts'

describe('conexión', () => {
  it('no usa sentencias preparadas: el Transaction pooler de Supabase no las admite', async () => {
    // `postgres` no se conecta hasta la primera consulta: esto no toca ninguna base.
    const sql = connect('postgres://localhost:1/delcampo_communication_test')
    try {
      assert.equal(sql.options.prepare, false)
    } finally {
      await sql.end()
    }
  })
})
