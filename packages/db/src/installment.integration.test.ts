// Cuotas de pólizas en efectivo (0036). Contra Postgres real, con datos sintéticos y cada
// caso en una transacción revertida. Requiere DATABASE_URL con 0036 aplicada.

import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import postgres from 'postgres'

import {
  editInstallmentPlan,
  listCashPolicies,
  markPaidUntil,
  policyInstallments,
  recalculateUntouchedPlans,
  saveInstallmentPlan,
  setInstallmentPaid,
} from './installment.ts'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL no está configurada: las cuotas requieren PostgreSQL real.')
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

interface Id {
  readonly id: string
}

const uno = <T>(filas: readonly T[]): T => {
  const [fila] = filas
  if (fila === undefined) throw new Error('sin fila')
  return fila
}

/** Una póliza del 09/09/2026 al 09/12/2026 con premio 900 y un integrante del equipo. */
const sembrar = async (tx: postgres.TransactionSql): Promise<{ poliza: string; usuario: string }> => {
  const cliente = uno(await tx<Id[]>`insert into party (kind) values ('PERSON') returning id`).id
  const org = uno(await tx<Id[]>`insert into party (kind) values ('ORGANIZATION') returning id`).id
  const insurer = uno(await tx<Id[]>`insert into insurer (organization_party_id, canonical_name) values (${org}, 'Aseguradora Sintética') returning id`).id
  const poliza = uno(await tx<Id[]>`insert into policy (insurer_id, policy_number) values (${insurer}, 'SINT-C1') returning id`).id
  await tx`
    insert into policy_version (
      policy_id, version_number, effective_from, holder_party_id, term_start_date, term_end_date,
      renewal_mode, source_event_type, total_premium, payment_method
    )
    values (${poliza}, 1, '2026-01-01', ${cliente}, '2026-09-09', '2026-12-09', 'MANUAL', 'ISSUANCE', 900, 'Efectivo')`
  const usuario = uno(
    await tx<Id[]>`insert into app_user (email, status, auth_provider, role) values ('cuotas@sintetico.test', 'ACTIVE', 'google', 'OPERADOR') returning id`,
  ).id
  await tx`select set_config('authz.usuario_id', ${usuario}, true)`
  await tx`set local role broker_app`
  return { poliza, usuario }
}

