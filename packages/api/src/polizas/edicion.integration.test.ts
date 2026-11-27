// Pólizas, contactos y empresas editables (0023 y 0024) como los usa el equipo: por `conDatos`, como
// `broker_app`, con RLS decidiendo. Contra Postgres real, con datos sintéticos y cada caso
// en una transacción revertida. Requiere DATABASE_URL con 0024 aplicada.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import { expirePolicies, getPartyOverview, getPolicyDetail, todayInMendoza } from '@del-campo/db'
import postgres from 'postgres'

import {
  asociarEmpresaCon,
  asociarPersonaCon,
  bloqueosDeContactoCon,
  buscarEmpresasCon,
  buscarPersonasCon,
  editarCarpetaCon,
  editarCuitCon,
  editarDniCon,
  editarNombreCon,
  editarRazonSocialCon,
  eliminarContactoCon,
  quitarDeEmpresaCon,
} from '../clientes/edicion.ts'
import type { Principal } from '../session/admission.ts'
import {
  anularPolizaCon,
  editarCampoDePolizaCon,
  editarEndosoCon,
  eliminarPolizaCon,
  refacturarCon,
  renovarPolizaCon,
  siguienteEndosoCon,
  tareaDeVencimiento,
} from './edicion.ts'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: la edición de pólizas requiere PostgreSQL real.')
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

const quien: Principal = { sub: 'sub-polizas', email: 'sub-polizas@sintetico.test', displayName: null }

const uno = <T>(filas: readonly T[]): T => {
  const [fila] = filas
  if (fila === undefined) throw new Error('sin fila')
  return fila
}

interface Mundo {
  readonly usuario: string
  readonly ana: string
  readonly aseguradora: string
  readonly poliza: string
}

const persona = async (tx: postgres.TransactionSql, nombre: string, apellido: string): Promise<string> => {
  const { id } = uno(await tx<{ id: string }[]>`insert into party (kind) values ('PERSON') returning id`)
  await tx`insert into person_profile (party_id, first_name, last_name, dni) values (${id}, ${nombre}, ${apellido}, '20111222')`
  return id
}

const empresa = async (tx: postgres.TransactionSql, nombre: string): Promise<string> => {
  const { id } = uno(await tx<{ id: string }[]>`insert into party (kind) values ('ORGANIZATION') returning id`)
  await tx`insert into organization_profile (party_id, legal_name, cuit) values (${id}, ${nombre}, '30-11111111-1')`
  return id
}

const nuevaPoliza = async (
  tx: postgres.TransactionSql,
  aseguradora: string,
  tomador: string,
  numero: string,
  fin: string,
  estado: string | null = 'ACTIVE',
): Promise<string> => {
  const { id } = uno(await tx<{ id: string }[]>`
    insert into policy (insurer_id, policy_number) values (${aseguradora}, ${numero}) returning id`)
  await tx`
    insert into policy_version (
      policy_id, version_number, effective_from, holder_party_id, term_start_date, term_end_date,
      renewal_mode, premium, currency, status, source_event_type, source_event_id
    ) values (
      ${id}, 1, '2025-11-08', ${tomador}, '2025-11-08', ${fin}::date, 'MANUAL', 1000, 'ARS', ${estado}, 'Polizas', ${`zoho-${numero}`}
    )`
  return id
}

const sembrar = async (tx: postgres.TransactionSql): Promise<Mundo> => {
  const { id: usuario } = uno(await tx<{ id: string }[]>`
    insert into app_user (email, status, auth_provider, role)
    values ('sub-polizas@sintetico.test', 'ACTIVE', 'google', 'OPERADOR') returning id`)
  await tx`insert into user_credential (user_id, provider, subject) values (${usuario}, 'google', 'sub-polizas')`
  const ana = await persona(tx, 'Ana', 'Sintética')
  const org = await empresa(tx, 'Aseguradora Sintética SA')
  const { id: aseguradora } = uno(await tx<{ id: string }[]>`
    insert into insurer (organization_party_id, canonical_name) values (${org}, 'Aseguradora Sintética') returning id`)
  const poliza = await nuevaPoliza(tx, aseguradora, ana, 'SIN-0001', '2026-11-08')
  return { usuario, ana, aseguradora, poliza }
}

