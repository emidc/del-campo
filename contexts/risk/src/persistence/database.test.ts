import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { connect, connectHosted, tlsPara, destinoDe, errorSinDatos, HOSTED_URL_ENV, notHostedDatabase, notLocalDatabase } from './database.ts'

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

  it('pide TLS a toda base que no está en este equipo, como la de la app desplegada', async () => {
    assert.equal(tlsPara('postgres://localhost:5432/delcampo_risk_dev'), false)
    assert.equal(tlsPara('postgres://127.0.0.1:5432/delcampo_risk_dev'), false)
    assert.equal(tlsPara('postgres://u:p@aws-0-sa-east-1.pooler.example.com:6543/postgres'), 'require')
    assert.equal(tlsPara('no es una url'), 'require')
    const sql = connect('postgres://u:p@db.example.com:1/postgres')
    try {
      assert.equal(sql.options.ssl, 'require')
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

describe('base hosteada (T-0032)', () => {
  // Una URL inventada: ningún test se conecta a ella.
  const HOSTEADA = 'postgres://risk_app.proyecto:clave-de-prueba@pooler.ejemplo.invalid:5432/postgres'
  const LOCAL = 'postgres://localhost:5432/delcampo_risk_dev'

  it('sin --hosteada, la local de siempre, aunque la hosteada esté en el entorno', () => {
    const r = destinoDe(['carpeta'], { [HOSTED_URL_ENV]: HOSTEADA }, LOCAL)
    assert.ok('destino' in r)
    assert.deepEqual(r.destino, { hosteada: false, url: LOCAL, nombre: 'delcampo_risk_dev' })
    assert.deepEqual(r.args, ['carpeta'])
  })

  it('sin --hosteada, RISK_DATABASE_URL remota se rechaza como antes', () => {
    const r = destinoDe([], { RISK_DATABASE_URL: HOSTEADA }, LOCAL)
    assert.ok('error' in r)
    assert.match(r.error, /no es local/)
  })

  it('con --hosteada, sólo RISK_HOSTED_DATABASE_URL, nunca RISK_DATABASE_URL', () => {
    const r = destinoDe(['carpeta', '--hosteada'], { [HOSTED_URL_ENV]: HOSTEADA, RISK_DATABASE_URL: LOCAL }, LOCAL)
    assert.ok('destino' in r)
    assert.deepEqual(r.destino, { hosteada: true, url: HOSTEADA, nombre: 'la base hosteada' })
    assert.deepEqual(r.args, ['carpeta'])
    const sin = destinoDe(['--hosteada'], { RISK_DATABASE_URL: HOSTEADA }, LOCAL)
    assert.ok('error' in sin)
    assert.match(sin.error, /hace falta RISK_HOSTED_DATABASE_URL/)
  })

  it('rechaza una hosteada local, sin usuario, con desvío de host o que no es de Postgres, sin repetir la URL', () => {
    for (const [url, motivo] of [
      [LOCAL, /apunta a este equipo/], ['postgres://pooler.ejemplo.invalid:5432/postgres', /no tiene usuario/],
      [`${HOSTEADA}?host=otro.invalid`, /redirige/], ['https://pooler.ejemplo.invalid/', /no es una URL de Postgres/], ['no es url', /no es una URL válida/],
    ] as const) {
      const m = notHostedDatabase(url) ?? ''
      assert.match(m, motivo)
      assert.ok(!m.includes('pooler') && !m.includes('clave-de-prueba'), m)
    }
    assert.equal(notHostedDatabase(HOSTEADA), null)
    assert.ok('error' in destinoDe(['--hosteada', '--hosteada'], { [HOSTED_URL_ENV]: HOSTEADA }, LOCAL))
  })

  it('la conexión hosteada exige TLS y no usa sentencias preparadas', async () => {
    const sql = connectHosted(HOSTEADA)
    try {
      assert.equal(sql.options.prepare, false)
      assert.equal(sql.options.ssl, 'require')
      assert.equal(sql.options.max, 1)
    } finally {
      await sql.end()
    }
  })

  it('un error de la base se informa sólo con su código', () => {
    const e = Object.assign(new Error('connect ECONNREFUSED pooler.ejemplo.invalid:5432 clave-de-prueba'), { code: 'ECONNREFUSED' })
    const m = errorSinDatos(e)
    assert.match(m, /código ECONNREFUSED/)
    assert.ok(!m.includes('pooler') && !m.includes('clave'))
  })
})