describe('cuotas de póliza (0036)', () => {
  it('sin cuotas guardadas propone una por mes; marcar un pago guarda el plan entero', async () => {
    await descartable(async (tx) => {
      const { poliza, usuario } = await sembrar(tx)
      const antes = await policyInstallments(tx, poliza)
      assert.ok(antes)
      assert.equal(antes.saved, false)
      assert.deepEqual(antes.installments.map((c) => [c.dueDate, c.amount]), [
        ['2026-10-10', '300.00'],
        ['2026-11-10', '300.00'],
        ['2026-12-10', '300.00'],
      ])

      assert.equal(await setInstallmentPaid(tx, poliza, 2, true), true)
      const despues = await policyInstallments(tx, poliza)
      assert.ok(despues)
      assert.equal(despues.saved, true)
      assert.deepEqual(despues.installments.map((c) => c.paid), [false, true, false])
      const pago = uno(await tx<{ paid_by_user_id: string }[]>`select paid_by_user_id from policy_installment where policy_id = ${poliza} and number = 2`)
      assert.equal(pago.paid_by_user_id, usuario)

      assert.equal(await setInstallmentPaid(tx, poliza, 2, false), true)
      assert.deepEqual((await policyInstallments(tx, poliza))?.installments.map((c) => c.paid), [false, false, false])
      assert.equal(await setInstallmentPaid(tx, poliza, 9, true), false)
    })
  })

  it('editar el plan cambia fechas, importes y cantidad, y conserva los pagos de las que quedan', async () => {
    await descartable(async (tx) => {
      const { poliza } = await sembrar(tx)
      await setInstallmentPaid(tx, poliza, 1, true)
      await setInstallmentPaid(tx, poliza, 3, true)
      assert.equal(
        await saveInstallmentPlan(tx, poliza, [
          { dueDate: '2026-09-15', amount: '450' },
          { dueDate: '2026-10-15', amount: '450' },
        ]),
        true,
      )
      assert.deepEqual((await policyInstallments(tx, poliza))?.installments, [
        { number: 1, dueDate: '2026-09-15', amount: '450.00', paid: true },
        { number: 2, dueDate: '2026-10-15', amount: '450.00', paid: false },
      ])
      await saveInstallmentPlan(tx, poliza, [
        { dueDate: '2026-09-15', amount: '300' },
        { dueDate: '2026-10-15', amount: '300' },
        { dueDate: '2026-11-15', amount: null },
      ])
      assert.deepEqual((await policyInstallments(tx, poliza))?.installments.map((c) => [c.number, c.amount, c.paid]), [
        [1, '300.00', true],
        [2, '300.00', false],
        [3, null, false],
      ])
    })
  })

  it('el modal rehace el plan: cantidad, día, mes del primer pago y cálculo de la cuota', async () => {
    await descartable(async (tx) => {
      const { poliza } = await sembrar(tx)
      await setInstallmentPaid(tx, poliza, 1, true)
      const plan = async () => (await policyInstallments(tx, poliza))?.installments.map((c) => [c.dueDate, c.amount, c.paid])
      const editar = (edit: Partial<Parameters<typeof editInstallmentPlan>[2]>) =>
        editInstallmentPlan(tx, poliza, { count: 4, payDay: 5, timing: 'ARREARS', mode: 'MANUAL', amount: '250', ...edit })

      assert.deepEqual(await editar({}), { kind: 'ok' })
      assert.deepEqual(await plan(), [
        ['2026-10-05', '250.00', true],
        ['2026-11-05', '250.00', false],
        ['2026-12-05', '250.00', false],
        ['2027-01-05', '250.00', false],
      ])
      await editar({ timing: 'CURRENT', mode: 'ROUNDED', count: 7 })
      assert.deepEqual((await plan())?.slice(0, 2), [
        ['2026-09-05', '132.00', true],
        ['2026-10-05', '128.00', false],
      ])
      await editar({ mode: 'SPLIT', count: 3 })
      assert.deepEqual((await plan())?.map((c) => c[1]), ['300.00', '300.00', '300.00'])
    })
  })

  it('bajar la cantidad no borra cuotas pagadas', async () => {
    await descartable(async (tx) => {
      const { poliza } = await sembrar(tx)
      await setInstallmentPaid(tx, poliza, 3, true)
      assert.deepEqual(await editInstallmentPlan(tx, poliza, { count: 2, payDay: 10, timing: 'ARREARS', mode: 'ROUNDED', amount: null }), {
        kind: 'paid_removed',
        number: 3,
      })
      assert.equal((await policyInstallments(tx, poliza))?.installments.length, 3)
    })
  })

  it('avisa cuando una cuota guardada cae fuera de la vigencia', async () => {
    await descartable(async (tx) => {
      const { poliza } = await sembrar(tx)
      const editar = (count: number) => editInstallmentPlan(tx, poliza, { count, payDay: 10, timing: 'ARREARS', mode: 'ROUNDED', amount: null })
      await editar(4)
      assert.equal((await policyInstallments(tx, poliza))?.outsideTerm, false)
      await editar(5)
      assert.equal((await policyInstallments(tx, poliza))?.outsideTerm, true)
    })
  })

  it('Pagos: sin anuladas ni riesgos excluidos, y con las impagas de una póliza que venció hace meses', async () => {
    await descartable(async (tx) => {
      const { poliza } = await sembrar(tx)
      const hoy = '2027-03-15'
      const ids = async () => (await listCashPolicies(tx, hoy)).map((p) => p.policyId)
      assert.ok((await ids()).includes(poliza))
      await tx`reset role`
      await tx`update policy_version set status = 'CANCELLED' where policy_id = ${poliza}`
      await tx`set local role broker_app`
      assert.ok(!(await ids()).includes(poliza))
      await tx`reset role`
      await tx`update policy_version set status = 'ACTIVE', product_reference = 'Caución' where policy_id = ${poliza}`
      await tx`set local role broker_app`
      assert.ok(!(await ids()).includes(poliza))
    })
  })

  it('marcar pagado hasta hoy: las de fecha hasta hoy, de pólizas en efectivo, y no toca las de otras formas de pago', async () => {
    await descartable(async (tx) => {
      const { poliza } = await sembrar(tx)
      const r = await markPaidUntil(tx, '2026-12-10')
      assert.ok(r.installments >= 3)
      assert.deepEqual((await policyInstallments(tx, poliza))?.installments.map((c) => c.paid), [true, true, true])
      await tx`update policy_version set payment_method = 'Tarjeta' where policy_id = ${poliza}`
      await setInstallmentPaid(tx, poliza, 3, false)
      await markPaidUntil(tx, '2026-12-10')
      assert.deepEqual((await policyInstallments(tx, poliza))?.installments.map((c) => c.paid), [true, true, false])
    })
  })

  it('recalcular: pasa a mes vencido los planes anteriores intactos y vuelve a tildar por fecha', async () => {
    await descartable(async (tx) => {
      const { poliza } = await sembrar(tx)
      const anterior = [
        { dueDate: '2026-09-10', amount: '300' },
        { dueDate: '2026-10-10', amount: '300' },
        { dueDate: '2026-11-10', amount: '300' },
      ]
      await saveInstallmentPlan(tx, poliza, anterior)
      for (const n of [1, 2, 3]) await setInstallmentPaid(tx, poliza, n, true)
      assert.deepEqual(await recalculateUntouchedPlans(tx, '2026-11-27'), { recalculated: 1, skipped: 0 })
      assert.deepEqual((await policyInstallments(tx, poliza))?.installments.map((c) => [c.dueDate, c.paid]), [
        ['2026-10-10', true],
        ['2026-11-10', true],
        ['2026-12-10', false],
      ])
      assert.deepEqual(await recalculateUntouchedPlans(tx, '2026-11-27'), { recalculated: 0, skipped: 1 })
    })
  })

  it('recalcular no toca un plan anterior con un tilde cambiado a mano', async () => {
    await descartable(async (tx) => {
      const { poliza } = await sembrar(tx)
      await saveInstallmentPlan(tx, poliza, [
        { dueDate: '2026-09-10', amount: '300' },
        { dueDate: '2026-10-10', amount: '300' },
        { dueDate: '2026-11-10', amount: '300' },
      ])
      await setInstallmentPaid(tx, poliza, 1, true)
      assert.deepEqual(await recalculateUntouchedPlans(tx, '2026-11-27'), { recalculated: 0, skipped: 1 })
      assert.equal((await policyInstallments(tx, poliza))?.installments[0]?.dueDate, '2026-09-10')
    })
  })

  it('una póliza que no existe no tiene cuotas', async () => {
    await descartable(async (tx) => {
      await sembrar(tx)
      const otra = '00000000-0000-4000-8000-000000000000'
      assert.equal(await policyInstallments(tx, otra), null)
      assert.equal(await saveInstallmentPlan(tx, otra, [{ dueDate: '2026-09-10', amount: '1' }]), false)
      assert.equal(await setInstallmentPaid(tx, otra, 1, true), false)
    })
  })
})