const estadoAbierto = async (tx: postgres.TransactionSql, poliza: string): Promise<string | null> =>
  uno(await tx<{ status: string | null }[]>`
    select status from policy_version where policy_id = ${poliza} and effective_to is null`).status

const terminos = {
  termStartDate: '2026-11-08',
  termEndDate: '2027-11-08',
  premium: '1.500,50',
  totalPremium: '1.900',
  sumInsured: '2.000.000',
  currency: 'ARS',
  producer: 'Productor Sintético',
  riskType: 'Integral de comercio',
  paymentMethod: 'Débito automático',
  renewalMode: 'MANUAL',
}

describe('vencimiento automático', () => {
  it('el día cambia a las 00:00 de Mendoza (03:00 UTC)', () => {
    assert.equal(todayInMendoza(new Date('2026-11-08T02:59:59Z')), '2026-11-07')
    assert.equal(todayInMendoza(new Date('2026-11-08T03:00:00Z')), '2026-11-08')
  })

  it('sólo vence las Vigentes cuyo fin llegó, también las ya cargadas; una Renovada queda', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const vieja = await nuevaPoliza(tx, m.aseguradora, m.ana, 'SIN-VIEJA', '2026-10-01')
      const renovada = await nuevaPoliza(tx, m.aseguradora, m.ana, 'SIN-REN', '2026-11-08', 'RENEWED')
      const futura = await nuevaPoliza(tx, m.aseguradora, m.ana, 'SIN-FUT', '2026-11-09')

      // Justo antes de las 00:00 del 08/11 en Mendoza: sólo la que terminó en octubre.
      await expirePolicies(tx, todayInMendoza(new Date('2026-11-08T02:59:00Z')))
      assert.equal(await estadoAbierto(tx, vieja), 'EXPIRED')
      assert.equal(await estadoAbierto(tx, m.poliza), 'ACTIVE')

      // Justo después: la que termina el 08/11 también; la Renovada y la futura no.
      await expirePolicies(tx, todayInMendoza(new Date('2026-11-08T03:01:00Z')))
      assert.equal(await estadoAbierto(tx, m.poliza), 'EXPIRED')
      assert.equal(await estadoAbierto(tx, renovada), 'RENEWED')
      assert.equal(await estadoAbierto(tx, futura), 'ACTIVE')
      assert.equal(await expirePolicies(tx, '2026-11-08'), 0, 'correrla de nuevo no cambia nada')
    })
  })

  it('la tarea programada exige CRON_SECRET y usa la fecha de Mendoza', async () => {
    await descartable(async (tx) => {
      await sembrar(tx)
      const secreto = 'x'.repeat(40)
      const sinClave = await tareaDeVencimiento(new Request('http://local/api/jobs/vencimientos'), { CRON_SECRET: secreto }, () => tx)
      assert.equal(sinClave.status, 401)
      const respuesta = await tareaDeVencimiento(
        new Request('http://local/api/jobs/vencimientos', { headers: { authorization: `Bearer ${secreto}` } }),
        { CRON_SECRET: secreto },
        () => tx,
        () => new Date('2026-11-08T03:00:00Z'),
      )
      const cuerpo = (await respuesta.json()) as { hoy: string; vencidas: number }
      assert.equal(cuerpo.hoy, '2026-11-08')
      assert.ok(cuerpo.vencidas >= 1)
    })
  })
})

