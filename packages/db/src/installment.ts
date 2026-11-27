// Cuotas de las pólizas en efectivo (0036_cuotas_de_poliza.sql). Mientras nadie las toca,
// el plan se calcula de la vigencia y del premio (`defaultPlan`); la primera edición o el
// primer pago lo guardan entero. Corren con el Ejecutor que les dan: desde la app, la
// transacción restringida de `conDatos`.

import type postgres from 'postgres'

import type { RenewalItem } from './renewal.ts'
import { listRenewals } from './renewal.ts'

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

/**
 * `total` en `n` cuotas de pesos enteros: todas iguales al cociente sin centavos, y la
 * primera se lleva la diferencia. Así cobra la compañía: 89.259,22 en 6 da 14.879,22 y cinco
 * de 14.876. `null` si no hay total.
 */
export const roundedAmounts = (total: string | null, n: number): (string | null)[] => {
  if (total === null || !Number.isFinite(Number(total))) return Array.from({ length: n }, () => null)
  const centavos = Math.round(Number(total) * 100)
  const resto = Math.floor(centavos / 100 / n) * 100
  return Array.from({ length: n }, (_, i) => ((i === 0 ? centavos - resto * (n - 1) : resto) / 100).toFixed(2))
}

/** El último día de pago que se puede elegir: así todos los meses lo tienen. */
export const MAX_PAY_DAY = 29

/** Cuándo cae la primera cuota: el mes siguiente al de inicio (a mes vencido) o el mismo (a mes en curso). */
export type PaymentTiming = 'ARREARS' | 'CURRENT'

/** Cómo se calcula el valor de la cuota: redondeo de la compañía, premio dividido o un valor a mano. */
export type AmountMode = 'ROUNDED' | 'SPLIT' | 'MANUAL'

/** `n` cuotas mensuales, el día `payDay` de cada mes, desde el mes de inicio o el siguiente. */
export const buildPlan = (
  termStart: string,
  n: number,
  amounts: readonly (string | null)[],
  payDay: number,
  timing: PaymentTiming = 'ARREARS',
): Installment[] => {
  const desde = timing === 'CURRENT' ? 0 : 1
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    dueDate: dayOfMonthAfter(termStart, desde + i, payDay),
    amount: amounts[i] ?? null,
    paid: false,
  }))
}

/** Los importes de `n` cuotas según el modo; `manual` es el valor de cada una en modo MANUAL. */
export const amountsFor = (mode: AmountMode, totalPremium: string | null, n: number, manual: string | null): (string | null)[] =>
  mode === 'ROUNDED' ? roundedAmounts(totalPremium, n) : mode === 'SPLIT' ? splitAmount(totalPremium, n) : Array.from({ length: n }, () => manual)

/**
 * El plan que se propone cuando nadie lo editó: una cuota por mes de vigencia, a mes vencido,
 * los días 10, con el redondeo de la compañía.
 */
