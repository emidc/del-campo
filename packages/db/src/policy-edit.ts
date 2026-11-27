// Pólizas editables desde la app (0023_polizas_y_contactos_editables.sql): edición por
// campo, renovación, refacturación, borrado definitivo y vencimiento automático. Corren
// con el Ejecutor que les dan: desde la app, la transacción restringida de `conDatos`,
// donde RLS decide y `authz.usuario()` es quien actúa. Lo que hace más de una escritura
// cuenta con esa transacción: si algo falla, no queda nada a medias.

import type postgres from 'postgres'

import { classifyDriveUrl } from './zoho-links/drive-url.ts'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

/** Estados de póliza que escribe Broker OS. Los del origen se muestran tal cual vienen. */
export const POLICY_STATUS = { vigente: 'ACTIVE', vencida: 'EXPIRED', renovada: 'RENEWED', anulada: 'CANCELLED' } as const

/** Los estados de Zoho, como los escribe Broker OS. Lo desconocido queda como vino. */
export const statusFromZoho = (estado: string | undefined | null): string | null => {
  const limpio = (estado ?? '').trim()
  if (limpio === '') return null
  const clave = limpio.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  const mapa: Readonly<Record<string, string>> = {
    VIGENTE: POLICY_STATUS.vigente,
    VENCIDA: POLICY_STATUS.vencida,
    RENOVADA: POLICY_STATUS.renovada,
    ANULADA: POLICY_STATUS.anulada,
  }
  return mapa[clave] ?? limpio
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

export const isDate = (valor: string): boolean => {
  if (!FECHA.test(valor)) return false
  const d = new Date(`${valor}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor
}

/**
 * Un importe como lo escribe el equipo («1.234,56», «1234.56», «$ 12.000»), en el formato
 * que guarda Postgres. `null` si está vacío; `undefined` si no es un importe.
 */
export const parseAmount = (crudo: string): string | null | undefined => {
  // Sin moneda ni espacios: «AR$ 39,204,000.00», «$ 12.000», «US$ 1.500,50».
  const valor = crudo.replace(/^\s*[A-Za-z]{0,3}\$?/, '').replace(/\s/g, '')
  if (valor === '') return null
  const coma = valor.lastIndexOf(',')
  const punto = valor.lastIndexOf('.')
  let normal = valor
  // Con los dos separadores, el último es el decimal (125.000,50 o 39,204,000.00).
  if (coma >= 0 && punto >= 0) normal = coma > punto ? valor.replace(/\./g, '').replace(',', '.') : valor.replace(/,/g, '')
  else if (/^\d{1,3}(,\d{3}){2,}$/.test(valor)) normal = valor.replace(/,/g, '')
  else if (coma >= 0) normal = valor.replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(valor)) normal = valor.replace(/\./g, '')
  return /^\d+(\.\d+)?$/.test(normal) ? normal : undefined
}

/** El día de hoy en Mendoza, `AAAA-MM-DD`. El vencimiento corre a las 00:00 de ahí. */
export const todayInMendoza = (ahora: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Mendoza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora)

/**
 * Vence las pólizas Vigentes cuyo fin de vigencia ya llegó: a las 00:00 de Mendoza del
 * día de fin pasan a Vencida. Sólo toca la versión abierta y sólo si está Vigente: una
 * Renovada, Anulada o sin estado queda como está. Correrla dos veces no cambia nada.
 */
export const expirePolicies = async (sql: QueryExecutor, today: string): Promise<number> => {
  if (!isDate(today)) throw new Error('expirePolicies: today tiene que ser AAAA-MM-DD')
  const filas = await sql<{ id: string }[]>`
    update policy_version set status = ${POLICY_STATUS.vencida}
    where effective_to is null and status = ${POLICY_STATUS.vigente} and term_end_date <= ${today}::date
    returning id`
  return filas.length
}

/** El estado como debe verse hoy, aunque el vencimiento programado todavía no haya corrido. */
export const effectiveStatus = (status: string | null, termEndDate: string, today: string): string | null =>
  status === POLICY_STATUS.vigente && termEndDate <= today ? POLICY_STATUS.vencida : status

/**
 * Qué se ofrece sobre el estado: anular una póliza Vigente o deshacer la anulación de una
 * Anulada. Sólo si el fin de vigencia es futuro; si no, nada.
 */
export const cancelOption = (status: string | null, termEndDate: string, today: string): 'anular' | 'deshacer' | null => {
  if (termEndDate <= today) return null
  if (status === POLICY_STATUS.vigente) return 'anular'
  if (status === POLICY_STATUS.anulada) return 'deshacer'
  return null
}

/**
 * Anula la póliza (Vigente → Anulada) o deshace la anulación (Anulada → Vigente). Sólo
 * con fin de vigencia futuro. Toca la versión abierta y deja constancia de quién lo hizo.
 */
export const setPolicyCancelled = async (sql: QueryExecutor, policyId: string, today: string, deshacer: boolean): Promise<EditResult> => {
  const [version] = await sql<{ id: string; status: string | null; term_end_date: string }[]>`
    select id, status, to_char(term_end_date, 'YYYY-MM-DD') as term_end_date
    from policy_version where policy_id = ${policyId} and effective_to is null
    order by version_number desc limit 1 for update`
  if (version === undefined) return { kind: 'not_found' }
  if (cancelOption(version.status, version.term_end_date, today) !== (deshacer ? 'deshacer' : 'anular'))
    return {
      kind: 'invalid',
      message: deshacer
        ? 'Sólo se deshace la anulación de una póliza Anulada con fin de vigencia futuro.'
        : 'Sólo se anula una póliza Vigente con fin de vigencia futuro.',
    }
  await sql`
    update policy_version set status = ${deshacer ? POLICY_STATUS.vigente : POLICY_STATUS.anulada} where id = ${version.id}`
  await sql`
    insert into audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
    values (authz.usuario(), 'app', ${deshacer ? 'policy.uncancel' : 'policy.cancel'}, 'policy', ${policyId}, 'ok')`
  return { kind: 'ok' }
}

// ── Edición por campo ────────────────────────────────────────────────────────

export const POLICY_FIELDS = [
  'numero',
  'inicio',
  'fin',
  'prima',
  'premio',
  'sumaAsegurada',
  'moneda',
  'productor',
  'tipoRiesgo',
  'formaPago',
  'renovacion',
  'drive',
] as const
export type PolicyField = (typeof POLICY_FIELDS)[number]

export const isPolicyField = (valor: unknown): valor is PolicyField =>
  typeof valor === 'string' && (POLICY_FIELDS as readonly string[]).includes(valor)

export type EditResult =
  | { readonly kind: 'ok' }
  | { readonly kind: 'invalid'; readonly message: string }
  | { readonly kind: 'not_found' }

const COLUMNA_DE_TEXTO: Partial<Record<PolicyField, string>> = {
  moneda: 'currency',
  productor: 'producer',
  tipoRiesgo: 'product_reference',
  formaPago: 'payment_method',
}
const COLUMNA_DE_IMPORTE: Partial<Record<PolicyField, string>> = {
  prima: 'premium',
  premio: 'total_premium',
  sumaAsegurada: 'sum_insured',
}

const invalido = (message: string): EditResult => ({ kind: 'invalid', message })

/**
 * El enlace al documento de una póliza o de un endoso: la URL de un archivo de Drive.
 * `null` si está vacío; `undefined` si no es la URL de un archivo de Drive.
 */
export const cleanDriveFileUrl = (raw: string | undefined): string | null | undefined => {
  const limpia = (raw ?? '').trim()
  if (limpia === '') return null
  const enlace = classifyDriveUrl(limpia)
  return enlace.ok && enlace.target === 'FILE' && limpia.length <= 500 ? limpia : undefined
}

const DRIVE_INVALIDO = 'Pegá la URL de un archivo de Drive, como https://drive.google.com/file/d/…'

interface OpenVersion {
  readonly id: string
  readonly term_start_date: string
  readonly term_end_date: string
}

const openVersion = async (sql: QueryExecutor, policyId: string): Promise<OpenVersion | undefined> => {
  const [fila] = await sql<OpenVersion[]>`
    select id, to_char(term_start_date, 'YYYY-MM-DD') as term_start_date, to_char(term_end_date, 'YYYY-MM-DD') as term_end_date
    from policy_version where policy_id = ${policyId} and effective_to is null
    order by version_number desc limit 1`
  return fila
}

/** Cambia un campo de la póliza. Salvo el número, los datos son de la versión abierta. */
export const updatePolicyField = async (
  sql: QueryExecutor,
  policyId: string,
  field: PolicyField,
  raw: string,
): Promise<EditResult> => {
  const valor = raw.trim()
  if (field === 'numero') {
    if (valor === '' || valor.length > 60) return invalido('El número de póliza no puede quedar vacío.')
    const [poliza] = await sql<{ insurer_id: string }[]>`select insurer_id from policy where id = ${policyId}`
    if (poliza === undefined) return { kind: 'not_found' }
    const [otra] = await sql<{ id: string }[]>`
      select id from policy where insurer_id = ${poliza.insurer_id} and policy_number = ${valor} and id <> ${policyId}`
    if (otra !== undefined) return invalido('Ya hay otra póliza de esa compañía con ese número.')
    await sql`update policy set policy_number = ${valor} where id = ${policyId}`
    return { kind: 'ok' }
  }
  if (field === 'drive') {
    const url = cleanDriveFileUrl(valor)
    if (url === undefined) return invalido(DRIVE_INVALIDO)
    const filas = await sql`update policy set drive_url = ${url} where id = ${policyId} returning id`
    if (filas.length === 0) return { kind: 'not_found' }
    await sql`
      insert into audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
      values (authz.usuario(), 'app', 'policy.update_drive', 'policy', ${policyId}, 'ok')`
    return { kind: 'ok' }
  }

  const version = await openVersion(sql, policyId)
  if (version === undefined) return { kind: 'not_found' }

  if (field === 'inicio' || field === 'fin') {
    if (!isDate(valor)) return invalido('La fecha no es válida.')
    const inicio = field === 'inicio' ? valor : version.term_start_date
    const fin = field === 'fin' ? valor : version.term_end_date
    if (fin <= inicio) return invalido('El fin de vigencia tiene que ser posterior al inicio.')
    await sql`update policy_version set term_start_date = ${inicio}::date, term_end_date = ${fin}::date where id = ${version.id}`
    return { kind: 'ok' }
  }
  if (field === 'renovacion') {
    if (valor !== 'AUTOMATIC' && valor !== 'MANUAL') return invalido('La renovación es automática o manual.')
    await sql`update policy_version set renewal_mode = ${valor} where id = ${version.id}`
    return { kind: 'ok' }
  }
  const importe = COLUMNA_DE_IMPORTE[field]
  if (importe !== undefined) {
    const numero = parseAmount(valor)
    if (numero === undefined) return invalido('Escribí un importe, por ejemplo 125.000,50.')
    await sql`update policy_version set ${sql(importe)} = ${numero}::numeric where id = ${version.id}`
    return { kind: 'ok' }
  }
  const texto = COLUMNA_DE_TEXTO[field]
  if (texto === undefined) return invalido('Ese campo no se edita.')
  if (valor.length > 120) return invalido('El texto es demasiado largo.')
  await sql`update policy_version set ${sql(texto)} = ${valor === '' ? null : valor} where id = ${version.id}`
  return { kind: 'ok' }
}

// ── Alta de póliza: renovación y refacturación ───────────────────────────────

/** Los campos del alta de una póliza, tal como los carga el equipo. */
export interface PolicyTerms {
  readonly termStartDate: string
  readonly termEndDate: string
  readonly premium: string
  readonly totalPremium: string
  readonly sumInsured: string
  readonly currency: string
  readonly producer: string
  readonly riskType: string
  readonly paymentMethod: string
  readonly renewalMode: string
  /** La URL del documento en Drive. Vacío o ausente: sin enlace. */
  readonly driveUrl?: string
}

interface CleanTerms {
  readonly termStartDate: string
  readonly termEndDate: string
  readonly premium: string | null
  readonly totalPremium: string | null
  readonly sumInsured: string | null
  readonly currency: string | null
  readonly producer: string | null
  readonly riskType: string | null
  readonly paymentMethod: string | null
  readonly renewalMode: 'AUTOMATIC' | 'MANUAL'
}

const opcional = (valor: string): string | null => (valor.trim() === '' ? null : valor.trim().slice(0, 120))

const cleanTerms = (t: PolicyTerms): CleanTerms | string => {
  if (!isDate(t.termStartDate) || !isDate(t.termEndDate)) return 'Completá inicio y fin de vigencia.'
  if (t.termEndDate <= t.termStartDate) return 'El fin de vigencia tiene que ser posterior al inicio.'
  const premium = parseAmount(t.premium)
  const totalPremium = parseAmount(t.totalPremium)
  const sumInsured = parseAmount(t.sumInsured)
  if (premium === undefined || totalPremium === undefined || sumInsured === undefined)
    return 'Prima, premio y suma asegurada van como importe, por ejemplo 125.000,50.'
  return {
    termStartDate: t.termStartDate,
    termEndDate: t.termEndDate,
    premium,
    totalPremium,
    sumInsured,
    currency: opcional(t.currency),
    producer: opcional(t.producer),
    riskType: opcional(t.riskType),
    paymentMethod: opcional(t.paymentMethod),
    renewalMode: t.renewalMode === 'AUTOMATIC' ? 'AUTOMATIC' : 'MANUAL',
  }
}

export interface RenewalInput extends PolicyTerms {
  readonly previousPolicyId: string
  readonly policyNumber: string
  readonly insurerId: string
}

export type RenewResult =
  | { readonly kind: 'ok'; readonly policyId: string }
  | { readonly kind: 'invalid'; readonly message: string }
  | { readonly kind: 'not_found' }

/**
 * Crea la póliza que renueva a otra: la nueva queda Vigente y vinculada a la anterior
 * («Renueva a»), y la anterior pasa a Renovada. Las tres escrituras van en la transacción
 * de quien llama: si una falla, no queda ninguna. El número identifica a la póliza junto
 * con la compañía, porque dos compañías pueden usar el mismo número.
 */
export const renewPolicy = async (sql: QueryExecutor, input: RenewalInput): Promise<RenewResult> => {
  const numero = input.policyNumber.trim()
  if (numero === '' || numero.length > 60) return { kind: 'invalid', message: 'Falta el número de la nueva póliza.' }
  const terms = cleanTerms(input)
  if (typeof terms === 'string') return { kind: 'invalid', message: terms }
  const drive = cleanDriveFileUrl(input.driveUrl)
  if (drive === undefined) return { kind: 'invalid', message: DRIVE_INVALIDO }

  const [anterior] = await sql<{ id: string; policy_number: string }[]>`
    select id, policy_number from policy where id = ${input.previousPolicyId} for update`
  if (anterior === undefined) return { kind: 'not_found' }
  const [sucesora] = await sql<{ policy_number: string }[]>`
    select policy_number from policy where renewed_from_policy_id = ${anterior.id} limit 1`
  if (sucesora !== undefined)
    return { kind: 'invalid', message: `Esta póliza ya está renovada por la ${sucesora.policy_number}.` }
  const [version] = await sql<{ id: string; holder_party_id: string }[]>`
    select id, holder_party_id from policy_version
    where policy_id = ${anterior.id} and effective_to is null
    order by version_number desc limit 1`
  if (version === undefined) return { kind: 'invalid', message: 'La póliza anterior no tiene una versión abierta.' }
  const [compania] = await sql<{ id: string }[]>`select id from insurer where id = ${input.insurerId}`
  if (compania === undefined) return { kind: 'invalid', message: 'Elegí la compañía.' }

  const [creada] = await sql<{ id: string }[]>`
    insert into policy (insurer_id, policy_number, renewed_from_policy_id, drive_url)
    values (${compania.id}, ${numero}, ${anterior.id}, ${drive})
    on conflict (insurer_id, policy_number) do nothing
    returning id`
  if (creada === undefined)
    return { kind: 'invalid', message: `Ya existe la póliza ${numero} en esa compañía. Revisá el número.` }

  await sql`
    insert into policy_version (
      policy_id, version_number, effective_from, effective_to, holder_party_id, product_reference,
      term_start_date, term_end_date, renewal_mode, premium, currency, status,
      producer, total_premium, sum_insured, payment_method, source_event_type, source_event_id
    ) values (
      ${creada.id}, 1, ${terms.termStartDate}::date, null, ${version.holder_party_id}, ${terms.riskType},
      ${terms.termStartDate}::date, ${terms.termEndDate}::date, ${terms.renewalMode}, ${terms.premium}::numeric,
      ${terms.currency}, ${POLICY_STATUS.vigente}, ${terms.producer}, ${terms.totalPremium}::numeric,
      ${terms.sumInsured}::numeric, ${terms.paymentMethod}, 'BrokerOS.renovacion', ${anterior.id}
    )`
  await sql`update policy_version set status = ${POLICY_STATUS.renovada} where id = ${version.id}`
  await sql`
    insert into audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
    values (authz.usuario(), 'app', 'policy.renew', 'policy', ${creada.id}, 'ok')`
  return { kind: 'ok', policyId: creada.id }
}

/** El número de endoso que sigue en esa póliza: el mayor número entero registrado, más uno. */
export const nextEndorsementNumber = async (sql: QueryExecutor, policyId: string): Promise<number> => {
  const [fila] = await sql<{ ultimo: number | null }[]>`
    select max(number::int) as ultimo from endorsement where policy_id = ${policyId} and number ~ '^[0-9]{1,9}$'`
  return (fila?.ultimo ?? 0) + 1
}

export interface RebillingInput extends PolicyTerms {
  readonly policyId: string
  /** Desde cuándo rige la refacturación. Cierra la versión anterior ese día. */
  readonly effectiveFrom: string
  /**
   * El número del endoso. Se propone el siguiente, pero la persona puede cambiarlo y dejar
   * huecos: los próximos siguen desde el mayor. Si ya está usado en la póliza, no se guarda.
   */
  readonly endorsementNumber: number
}

export type RebillingResult =
  | { readonly kind: 'ok'; readonly endorsementNumber: number }
  | { readonly kind: 'invalid'; readonly message: string }
  | { readonly kind: 'taken'; readonly next: number }
  | { readonly kind: 'not_found' }

const MAYOR_NUMERO_DE_ENDOSO = 999_999_999

const numeroDeEndosoValido = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= MAYOR_NUMERO_DE_ENDOSO

/** Si otro endoso de la póliza ya usa ese número, importado o registrado en Broker OS. */
const numeroDeEndosoUsado = async (sql: QueryExecutor, policyId: string, numero: number, salvo: string | null): Promise<boolean> => {
  const [fila] = await sql`
    select 1 from endorsement
    where policy_id = ${policyId} and (${salvo}::uuid is null or id <> ${salvo}::uuid)
      and case when btrim(number) ~ '^[0-9]{1,9}$' then btrim(number)::int end = ${numero}
    limit 1`
  return fila !== undefined
}

/**
 * Registra un endoso de refacturación como una nueva versión de la misma póliza. La
 * versión anterior se cierra el día en que rige el endoso y queda en el historial. El
 * bloqueo de la póliza ordena a dos personas que guardan a la vez: la segunda ve que el
 * número ya se usó y recibe el siguiente.
 */
export const registerRebilling = async (sql: QueryExecutor, input: RebillingInput): Promise<RebillingResult> => {
  const terms = cleanTerms(input)
  if (typeof terms === 'string') return { kind: 'invalid', message: terms }
  if (!isDate(input.effectiveFrom)) return { kind: 'invalid', message: 'Falta la fecha desde la que rige el endoso.' }
  if (!numeroDeEndosoValido(input.endorsementNumber))
    return { kind: 'invalid', message: 'El número de endoso es un entero mayor que cero.' }
  const drive = cleanDriveFileUrl(input.driveUrl)
  if (drive === undefined) return { kind: 'invalid', message: DRIVE_INVALIDO }

  const [poliza] = await sql<{ id: string }[]>`select id from policy where id = ${input.policyId} for update`
  if (poliza === undefined) return { kind: 'not_found' }
  const numero = input.endorsementNumber
  if (await numeroDeEndosoUsado(sql, poliza.id, numero, null))
    return { kind: 'taken', next: await nextEndorsementNumber(sql, poliza.id) }

  const [anterior] = await sql<{ id: string; version_number: number; effective_from: string; holder_party_id: string; status: string | null }[]>`
    select id, version_number, to_char(effective_from, 'YYYY-MM-DD') as effective_from, holder_party_id, status
    from policy_version where policy_id = ${poliza.id} and effective_to is null
    order by version_number desc limit 1`
  if (anterior === undefined) return { kind: 'invalid', message: 'La póliza no tiene una versión abierta para refacturar.' }
  if (input.effectiveFrom <= anterior.effective_from)
    return { kind: 'invalid', message: 'El endoso tiene que regir después del inicio de la versión actual.' }

  const [maximo] = await sql<{ n: number }[]>`select max(version_number) as n from policy_version where policy_id = ${poliza.id}`
  const [endoso] = await sql<{ id: string }[]>`
    insert into endorsement (policy_id, number, kind, effective_from, source_reference, drive_url)
    values (
      ${poliza.id}, ${String(numero)}, 'REFACTURACION', ${input.effectiveFrom}::date, ${`broker-os:${crypto.randomUUID()}`}, ${drive}
    )
    returning id`
  if (endoso === undefined) throw new Error('el endoso no se guardó')
  await sql`update policy_version set effective_to = ${input.effectiveFrom}::date where id = ${anterior.id}`
  await sql`
    insert into policy_version (
      policy_id, version_number, effective_from, effective_to, holder_party_id, product_reference,
      term_start_date, term_end_date, renewal_mode, premium, currency, status, endorsement_id,
      producer, total_premium, sum_insured, payment_method, source_event_type, source_event_id
    ) values (
      ${poliza.id}, ${(maximo?.n ?? anterior.version_number) + 1}, ${input.effectiveFrom}::date, null,
      ${anterior.holder_party_id}, ${terms.riskType}, ${terms.termStartDate}::date, ${terms.termEndDate}::date,
      ${terms.renewalMode}, ${terms.premium}::numeric, ${terms.currency}, ${anterior.status}, ${endoso.id},
      ${terms.producer}, ${terms.totalPremium}::numeric, ${terms.sumInsured}::numeric, ${terms.paymentMethod},
      'BrokerOS.refacturacion', ${endoso.id}
    )`
  await sql`
    insert into audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
    values (authz.usuario(), 'app', 'policy.rebill', 'policy', ${poliza.id}, 'ok')`
  return { kind: 'ok', endorsementNumber: numero }
}

export interface EndorsementEdit {
  readonly policyId: string
  readonly endorsementId: string
  /** El número como lo escribe la persona. Si no cambió, se acepta aunque no sea un entero (vino de Zoho). */
  readonly number: string
  readonly driveUrl: string
  /** Las condiciones de la versión que originó el endoso. Sólo si esa versión sigue abierta. */
  readonly terms?: PolicyTerms
}

/**
 * Corrige un endoso desde la ficha de la póliza: número y enlace de Drive siempre; las
 * condiciones de su versión, sólo si sigue abierta, porque las cerradas son historia
 * (INV-PV-005). Cambiar el número deja huecos: el próximo sigue desde el mayor.
 */
export const updateEndorsement = async (sql: QueryExecutor, input: EndorsementEdit): Promise<EditResult> => {
  const [endoso] = await sql<{ id: string; number: string | null }[]>`
    select id, number from endorsement where id = ${input.endorsementId} and policy_id = ${input.policyId} for update`
  if (endoso === undefined) return { kind: 'not_found' }

  // Primero se valida todo y después se escribe: un rechazo no deja cambios a medias.
  const numero = input.number.trim()
  const cambiaNumero = numero !== (endoso.number ?? '').trim()
  if (cambiaNumero) {
    if (!/^\d{1,9}$/.test(numero) || !numeroDeEndosoValido(Number(numero)))
      return invalido('El número de endoso es un entero mayor que cero.')
    if (await numeroDeEndosoUsado(sql, input.policyId, Number(numero), endoso.id))
      return invalido(`El endoso ${String(Number(numero))} ya está registrado en esta póliza.`)
  }
  const drive = cleanDriveFileUrl(input.driveUrl)
  if (drive === undefined) return invalido(DRIVE_INVALIDO)
  let condiciones: { readonly version: string; readonly terms: CleanTerms } | null = null
  if (input.terms !== undefined) {
    const terms = cleanTerms(input.terms)
    if (typeof terms === 'string') return invalido(terms)
    const [version] = await sql<{ id: string }[]>`
      select id from policy_version where endorsement_id = ${endoso.id} and policy_id = ${input.policyId} and effective_to is null`
    if (version === undefined) return invalido('La versión de este endoso ya está cerrada: sus condiciones no se editan.')
    condiciones = { version: version.id, terms }
  }

  await sql`
    update endorsement set number = ${cambiaNumero ? String(Number(numero)) : endoso.number}, drive_url = ${drive}
    where id = ${endoso.id}`
  if (condiciones !== null) {
    const t = condiciones.terms
    await sql`
      update policy_version set
        term_start_date = ${t.termStartDate}::date, term_end_date = ${t.termEndDate}::date,
        premium = ${t.premium}::numeric, total_premium = ${t.totalPremium}::numeric,
        sum_insured = ${t.sumInsured}::numeric, currency = ${t.currency}, producer = ${t.producer},
        product_reference = ${t.riskType}, payment_method = ${t.paymentMethod}, renewal_mode = ${t.renewalMode}
      where id = ${condiciones.version}`
  }
  await sql`
    insert into audit_event (actor_user_id, origin, action, object_type, object_id, outcome)
    values (authz.usuario(), 'app', 'policy.update_endorsement', 'policy', ${input.policyId}, 'ok')`
  return { kind: 'ok' }
}

export type DeleteBlocker = 'POLIZAS' | 'GESTIONES' | 'TAREAS'

/** Borra la póliza para siempre. Devuelve lo que lo impide; vacío si la borró. */
export const deletePolicy = async (sql: QueryExecutor, policyId: string): Promise<DeleteBlocker[]> => {
  const [fila] = await sql<{ bloqueos: DeleteBlocker[] }[]>`select public.eliminar_poliza(${policyId}::uuid) as bloqueos`
  return fila?.bloqueos ?? []
}