describe('edición por campo de la póliza', () => {
  it('guarda un importe en formato argentino y rechaza lo que no lo es', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.deepEqual(await editarCampoDePolizaCon(tx, quien, m.poliza, 'premio', '12.345,67'), { kind: 'ok' })
      assert.deepEqual(await editarCampoDePolizaCon(tx, quien, m.poliza, 'productor', 'Juana Productora'), { kind: 'ok' })
      const r = await editarCampoDePolizaCon(tx, quien, m.poliza, 'sumaAsegurada', 'mucho')
      assert.equal(r.kind, 'invalid')
      const fila = uno(await tx<{ total_premium: string; producer: string; sum_insured: string | null }[]>`
        select total_premium::text, producer, sum_insured::text from policy_version where policy_id = ${m.poliza}`)
      assert.deepEqual(fila, { total_premium: '12345.67', producer: 'Juana Productora', sum_insured: null })
    })
  })

  it('no deja un fin de vigencia anterior al inicio ni un número repetido en la compañía', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await nuevaPoliza(tx, m.aseguradora, m.ana, 'SIN-OTRA', '2026-12-01')
      assert.equal((await editarCampoDePolizaCon(tx, quien, m.poliza, 'fin', '2025-01-01')).kind, 'invalid')
      assert.equal((await editarCampoDePolizaCon(tx, quien, m.poliza, 'numero', 'SIN-OTRA')).kind, 'invalid')
      assert.deepEqual(await editarCampoDePolizaCon(tx, quien, m.poliza, 'numero', 'SIN-0001-B'), { kind: 'ok' })
    })
  })
})

describe('anular póliza', () => {
  const hoy = '2026-11-01'

  it('anula una Vigente y deshacer la vuelve a Vigente', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.deepEqual(await anularPolizaCon(tx, quien, m.poliza, false, hoy), { kind: 'ok' })
      assert.equal(await estadoAbierto(tx, m.poliza), 'CANCELLED')
      assert.equal((await anularPolizaCon(tx, quien, m.poliza, false, hoy)).kind, 'invalid', 'ya está anulada')
      assert.deepEqual(await anularPolizaCon(tx, quien, m.poliza, true, hoy), { kind: 'ok' })
      assert.equal(await estadoAbierto(tx, m.poliza), 'ACTIVE')
      assert.equal((await anularPolizaCon(tx, quien, m.poliza, true, hoy)).kind, 'invalid', 'ya no está anulada')
      const eventos = await tx<{ action: string }[]>`
        select action from audit_event where object_id = ${m.poliza} order by id`
      assert.deepEqual(eventos.map((e) => e.action), ['policy.cancel', 'policy.uncancel'])
    })
  })

  it('no anula una Renovada, una Vencida ni una con fin de vigencia pasado', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const renovada = await nuevaPoliza(tx, m.aseguradora, m.ana, 'SIN-REN', '2026-12-31', 'RENEWED')
      const vencida = await nuevaPoliza(tx, m.aseguradora, m.ana, 'SIN-VENC', '2026-12-31', 'EXPIRED')
      const pasada = await nuevaPoliza(tx, m.aseguradora, m.ana, 'SIN-PAS', '2026-10-01')
      for (const poliza of [renovada, vencida, pasada])
        assert.equal((await anularPolizaCon(tx, quien, poliza, false, hoy)).kind, 'invalid')
      assert.equal(await estadoAbierto(tx, renovada), 'RENEWED')
      assert.equal(await estadoAbierto(tx, vencida), 'EXPIRED')
      assert.equal(await estadoAbierto(tx, pasada), 'ACTIVE')
    })
  })
})