export const defaultPlan = (termStart: string, termEnd: string, totalPremium: string | null): Installment[] => {
  const n = monthsCovered(termStart, termEnd)
  return buildPlan(termStart, n, roundedAmounts(totalPremium, n), DEFAULT_PAY_DAY, 'ARREARS')
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

export type EditPlanResult =
  | { readonly kind: 'ok' }
  | { readonly kind: 'not_found' }
  /** Bajar la cantidad borraría cuotas ya pagadas: la primera de ellas. */
  | { readonly kind: 'paid_removed'; readonly number: number }

/**
 * Rehace el plan de una póliza: `n` cuotas de `amount`, el día `payDay` de cada mes desde
 * el inicio de vigencia. Las que siguen existiendo conservan si estaban pagadas. No borra
 * cuotas pagadas: si bajar la cantidad lo haría, no cambia nada.
 */
export interface PlanEdit {
  readonly count: number
  readonly payDay: number
  readonly timing: PaymentTiming
  readonly mode: AmountMode
  /** El valor de cada cuota en modo MANUAL; se ignora en los otros. */
  readonly amount: string | null
}

export const editInstallmentPlan = async (sql: QueryExecutor, policyId: string, edit: PlanEdit): Promise<EditPlanResult> => {
  const { count: n, payDay } = edit
  if (!Number.isInteger(payDay) || payDay < 1 || payDay > MAX_PAY_DAY) throw new Error('editInstallmentPlan: el día va de 1 a 29')
  const term = await termOf(sql, policyId)
  if (term === null) return { kind: 'not_found' }
  const [pagada] = await sql<{ number: number }[]>`
    select number from policy_installment
    where policy_id = ${policyId} and number > ${n} and paid_at is not null
    order by number limit 1`
  if (pagada !== undefined) return { kind: 'paid_removed', number: pagada.number }
  const plan = buildPlan(term.term_start_date, n, amountsFor(edit.mode, term.total_premium, n, edit.amount), payDay, edit.timing)
  await saveInstallmentPlan(sql, policyId, plan)
  return { kind: 'ok' }
}

/** Las cuotas de una póliza: las guardadas o, si no hay, las que se proponen. `null` si no la ve. */
export const policyInstallments = async (
  sql: QueryExecutor,
  policyId: string,
): Promise<{ readonly installments: Installment[]; readonly saved: boolean; readonly outsideTerm: boolean } | null> => {
  const term = await termOf(sql, policyId)
  if (term === null) return null
  const guardadas = (await listInstallments(sql, [policyId])).get(policyId)
  if (guardadas === undefined)
    return { installments: defaultPlan(term.term_start_date, term.term_end_date, term.total_premium), saved: false, outsideTerm: false }
  // A mes vencido la última cae el mes siguiente al último mes de vigencia.
  const desde = `${term.term_start_date.slice(0, 7)}-01`
  const hasta = dayOfMonthAfter(term.term_end_date, 2, 1)
  const outsideTerm = guardadas.some((c) => c.dueDate < desde || c.dueDate >= hasta)
  return { installments: guardadas, saved: true, outsideTerm }
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

/** Sin mayúsculas ni tildes, para comparar «Caución» con «CAUCION». */
export const normalizeText = (texto: string): string =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

/** Riesgos que no se cobran en Pagos. */
const RIESGOS_SIN_PAGOS = new Set(['caucion', 'vida colectivo', 'vida obligatorio', 'retiro'])

export const paysInCash = (paymentMethod: string | null): boolean => paymentMethod !== null && normalizeText(paymentMethod) === 'efectivo'

/** Si la póliza lleva cuotas: en efectivo y fuera de Caución, Vida colectivo, Vida obligatorio y Retiro. */
export const hasInstallments = (paymentMethod: string | null, productReference: string | null): boolean =>
  paysInCash(paymentMethod) && (productReference === null || !RIESGOS_SIN_PAGOS.has(normalizeText(productReference)))

/** Hasta cuántos meses después del fin de vigencia se siguen mostrando las cuotas impagas. */
const MESES_DE_ATRASO = 12

/**
 * Las pólizas cuyas cuotas se cobran en Pagos: en efectivo, no anuladas, fuera de Caución,
 * Vida colectivo, Vida obligatorio y Retiro, y con fin de vigencia desde el primer día del
 * mes de hace un año (así una cuota impaga no desaparece cuando la póliza vence).
 */
export const listCashPolicies = async (sql: QueryExecutor, today: string): Promise<RenewalItem[]> => {
  const desde = dayOfMonthAfter(today, -MESES_DE_ATRASO, 1)
  const polizas = (await listRenewals(sql, { from: desde, to: '9999-12-31' })).filter((p) => hasInstallments(p.paymentMethod, p.productReference))
  if (polizas.length === 0) return []
  const anuladas = new Set(
    (
      await sql<{ policy_id: string }[]>`
        select v.policy_id from policy_version v
        where v.policy_id = any(${polizas.map((p) => p.policyId)}::uuid[])
          and v.effective_from <= current_date and (v.effective_to is null or v.effective_to > current_date)
          and v.status = 'CANCELLED'`
    ).map((f) => f.policy_id),
  )
  return polizas.filter((p) => !anuladas.has(p.policyId))
}

/**
 * Marca como pagadas todas las cuotas con fecha de pago hasta `today` (incluido) de las
 * pólizas que muestra Pagos (`listCashPolicies`). Las pólizas sin plan guardado guardan
 * primero el propuesto. Corre a nombre de `authz.usuario()`. Devuelve cuántas pólizas tocó
 * y cuántas cuotas marcó.
 */
export const markPaidUntil = async (sql: QueryExecutor, today: string): Promise<{ readonly policies: number; readonly installments: number }> => {
  let policies = 0
  let installments = 0
  for (const p of await listCashPolicies(sql, today)) {
    const actual = await policyInstallments(sql, p.policyId)
    if (actual?.installments.some((c) => !c.paid && c.dueDate <= today) !== true) continue
    if (!actual.saved) await saveInstallmentPlan(sql, p.policyId, actual.installments)
    const marcadas = await sql`
      update policy_installment
      set paid_at = clock_timestamp(), paid_by_user_id = authz.usuario(),
          updated_by_user_id = authz.usuario(), updated_at = clock_timestamp()
      where policy_id = ${p.policyId} and paid_at is null and due_date <= ${today}::date`
    policies += 1
    installments += marcadas.count
  }
  return { policies, installments }
}

/** El plan que se proponía antes de 0036+: primera cuota en el mes de inicio si empezaba hasta el 10, y el premio dividido. */
const legacyDefaultPlan = (termStart: string, termEnd: string, totalPremium: string | null): Installment[] => {
  const n = monthsCovered(termStart, termEnd)
  const desde = Number(termStart.slice(8, 10)) > DEFAULT_PAY_DAY ? 1 : 0
  return splitAmount(totalPremium, n).map((amount, i) => ({
    number: i + 1,
    dueDate: dayOfMonthAfter(termStart, desde + i, DEFAULT_PAY_DAY),
    amount,
    paid: false,
  }))
}

const mismasCuotas = (a: readonly Installment[], b: readonly Installment[]): boolean =>
  a.length === b.length && a.every((c, i) => b.some((otra, j) => j === i && c.dueDate === otra.dueDate && c.amount === otra.amount))

/**
 * Pasa al plan por defecto actual (a mes vencido, con Redondeo) los planes guardados que
 * nadie tocó: los que siguen siendo el plan propuesto anterior y tienen tildadas
 * exactamente las cuotas con fecha hasta `today`, como los dejó `markPaidUntil`. Después
 * vuelve a tildar por fecha: pagadas las que caen hasta `today`. Los planes editados o con
 * tildes cambiados a mano no se tocan y se cuentan en `skipped`.
 */
export const recalculateUntouchedPlans = async (
  sql: QueryExecutor,
  today: string,
): Promise<{ readonly recalculated: number; readonly skipped: number }> => {
  let recalculated = 0
  let skipped = 0
  const polizas = await listCashPolicies(sql, today)
  const guardadas = await listInstallments(sql, polizas.map((p) => p.policyId))
  for (const p of polizas) {
    const actual = guardadas.get(p.policyId)
    if (actual === undefined) continue
    const anterior = legacyDefaultPlan(p.termStartDate, p.termEndDate, p.totalPremium)
    const intacto = mismasCuotas(actual, anterior) && actual.every((c) => c.paid === c.dueDate <= today)
    if (!intacto) {
      skipped += 1
      continue
    }
    const nuevo = defaultPlan(p.termStartDate, p.termEndDate, p.totalPremium)
    if (mismasCuotas(actual, nuevo)) continue
    await saveInstallmentPlan(sql, p.policyId, nuevo)
    await sql`
      update policy_installment
      set paid_at = case when due_date <= ${today}::date then coalesce(paid_at, clock_timestamp()) end,
          paid_by_user_id = case when due_date <= ${today}::date then coalesce(paid_by_user_id, authz.usuario()) end,
          updated_by_user_id = authz.usuario(), updated_at = clock_timestamp()
      where policy_id = ${p.policyId}`
    recalculated += 1
  }
  return { recalculated, skipped }
}
