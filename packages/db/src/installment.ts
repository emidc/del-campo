// Cuotas de las pólizas en efectivo (0036_cuotas_de_poliza.sql). Mientras nadie las toca,
// el plan se calcula de la vigencia y del premio (`defaultPlan`); la primera edición o el
// primer pago lo guardan entero. Corren con el Ejecutor que les dan: desde la app, la
// transacción restringida de `conDatos`.

import type postgres from 'postgres'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export interface Installment {
  /** De 1 en adelante. */
  readonly number: number
  /** `AAAA-MM-DD`. */
  readonly dueDate: string
  /** Importe como lo guarda Postgres («296722.05»), o `null` si la póliza no tiene premio. */
  readonly amount: string | null
  readonly paid: boolean
}

export interface InstallmentInput {
  readonly dueDate: string
  readonly amount: string | null
}

export const MAX_INSTALLMENTS = 60
/** El día de pago por defecto. */
export const DEFAULT_PAY_DAY = 10
const DIAS_POR_MES = 365.25 / 12

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/

const dia = (fecha: string): number => Date.parse(`${fecha}T00:00:00Z`) / 86_400_000

/** Cuántos meses cubre la vigencia, redondeado al más cercano: al menos uno. */
export const monthsCovered = (termStart: string, termEnd: string): number =>
  Math.min(MAX_INSTALLMENTS, Math.max(1, Math.round((dia(termEnd) - dia(termStart)) / DIAS_POR_MES)))

/** El día `dia` del mes `n` meses después del de `fecha`. Si el mes es corto, su último día. */
export const dayOfMonthAfter = (fecha: string, n: number, diaDelMes: number): string => {
  const [, a, m] = FECHA.exec(fecha) ?? []
  const total = Number(a) * 12 + Number(m) - 1 + n
  const anio = Math.floor(total / 12)
  const mes = total % 12
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate()
  return `${String(anio)}-${String(mes + 1).padStart(2, '0')}-${String(Math.min(diaDelMes, ultimo)).padStart(2, '0')}`
}

/**
 * `total` repartido en `n` cuotas iguales, en centavos. La última se lleva la diferencia del
 * redondeo, así la suma da el total. `null` si no hay total.
 */
export const splitAmount = (total: string | null, n: number): (string | null)[] => {
  if (total === null || !Number.isFinite(Number(total))) return Array.from({ length: n }, () => null)
  const centavos = Math.round(Number(total) * 100)
  const cuota = Math.floor(centavos / n)
  return Array.from({ length: n }, (_, i) => ((i === n - 1 ? centavos - cuota * (n - 1) : cuota) / 100).toFixed(2))
}

/** El último día de pago que se puede elegir: así todos los meses lo tienen. */
export const MAX_PAY_DAY = 29

/**
 * `n` cuotas mensuales del mismo importe, el día `payDay` de cada mes. La primera cae ese
 * día del mes de inicio, o del mes siguiente si la vigencia empieza después de ese día.
 */
export const buildPlan = (termStart: string, n: number, amounts: readonly (string | null)[], payDay: number): Installment[] => {
  const desde = Number(termStart.slice(8, 10)) > payDay ? 1 : 0
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    dueDate: dayOfMonthAfter(termStart, desde + i, payDay),
    amount: amounts[i] ?? null,
    paid: false,
  }))
}

/**
 * El plan que se propone cuando nadie lo editó: una cuota por mes de vigencia, los días 10,
 * con el premio repartido en partes iguales.
 */
export const defaultPlan = (termStart: string, termEnd: string, totalPremium: string | null): Installment[] => {
  const n = monthsCovered(termStart, termEnd)
  return buildPlan(termStart, n, splitAmount(totalPremium, n), DEFAULT_PAY_DAY)
}

interface Row {
  readonly policy_id: string
  readonly number: number
  readonly due_date: string
  readonly amount: string | null
  readonly paid: boolean
}

const deFila = (r: Row): Installment => ({ number: r.number, dueDate: r.due_date, amount: r.amount, paid: r.paid })

/** Las cuotas guardadas de varias pólizas, por póliza. Una póliza sin cuotas guardadas no aparece. */
export const listInstallments = async (sql: QueryExecutor, policyIds: readonly string[]): Promise<Map<string, Installment[]>> => {
  const porPoliza = new Map<string, Installment[]>()
  if (policyIds.length === 0) return porPoliza
  const filas = await sql<Row[]>`
    select policy_id, number, to_char(due_date, 'YYYY-MM-DD') as due_date, amount::text, paid_at is not null as paid
    from policy_installment
    where policy_id = any(${[...policyIds]}::uuid[])
    order by policy_id, number`
  for (const f of filas) porPoliza.set(f.policy_id, [...(porPoliza.get(f.policy_id) ?? []), deFila(f)])
  return porPoliza
}

interface Term {
  readonly term_start_date: string
  readonly term_end_date: string
  readonly total_premium: string | null
}

/** La vigencia y el premio de la versión vigente de la póliza (o la más reciente). `null` si no la ve. */
const termOf = async (sql: QueryExecutor, policyId: string): Promise<Term | null> => {
  const [fila] = await sql<Term[]>`
    select to_char(v.term_start_date, 'YYYY-MM-DD') as term_start_date,
           to_char(v.term_end_date, 'YYYY-MM-DD') as term_end_date,
           v.total_premium::text
    from policy p join policy_version v on v.policy_id = p.id
    where p.id = ${policyId}
    order by (v.effective_from <= current_date and (v.effective_to is null or v.effective_to > current_date)) desc,
             v.effective_from desc, v.version_number desc
    limit 1`
  return fila ?? null
}