describe('renovar póliza', () => {
  it('crea la sucesora Vigente, pasa la anterior a Renovada y se navega en ambos sentidos', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const r = await renovarPolizaCon(tx, quien, { ...terminos, previousPolicyId: m.poliza, policyNumber: 'SIN-0002', insurerId: m.aseguradora })
      assert.ok(r.kind === 'ok')
      assert.equal(await estadoAbierto(tx, m.poliza), 'RENEWED')
      assert.equal(await estadoAbierto(tx, r.policyId), 'ACTIVE')

      const anterior = await getPolicyDetail(tx, m.poliza, '2026-11-01')
      const nueva = await getPolicyDetail(tx, r.policyId, '2026-12-01')
      assert.ok(anterior !== null && nueva !== null)
      assert.deepEqual(anterior.renewedBy, { policyId: r.policyId, policyNumber: 'SIN-0002' })
      assert.deepEqual(nueva.renewedFrom, { policyId: m.poliza, policyNumber: 'SIN-0001' })
      const version = uno(nueva.history)
      assert.equal(version.producer, 'Productor Sintético')
      assert.equal(version.totalPremium, '1900')
      assert.equal(version.sumInsured, '2000000')
      assert.equal(version.holder.partyId, m.ana)

      const otra = await renovarPolizaCon(tx, quien, { ...terminos, previousPolicyId: m.poliza, policyNumber: 'SIN-0003', insurerId: m.aseguradora })
      assert.equal(otra.kind, 'invalid', 'una póliza ya renovada no se renueva dos veces')
    })
  })

  it('si el número ya existe en la compañía no crea nada ni cambia la anterior', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await nuevaPoliza(tx, m.aseguradora, m.ana, 'SIN-OCUPADA', '2027-01-01')
      const antes = uno(await tx<{ n: number }[]>`select count(*)::int as n from policy`).n
      const r = await renovarPolizaCon(tx, quien, { ...terminos, previousPolicyId: m.poliza, policyNumber: 'SIN-OCUPADA', insurerId: m.aseguradora })
      assert.equal(r.kind, 'invalid')
      assert.equal(uno(await tx<{ n: number }[]>`select count(*)::int as n from policy`).n, antes)
      assert.equal(await estadoAbierto(tx, m.poliza), 'ACTIVE')
    })
  })

  it('un error de la base en medio de la renovación no deja la sucesora ni cambia el estado anterior', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      // La última escritura (la anterior a Renovada) falla: un trigger de prueba la rechaza.
      await tx`
        create function pg_temp.rechazar() returns trigger language plpgsql as $$
        begin if new.status = 'RENEWED' then raise exception 'falla simulada'; end if; return new; end $$`
      await tx`create trigger rechazar before update on policy_version for each row execute function pg_temp.rechazar()`
      await tx`savepoint antes`
      await assert.rejects(
        renovarPolizaCon(tx, quien, { ...terminos, previousPolicyId: m.poliza, policyNumber: 'SIN-0009', insurerId: m.aseguradora }),
      )
      await tx`rollback to savepoint antes`
      assert.equal(uno(await tx<{ n: number }[]>`select count(*)::int as n from policy where policy_number = 'SIN-0009'`).n, 0)
      assert.equal(await estadoAbierto(tx, m.poliza), 'ACTIVE')
      await tx`drop trigger rechazar on policy_version`
    })
  })
})

describe('registrar refacturación', () => {
  it('después del endoso 3 registra el 4 como versión nueva y conserva la anterior', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      for (const n of ['1', '2', '3']) {
        await tx`
          insert into endorsement (policy_id, number, kind, source_reference)
          values (${m.poliza}, ${n}, 'Cambio de cobertura', ${`zoho-endoso-${n}`})`
      }
      assert.equal(await siguienteEndosoCon(tx, quien, m.poliza), 4)
      const r = await refacturarCon(tx, quien, {
        ...terminos,
        termStartDate: '2025-11-08',
        termEndDate: '2026-11-08',
        premium: '1.200',
        policyId: m.poliza,
        effectiveFrom: '2026-03-01',
        endorsementNumber: 4,
      })
      assert.deepEqual(r, { kind: 'ok', endorsementNumber: 4 })

      const detalle = await getPolicyDetail(tx, m.poliza, '2026-04-01')
      assert.ok(detalle !== null)
      const [nueva, previa] = detalle.history
      assert.ok(nueva !== undefined && previa !== undefined && detalle.history.length === 2)
      assert.equal(nueva.endorsement?.number, '4')
      assert.equal(nueva.endorsement.kind, 'REFACTURACION')
      assert.equal(nueva.premium, '1200')
      assert.equal(previa.premium, '1000')
      assert.equal(previa.effectiveTo, '2026-03-01')
      assert.equal(previa.endorsement, null)

      // Otra persona guardó con el mismo número que vio: no duplica y le dice el siguiente.
      const tarde = await refacturarCon(tx, quien, { ...terminos, policyId: m.poliza, effectiveFrom: '2026-05-01', endorsementNumber: 4 })
      assert.deepEqual(tarde, { kind: 'taken', next: 5 })
    })
  })
})

