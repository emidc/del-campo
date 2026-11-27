// Prospectos (0025) como los usa el equipo: por `conDatos`, como `broker_app`, con RLS
// decidiendo. Contra Postgres real, con datos sintéticos y cada caso en una transacción
// revertida. Requiere DATABASE_URL con 0025 aplicada.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import { getPartyOverview, listClients } from '@del-campo/db'
import postgres from 'postgres'

import type { Principal } from '../session/admission.ts'
import { editarCuitCon, eliminarContactoCon } from './edicion.ts'
import {
  convertirEnClienteCon,
  crearProspectoCon,
  editarOrigenCon,
  estadoDeProspectoCon,
  prospectosCon,
} from './prospectos.ts'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: los prospectos requieren PostgreSQL real.')
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => undefined })

after(async () => {
  await sql.end()
})

class Rollback extends Error {}

const descartable = async (accion: (tx: postgres.TransactionSql) => Promise<void>): Promise<void> => {
  try {
    await sql.begin(async (tx) => {
      await accion(tx)
      throw new Rollback()
    })
  } catch (error) {
    if (!(error instanceof Rollback)) throw error
  }
}

const quien: Principal = { sub: 'sub-prospectos', email: 'sub-prospectos@sintetico.test', displayName: null }

const sembrar = async (tx: postgres.TransactionSql): Promise<void> => {
  const [usuario] = await tx<{ id: string }[]>`
    insert into app_user (email, status, auth_provider, role)
    values ('sub-prospectos@sintetico.test', 'ACTIVE', 'google', 'OPERADOR') returning id`
  assert.ok(usuario)
  await tx`insert into user_credential (user_id, provider, subject) values (${usuario.id}, 'google', 'sub-prospectos')`
}

const vacio = { identifier: '', phone: '', email: '', driveFolderUrl: '' }

const crear = async (
  tx: postgres.TransactionSql,
  datos: Partial<Parameters<typeof crearProspectoCon>[2]> & Pick<Parameters<typeof crearProspectoCon>[2], 'kind' | 'name'>,
): Promise<string> => {
  const resultado = await crearProspectoCon(tx, quien, { origin: 'INSTAGRAM', lastName: '', ...vacio, ...datos })
  if (resultado.kind !== 'ok') throw new Error(`no se creó el prospecto: ${resultado.message}`)
  return resultado.partyId
}