/**
 * Rehace el plan de una póliza: `n` cuotas de `amount`, el día `payDay` de cada mes desde
 * el inicio de vigencia. Las que siguen existiendo conservan si estaban pagadas. `false` si
 * la póliza no existe o no la ve.
 */
export const editInstallmentPlan = async (
  sql: QueryExecutor,
  policyId: string,
  n: number,
  amount: string | null,
  payDay: number,
): Promise<boolean> => {
  if (!Number.isInteger(payDay) || payDay < 1 || payDay > MAX_PAY_DAY) throw new Error('editInstallmentPlan: el día va de 1 a 29')
  const term = await termOf(sql, policyId)
  if (term === null) return false
  const plan = buildPlan(term.term_start_date, n, Array.from({ length: n }, () => amount), payDay)
  return saveInstallmentPlan(sql, policyId, plan)
}

/** Las cuotas de una póliza: las guardadas o, si no hay, las que se proponen. `null` si no la ve. */
export const policyInstallments = async (
  sql: QueryExecutor,
  policyId: string,
): Promise<{ readonly installments: Installment[]; readonly saved: boolean } | null> => {
  const term = await termOf(sql, policyId)
  if (term === null) return null
  const guardadas = (await listInstallments(sql, [policyId])).get(policyId)
  if (guardadas !== undefined) return { installments: guardadas, saved: true }
  return { installments: defaultPlan(term.term_start_date, term.term_end_date, term.total_premium), saved: false }
}

/**
 * Guarda el plan de cuotas de una póliza. Las cuotas que siguen existiendo conservan si
 * estaban pagadas; las que sobran se borran. `false` si la póliza no existe o no la ve.
 */
export const saveInstallmentPlan = async (sql: QueryExecutor, policyId: string, plan: readonly InstallmentInput[]): Promise<boolean> => {
  if (plan.length < 1 || plan.length > MAX_INSTALLMENTS) throw new Error('saveInstallmentPlan: entre 1 y 60 cuotas')
  if ((await termOf(sql, policyId)) === null) return false
  await sql`delete from policy_installment where policy_id = ${policyId} and number > ${plan.length}`
  for (const [i, c] of plan.entries())
    await sql`
      insert into policy_installment (policy_id, number, due_date, amount, updated_by_user_id)
      values (${policyId}, ${i + 1}, ${c.dueDate}::date, ${c.amount}::numeric, authz.usuario())
      on conflict (policy_id, number) do update
      set due_date = excluded.due_date, amount = excluded.amount,
          updated_by_user_id = excluded.updated_by_user_id, updated_at = clock_timestamp()`
  return true
}

/**
 * Marca o desmarca como pagada la cuota `number`. Si el plan no estaba guardado, guarda
 * primero el propuesto. `false` si la póliza no existe, no la ve o no tiene esa cuota.
 */
export const setInstallmentPaid = async (sql: QueryExecutor, policyId: string, number: number, paid: boolean): Promise<boolean> => {
  const actual = await policyInstallments(sql, policyId)
  if (actual?.installments.some((c) => c.number === number) !== true) return false
  if (!actual.saved) await saveInstallmentPlan(sql, policyId, actual.installments)
  await sql`
    update policy_installment
    set paid_at = case when ${paid}::boolean then clock_timestamp() end,
        paid_by_user_id = case when ${paid}::boolean then authz.usuario() end,
        updated_by_user_id = authz.usuario(), updated_at = clock_timestamp()
    where policy_id = ${policyId} and number = ${number}`
  return true
}

/** Sin mayúsculas ni tildes. */
const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

/**
 * Marca como pagadas todas las cuotas con fecha de pago hasta `today` (incluido) de las
 * pólizas en efectivo con fin de vigencia desde el primer día del mes de `today`: las que
 * muestra Pagos. Las pólizas sin plan guardado guardan primero el propuesto. Corre a nombre
 * de `authz.usuario()`. Devuelve cuántas pólizas tocó y cuántas cuotas marcó.
 */
export const markPaidUntil = async (sql: QueryExecutor, today: string): Promise<{ readonly policies: number; readonly installments: number }> => {
  const polizas = await sql<{ id: string; payment_method: string | null }[]>`
    select p.id, pv.payment_method
    from policy p
    join lateral (
      select v.payment_method, v.term_end_date
      from policy_version v
      where v.policy_id = p.id
        and v.effective_from <= current_date
        and (v.effective_to is null or v.effective_to > current_date)
      order by v.effective_from desc, v.version_number desc
      limit 1
    ) pv on true
    where pv.term_end_date >= date_trunc('month', ${today}::date)::date`
  let policies = 0
  let installments = 0
  for (const p of polizas) {
    if (p.payment_method === null || normalizar(p.payment_method) !== 'efectivo') continue
    const actual = await policyInstallments(sql, p.id)
    if (actual === null) continue
    if (!actual.saved) await saveInstallmentPlan(sql, p.id, actual.installments)
    const marcadas = await sql`
      update policy_installment
      set paid_at = clock_timestamp(), paid_by_user_id = authz.usuario(),
          updated_by_user_id = authz.usuario(), updated_at = clock_timestamp()
      where policy_id = ${p.id} and paid_at is null and due_date <= ${today}::date`
    if (marcadas.count > 0) {
      policies += 1
      installments += marcadas.count
    }
  }
  return { policies, installments }
}