describe('documentos en Drive y número de endoso', () => {
  const archivo = 'https://drive.google.com/file/d/polizaSintetica123/view'
  const carpeta = 'https://drive.google.com/drive/folders/carpetaSintetica123'

  it('la renovación guarda el documento de la nueva póliza y la ficha lo edita', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const mal = await renovarPolizaCon(tx, quien, { ...terminos, previousPolicyId: m.poliza, policyNumber: 'SIN-0002', insurerId: m.aseguradora, driveUrl: carpeta })
      assert.equal(mal.kind, 'invalid', 'una carpeta no es el documento')
      const r = await renovarPolizaCon(tx, quien, { ...terminos, previousPolicyId: m.poliza, policyNumber: 'SIN-0002', insurerId: m.aseguradora, driveUrl: archivo })
      assert.ok(r.kind === 'ok')
      assert.equal((await getPolicyDetail(tx, r.policyId, '2026-12-01'))?.driveUrl, archivo)

      const otro = 'https://docs.google.com/document/d/otroSintetico/edit'
      assert.deepEqual(await editarCampoDePolizaCon(tx, quien, m.poliza, 'drive', otro), { kind: 'ok' })
      assert.equal((await editarCampoDePolizaCon(tx, quien, m.poliza, 'drive', 'https://example.com/x')).kind, 'invalid')
      assert.equal((await getPolicyDetail(tx, m.poliza, '2026-11-01'))?.driveUrl, otro, 'también en una póliza ya renovada')
      assert.deepEqual(await editarCampoDePolizaCon(tx, quien, m.poliza, 'drive', ''), { kind: 'ok' })
      assert.equal((await getPolicyDetail(tx, m.poliza, '2026-11-01'))?.driveUrl, null)
    })
  })

  it('el número de endoso se elige, deja huecos y los próximos siguen desde el mayor', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      await tx`insert into endorsement (policy_id, number, kind, source_reference) values (${m.poliza}, '003', 'Cambio', 'zoho-endoso-3')`
      const base = { ...terminos, termStartDate: '2025-11-08', termEndDate: '2026-11-08', policyId: m.poliza }
      assert.deepEqual(
        await refacturarCon(tx, quien, { ...base, effectiveFrom: '2026-02-01', endorsementNumber: 3 }),
        { kind: 'taken', next: 4 },
        'el 3 ya vino de Zoho como 003',
      )
      assert.equal((await refacturarCon(tx, quien, { ...base, effectiveFrom: '2026-02-01', endorsementNumber: 0 })).kind, 'invalid')
      const r = await refacturarCon(tx, quien, { ...base, effectiveFrom: '2026-02-01', endorsementNumber: 5, driveUrl: archivo })
      assert.deepEqual(r, { kind: 'ok', endorsementNumber: 5 })
      assert.equal(await siguienteEndosoCon(tx, quien, m.poliza), 6)
      const detalle = await getPolicyDetail(tx, m.poliza, '2026-03-01')
      assert.equal(detalle?.history[0]?.endorsement?.driveUrl, archivo)
    })
  })

  it('edita un endoso: número y documento siempre, condiciones sólo con la versión abierta', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const base = { ...terminos, termStartDate: '2025-11-08', termEndDate: '2026-11-08', policyId: m.poliza }
      await refacturarCon(tx, quien, { ...base, effectiveFrom: '2026-02-01', endorsementNumber: 1 })
      await refacturarCon(tx, quien, { ...base, effectiveFrom: '2026-03-01', endorsementNumber: 2 })
      const endosos = await tx<{ id: string; number: string }[]>`select id, number from endorsement where policy_id = ${m.poliza} order by number`
      const [primero, segundo] = endosos
      assert.ok(primero !== undefined && segundo !== undefined)

      // El 1 tiene la versión cerrada: número y documento sí, condiciones no.
      assert.equal(
        (await editarEndosoCon(tx, quien, { policyId: m.poliza, endorsementId: primero.id, number: '2', driveUrl: '' })).kind,
        'invalid',
        'el 2 ya existe',
      )
      assert.deepEqual(
        await editarEndosoCon(tx, quien, { policyId: m.poliza, endorsementId: primero.id, number: '7', driveUrl: archivo }),
        { kind: 'ok' },
      )
      assert.equal(
        (await editarEndosoCon(tx, quien, { policyId: m.poliza, endorsementId: primero.id, number: '7', driveUrl: '', terms: base })).kind,
        'invalid',
      )
      assert.equal(await siguienteEndosoCon(tx, quien, m.poliza), 8)

      // El 2 es la versión abierta: también sus condiciones.
      assert.deepEqual(
        await editarEndosoCon(tx, quien, { policyId: m.poliza, endorsementId: segundo.id, number: '2', driveUrl: archivo, terms: { ...base, premium: '2.500' } }),
        { kind: 'ok' },
      )
      const detalle = await getPolicyDetail(tx, m.poliza, '2026-04-01')
      assert.ok(detalle !== null)
      const [abierta, cerrada] = detalle.history
      assert.equal(abierta?.premium, '2500')
      assert.equal(abierta.endorsement?.driveUrl, archivo)
      assert.equal(cerrada?.endorsement?.number, '7')
      assert.equal(cerrada.endorsement.driveUrl, archivo)
    })
  })
})