describe('prospectos', () => {
  it('se cargan sin CUIT ni DNI, con sus datos, y se listan aparte de los clientes', async () => {
    await descartable(async (tx) => {
      await sembrar(tx)
      const empresa = await crear(tx, {
        kind: 'ORGANIZATION',
        name: ' Viñedos  Sintéticos SA ',
        phone: '261 555 0101',
        email: 'Hola@Vinedos.test',
        driveFolderUrl: 'https://drive.google.com/drive/folders/prospectoSintetico',
      })
      const persona = await crear(tx, { kind: 'PERSON', name: 'Lía', lastName: 'Sintética', origin: 'WEB', identifier: '30.111.222' })

      const lista = await prospectosCon(tx, quien, '')
      assert.deepEqual(new Set(lista.prospects.map((p) => p.partyId)), new Set([empresa, persona]))
      assert.equal(lista.prospects.find((p) => p.partyId === persona)?.identifier, '30111222')
      assert.deepEqual((await prospectosCon(tx, quien, 'viñedos')).prospects.map((p) => p.displayName), ['Viñedos Sintéticos SA'])

      const empresas = await listClients(tx, 'ORGANIZATION', 'Sintéticos', 100)
      assert.equal(empresas.clients.some((c) => c.partyId === empresa), false, 'un prospecto no es cliente')

      const ficha = await getPartyOverview(tx, empresa, '2026-11-21', '2026-11-21T12:00:00Z')
      assert.equal(ficha?.displayName, 'Viñedos Sintéticos SA')
      assert.equal(ficha.driveFolderUrl, 'https://drive.google.com/drive/folders/prospectoSintetico')
      const contactos = await tx<{ value: string }[]>`select value from contact_point where party_id = ${empresa} order by channel`
      assert.deepEqual(contactos.map((c) => c.value), ['hola@vinedos.test', '261 555 0101'])
    })
  })

  it('si un dato no sirve no crea nada y dice cuál', async () => {
    await descartable(async (tx) => {
      await sembrar(tx)
      const antes = await tx<{ n: number }[]>`select count(*)::int as n from party`
      const sinNombre = await crearProspectoCon(tx, quien, { kind: 'ORGANIZATION', origin: 'MANUAL', name: ' ', lastName: '', ...vacio })
      assert.equal(sinNombre.kind, 'invalid')
      const cuitMalo = await crearProspectoCon(tx, quien, { kind: 'ORGANIZATION', origin: 'MANUAL', name: 'Mala SA', lastName: '', ...vacio, identifier: '30-1' })
      assert.deepEqual(cuitMalo, { kind: 'invalid', message: 'El CUIT va con 11 dígitos, por ejemplo 30-12345678-9.' })
      const despues = await tx<{ n: number }[]>`select count(*)::int as n from party`
      assert.equal(despues[0]?.n, antes[0]?.n)
    })
  })

  it('convertir pide el CUIT de la empresa; después conserva datos y origen y no duplica', async () => {
    await descartable(async (tx) => {
      await sembrar(tx)
      const empresa = await crear(tx, { kind: 'ORGANIZATION', name: 'Olivos Sintéticos SRL', origin: 'GOOGLE' })
      assert.deepEqual(await editarOrigenCon(tx, quien, empresa, 'FACEBOOK'), { kind: 'ok' })
      assert.equal((await editarOrigenCon(tx, quien, empresa, 'TIKTOK')).kind, 'invalid')
      assert.deepEqual(await convertirEnClienteCon(tx, quien, empresa), { kind: 'missing', field: 'CUIT' })

      assert.deepEqual(await editarCuitCon(tx, quien, empresa, '30712345679'), { kind: 'ok' })
      const partesAntes = await tx<{ n: number }[]>`select count(*)::int as n from party`
      // Un doble clic o un reintento: el segundo encuentra el rol cerrado.
      assert.deepEqual(await convertirEnClienteCon(tx, quien, empresa), { kind: 'ok' })
      assert.deepEqual(await convertirEnClienteCon(tx, quien, empresa), { kind: 'already' })
      const partesDespues = await tx<{ n: number }[]>`select count(*)::int as n from party`
      assert.equal(partesDespues[0]?.n, partesAntes[0]?.n, 'no se crea otro cliente')

      assert.deepEqual(await estadoDeProspectoCon(tx, quien, empresa), { active: false, origin: 'FACEBOOK' })
      assert.deepEqual((await prospectosCon(tx, quien, 'Olivos')).prospects, [])
      const empresas = await listClients(tx, 'ORGANIZATION', 'Olivos', 100)
      assert.deepEqual(empresas.clients.map((c) => [c.partyId, c.cuit]), [[empresa, '30-71234567-9']])
      assert.equal((await editarOrigenCon(tx, quien, empresa, 'MANUAL')).kind, 'not_found', 'el origen de un cliente ya no cambia')
    })
  })

  it('una persona necesita el DNI para convertirse, y un prospecto se puede eliminar', async () => {
    await descartable(async (tx) => {
      await sembrar(tx)
      const persona = await crear(tx, { kind: 'PERSON', name: 'Teo', lastName: 'Sintético' })
      assert.deepEqual(await convertirEnClienteCon(tx, quien, persona), { kind: 'missing', field: 'DNI' })
      assert.deepEqual(await eliminarContactoCon(tx, quien, persona), [])
      const [fila] = await tx<{ n: number }[]>`select count(*)::int as n from party where id = ${persona}`
      assert.equal(fila?.n, 0)
    })
  })
  it('no convierte si ya hay un cliente con el mismo CUIT o DNI, aunque esté escrito distinto', async () => {
    await descartable(async (tx) => {
      await sembrar(tx)
      const cliente = await crear(tx, { kind: 'ORGANIZATION', name: 'Bodega Sintética SA', identifier: '30-71234567-9' })
      assert.deepEqual(await convertirEnClienteCon(tx, quien, cliente), { kind: 'ok' })
      // Un prospecto con el mismo CUIT no cuenta como cliente: se puede seguir cargando.
      const otraEmpresa = await crear(tx, { kind: 'ORGANIZATION', name: 'Bodega Repetida SA', identifier: '30 71234567 9' })
      assert.deepEqual(await convertirEnClienteCon(tx, quien, otraEmpresa), {
        kind: 'duplicate',
        field: 'CUIT',
        value: '30-71234567-9',
        partyId: cliente,
        displayName: 'Bodega Sintética SA',
      })
      assert.equal((await estadoDeProspectoCon(tx, quien, otraEmpresa))?.active, true, 'sigue como prospecto')

      const persona = await crear(tx, { kind: 'PERSON', name: 'Ana', lastName: 'Sintética', identifier: '30.111.222' })
      assert.deepEqual(await convertirEnClienteCon(tx, quien, persona), { kind: 'ok' })
      const repetida = await crear(tx, { kind: 'PERSON', name: 'Ana María', lastName: 'Sintética', identifier: '30111222' })
      const resultado = await convertirEnClienteCon(tx, quien, repetida)
      assert.ok(resultado.kind === 'duplicate')
      assert.equal(resultado.partyId, persona)
      // Un DNI distinto sí se convierte.
      const distinta = await crear(tx, { kind: 'PERSON', name: 'Eva', lastName: 'Sintética', identifier: '30111223' })
      assert.deepEqual(await convertirEnClienteCon(tx, quien, distinta), { kind: 'ok' })
    })
  })
})