describe('eliminar póliza', () => {
  it('con una gestión vinculada no se borra; sin vínculos se borra con su historial', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const conGestion = await nuevaPoliza(tx, m.aseguradora, m.ana, 'SIN-GES', '2027-01-01')
      await tx`
        insert into service_case (kind, title, party_id, policy_id, created_by_user_id)
        values ('OTRO', 'Gestión sintética', ${m.ana}, ${conGestion}, ${m.usuario})`
      assert.deepEqual(await eliminarPolizaCon(tx, quien, conGestion), ['GESTIONES'])

      // Con una versión cerrada por refacturación, que es inmutable salvo para este borrado.
      await refacturarCon(tx, quien, { ...terminos, termStartDate: '2025-11-08', policyId: m.poliza, effectiveFrom: '2026-03-01', endorsementNumber: 1 })
      assert.deepEqual(await eliminarPolizaCon(tx, quien, m.poliza), [])
      assert.equal(uno(await tx<{ n: number }[]>`select count(*)::int as n from policy where id = ${m.poliza}`).n, 0)
      assert.equal(uno(await tx<{ n: number }[]>`select count(*)::int as n from policy_version where policy_id = ${m.poliza}`).n, 0)
    })
  })
})

describe('ficha del contacto', () => {
  it('edita nombre y DNI, y el encabezado lee el nombre nuevo', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.deepEqual(await editarNombreCon(tx, quien, m.ana, ' Ana María ', 'Sintética'), { kind: 'ok' })
      assert.deepEqual(await editarDniCon(tx, quien, m.ana, '30.123.456'), { kind: 'ok' })
      assert.equal((await editarDniCon(tx, quien, m.ana, 'abc')).kind, 'invalid')
      const vista = await getPartyOverview(tx, m.ana, '2026-11-21', '2026-11-21T12:00:00Z')
      assert.ok(vista !== null)
      assert.equal(vista.displayName, 'Ana María Sintética')
      assert.equal(vista.dni, '30123456')
    })
  })

  it('asocia sólo empresas guardadas, buscándolas mientras se escribe', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const org = await empresa(tx, 'Ferretería Sintética SRL')
      const opciones = await buscarEmpresasCon(tx, quien, 'ferreter')
      assert.deepEqual(opciones.map((o) => o.partyId), [org])
      assert.deepEqual(await asociarEmpresaCon(tx, quien, m.ana, org), { kind: 'ok' })
      assert.equal((await asociarEmpresaCon(tx, quien, m.ana, org)).kind, 'invalid', 'no duplica')
      assert.equal((await asociarEmpresaCon(tx, quien, m.ana, m.ana)).kind, 'invalid', 'una persona no es una empresa')
      const vista = await getPartyOverview(tx, m.ana, '2026-11-21', '2099-01-01T00:00:00Z')
      assert.deepEqual(vista?.organizations.map((o) => o.partyId), [org])
    })
  })

  it('cada vínculo bloquea el borrado; sin vínculos se borra definitivamente', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      assert.deepEqual(await bloqueosDeContactoCon(tx, quien, m.ana), ['POLIZAS'])
      assert.deepEqual(await eliminarContactoCon(tx, quien, m.ana), ['POLIZAS'])

      const beto = await persona(tx, 'Beto', 'Sintético')
      await tx`insert into contact_point (party_id, channel, value, normalized_value, source) values (${beto}, 'EMAIL', 'b@s.test', 'b@s.test', 'Zoho')`
      const { id: gestion } = uno(await tx<{ id: string }[]>`
        insert into service_case (kind, title, party_id, status, closed_at, created_by_user_id)
        values ('OTRO', 'Cerrada', ${beto}, 'CERRADA', now(), ${m.usuario}) returning id`)
      assert.deepEqual(await bloqueosDeContactoCon(tx, quien, beto), ['GESTIONES'], 'aunque esté cerrada')
      await tx`delete from service_case where id = ${gestion}`
      await tx`
        insert into task (title, party_id, status, done_at, created_by_user_id)
        values ('Hecha', ${beto}, 'HECHA', now(), ${m.usuario})`
      assert.deepEqual(await eliminarContactoCon(tx, quien, beto), ['TAREAS'], 'aunque esté hecha')
      await tx`delete from task where party_id = ${beto}`

      assert.deepEqual(await eliminarContactoCon(tx, quien, beto), [])
      assert.equal(uno(await tx<{ n: number }[]>`select count(*)::int as n from party where id = ${beto}`).n, 0)
      assert.equal(uno(await tx<{ n: number }[]>`select count(*)::int as n from contact_point where party_id = ${beto}`).n, 0)
    })
  })
})

describe('ficha de la empresa', () => {
  const carpeta = 'https://drive.google.com/drive/folders/carpetaSintetica123'

  it('edita razón social, CUIT y carpeta de Drive, y la ficha lee los valores nuevos', async () => {
    await descartable(async (tx) => {
      await sembrar(tx)
      const org = await empresa(tx, 'Bodega Sintética SA')
      await tx`
        insert into document_link (resource_type, resource_id, drive_file_id, drive_url, drive_item_type, reconciliation_status, link_level)
        values ('PARTY', ${org}, 'zoho', 'https://drive.google.com/drive/folders/deZoho', 'FOLDER', 'NOT_REFERENCED', 'ZOHO_UNVERIFIED')`
      assert.deepEqual(await editarRazonSocialCon(tx, quien, org, '  001 - Bodega   Sintética SA '), { kind: 'ok' })
      assert.equal((await editarRazonSocialCon(tx, quien, org, ' ')).kind, 'invalid')
      assert.deepEqual(await editarCuitCon(tx, quien, org, '30 71234567 9'), { kind: 'ok' })
      assert.equal((await editarCuitCon(tx, quien, org, '30-123')).kind, 'invalid')
      assert.equal((await editarCarpetaCon(tx, quien, org, 'https://drive.google.com/file/d/archivo/view')).kind, 'invalid', 'un archivo no es carpeta')
      assert.deepEqual(await editarCarpetaCon(tx, quien, org, carpeta), { kind: 'ok' })

      const vista = await getPartyOverview(tx, org, '2026-11-21', '2026-11-21T12:00:00Z')
      assert.equal(vista?.displayName, '001 - Bodega Sintética SA')
      assert.equal(vista.cuit, '30-71234567-9')
      assert.equal(vista.driveFolderUrl, carpeta, 'reemplaza a la de Zoho')
      const enlaces = await tx<{ n: number }[]>`select count(*)::int as n from document_link where resource_type = 'PARTY' and resource_id = ${org}`
      assert.equal(uno(enlaces).n, 1)

      assert.deepEqual(await editarCarpetaCon(tx, quien, org, ''), { kind: 'ok' })
      assert.equal((await getPartyOverview(tx, org, '2026-11-21', '2026-11-21T12:00:00Z'))?.driveFolderUrl, null)
    })
  })

  it('asocia contactos guardados y los quita sin tocar sus fichas ni sus otros vínculos', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const org = await empresa(tx, 'Bodega Sintética SA')
      const otra = await empresa(tx, 'Ferretería Sintética SRL')
      assert.deepEqual((await buscarPersonasCon(tx, quien, 'sintét')).map((o) => o.partyId), [m.ana])
      assert.deepEqual(await asociarPersonaCon(tx, quien, org, m.ana), { kind: 'ok' })
      assert.equal((await asociarPersonaCon(tx, quien, org, otra)).kind, 'invalid', 'una empresa no es un contacto')
      assert.deepEqual(await asociarEmpresaCon(tx, quien, m.ana, otra), { kind: 'ok' })
      const ahora = '2099-01-01T00:00:00Z'
      assert.deepEqual((await getPartyOverview(tx, org, '2026-11-21', ahora))?.contacts.map((c) => c.partyId), [m.ana])

      assert.deepEqual(await quitarDeEmpresaCon(tx, quien, org, m.ana), { kind: 'ok' })
      assert.equal((await quitarDeEmpresaCon(tx, quien, org, m.ana)).kind, 'not_found')
      assert.deepEqual((await getPartyOverview(tx, org, '2026-11-21', ahora))?.contacts, [])
      const ana = await getPartyOverview(tx, m.ana, '2026-11-21', ahora)
      assert.deepEqual(ana?.organizations.map((o) => o.partyId), [otra])
    })
  })

  it('una empresa con pólizas no se elimina; sin vínculos se borra y sus contactos quedan', async () => {
    await descartable(async (tx) => {
      const m = await sembrar(tx)
      const org = await empresa(tx, 'Bodega Sintética SA')
      await nuevaPoliza(tx, m.aseguradora, org, 'SIN-0002', '2027-01-01')
      assert.deepEqual(await eliminarContactoCon(tx, quien, org), ['POLIZAS'])

      const libre = await empresa(tx, 'Libre Sintética SA')
      assert.deepEqual(await asociarPersonaCon(tx, quien, libre, m.ana), { kind: 'ok' })
      assert.deepEqual(await eliminarContactoCon(tx, quien, libre), [])
      assert.equal(uno(await tx<{ n: number }[]>`select count(*)::int as n from party where id = ${libre}`).n, 0)
      assert.equal(uno(await tx<{ n: number }[]>`select count(*)::int as n from party where id = ${m.ana}`).n, 1)
    })
  })
})
