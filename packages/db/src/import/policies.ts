// T-0013, paso 6 — Polizas → Policy/PolicyVersion, Endosos → Endorsement, cadena de
// renovación. Aplica la taxonomía de failure-classes.ts fila por fila, en el orden en
// que cada clase puede determinarse (scope antes que aseguradora, aseguradora antes que
// tomador, etc.): una fila se clasifica por el primer motivo real que la excluye, nunca
// por el más fácil de calcular.
//
// Una PolicyVersion por Policy en scope, construida desde la fila de Polizas. Los
// Endosos vinculados se importan como `Endorsement` (historia/linaje) y NINGUNO deriva
// una PolicyVersion adicional — esto es cumplimiento de DOMAIN.md §36, no un recorte:
// "qué tipos producen una nueva PolicyVersion se determina mediante una tabla curada
// explícita; el importador no lo infiere" (§36, D-0037). Esa tabla curada no existe
// todavía; construirla es trabajo de una tarea futura, no de ésta. Inferir la
// correspondencia acá —aunque fuera con una heurística razonable— sería exactamente lo
// que §36 prohíbe. Detalle en `ops/evidence/T-0013.md`.

import type { MapaAseguradoras } from './catalog.ts'
import type { Ejecutor } from './db.ts'
import { CAMPOS_ENDOSO, CAMPOS_POLIZA } from './zoho-fields.ts'
import type { ClaseDeFallo } from './failure-classes.ts'

const INICIO_SCOPE = '2026-01-01'
const FIN_SCOPE = '2026-09-16'

const FECHA = /^\d{4}-\d{2}-\d{2}$/

const vacioComoNulo = (valor: string | undefined): string | null =>
  valor === undefined || valor.trim() === '' ? null : valor.trim()

const fechaValida = (valor: string | null | undefined): valor is string =>
  valor !== null && valor !== undefined && FECHA.test(valor)

interface FilaPoliza {
  source_record_id: string
  contact_source_id: string | null
  account_source_id: string | null
  insurer_source_id: string | null
  raw: Record<string, string>
}

interface Excepcion {
  readonly clase: ClaseDeFallo
  readonly detailCode: string | null
}

const registrarExcepcion = async (
  sql: Ejecutor,
  batchId: string,
  sourceRecordId: string,
  excepcion: Excepcion,
): Promise<void> => {
  // Identidad (module, source_record_id, failure_class), no batch: correr el import dos
  // veces no debe duplicar la misma excepción ya conocida.
  await sql`
    insert into staging_import_exception (batch_id, module, source_record_id, failure_class, detail_code)
    values (${batchId}, 'Polizas', ${sourceRecordId}, ${excepcion.clase}, ${excepcion.detailCode})
    on conflict (module, source_record_id, failure_class) do nothing
  `
}

/** VIGENTE literal OR Vigencia Fin ∈ [2026-01-01, 2026-09-16]. Regla exacta de D-0031. */
const enScope = (fila: FilaPoliza): boolean => {
  if (fila.raw[CAMPOS_POLIZA.estado] === 'VIGENTE') return true
  const fin = fila.raw[CAMPOS_POLIZA.vigenciaFin]
  return fechaValida(fin) && fin >= INICIO_SCOPE && fin <= FIN_SCOPE
}

export interface ResultadoImportPolizas {
  readonly enScope: number
  readonly importadas: number
  readonly excepciones: Record<ClaseDeFallo, number>
}

export const importarPolizas = async (sql: Ejecutor, batchId: string, mapaAseguradoras: MapaAseguradoras): Promise<ResultadoImportPolizas> => {
  const filas = await sql<FilaPoliza[]>`
    select source_record_id, contact_source_id, account_source_id, insurer_source_id, raw
    from staging_policy
  `

  const excepciones: Record<ClaseDeFallo, number> = {
    NOT_IN_SCOPE: 0,
    MISSING_INSURER: 0,
    UNKNOWN_INSURER_STRING: 0,
    DUPLICATE_INSURER_NUMBER: 0,
    MISSING_HOLDER: 0,
    UNPARSEABLE_TERM_DATES: 0,
    OVERLAPPING_VERSION: 0,
    RENEWAL_UNRESOLVED: 0,
  }

  const dentroDeScope: FilaPoliza[] = []
  for (const fila of filas) {
    if (enScope(fila)) {
      dentroDeScope.push(fila)
      continue
    }
    excepciones.NOT_IN_SCOPE += 1
    await registrarExcepcion(sql, batchId, fila.source_record_id, { clase: 'NOT_IN_SCOPE', detailCode: null })
  }

  // DUPLICATE_INSURER_NUMBER se detecta ANTES de intentar ningún insert: agrupar por
  // (insurerId, policyNumber) entre las filas en scope con aseguradora resuelta.
  const clavePorFila = new Map<string, string>()
  const grupos = new Map<string, FilaPoliza[]>()
  for (const fila of dentroDeScope) {
    const insurerId = fila.insurer_source_id !== null ? mapaAseguradoras.get(fila.insurer_source_id) : undefined
    if (insurerId === undefined) continue
    const numero = fila.raw[CAMPOS_POLIZA.numeroDePoliza]?.trim()
    if (numero === undefined || numero === '') continue
    const clave = `${insurerId}::${numero}`
    clavePorFila.set(fila.source_record_id, clave)
    const grupo = grupos.get(clave) ?? []
    grupo.push(fila)
    grupos.set(clave, grupo)
  }
  const clavesDuplicadas = new Set(
    [...grupos.entries()].filter(([, filasDelGrupo]) => filasDelGrupo.length > 1).map(([clave]) => clave),
  )

  let importadas = 0

  for (const fila of dentroDeScope) {
    const insurerSourceId = fila.insurer_source_id
    if (insurerSourceId === null) {
      excepciones.MISSING_INSURER += 1
      await registrarExcepcion(sql, batchId, fila.source_record_id, { clase: 'MISSING_INSURER', detailCode: null })
      continue
    }
    const insurerId = mapaAseguradoras.get(insurerSourceId)
    if (insurerId === undefined) {
      excepciones.UNKNOWN_INSURER_STRING += 1
      await registrarExcepcion(sql, batchId, fila.source_record_id, {
        clase: 'UNKNOWN_INSURER_STRING',
        detailCode: fila.raw[CAMPOS_POLIZA.compania] ?? insurerSourceId,
      })
      continue
    }

    const clave = clavePorFila.get(fila.source_record_id)
    if (clave !== undefined && clavesDuplicadas.has(clave)) {
      excepciones.DUPLICATE_INSURER_NUMBER += 1
      await registrarExcepcion(sql, batchId, fila.source_record_id, {
        clase: 'DUPLICATE_INSURER_NUMBER',
        detailCode: clave,
      })
      continue
    }

    // D-0036: si hay Cuenta y Contacto, la Cuenta es el tomador; el Contacto queda
    // asociado vía OrganizationMembership (ya importada en parties.ts), sin rol
    // contractual propio.
    let holderPartyId: string | undefined
    if (fila.account_source_id !== null) {
      const [vinculo] = await sql<{ party_id: string }[]>`
        select party_id from party_source_link
        where source_system = 'Zoho' and source_entity_type = 'Cuentas' and source_record_id = ${fila.account_source_id}
      `
      holderPartyId = vinculo?.party_id
    }
    if (holderPartyId === undefined && fila.contact_source_id !== null) {
      const [vinculo] = await sql<{ party_id: string }[]>`
        select party_id from party_source_link
        where source_system = 'Zoho' and source_entity_type = 'Contactos' and source_record_id = ${fila.contact_source_id}
      `
      holderPartyId = vinculo?.party_id
    }
    if (holderPartyId === undefined) {
      excepciones.MISSING_HOLDER += 1
      await registrarExcepcion(sql, batchId, fila.source_record_id, { clase: 'MISSING_HOLDER', detailCode: null })
      continue
    }

    const termStart = fila.raw[CAMPOS_POLIZA.vigenciaInicio]
    const termEnd = fila.raw[CAMPOS_POLIZA.vigenciaFin]
    if (!fechaValida(termStart) || !fechaValida(termEnd)) {
      excepciones.UNPARSEABLE_TERM_DATES += 1
      await registrarExcepcion(sql, batchId, fila.source_record_id, {
        clase: 'UNPARSEABLE_TERM_DATES',
        detailCode: null,
      })
      continue
    }

    const numero = fila.raw[CAMPOS_POLIZA.numeroDePoliza]?.trim() ?? fila.source_record_id
    const [policy] = await sql<{ id: string }[]>`
      insert into policy (insurer_id, policy_number)
      values (${insurerId}, ${numero})
      on conflict (insurer_id, policy_number) do update set policy_number = excluded.policy_number
      returning id
    `
    if (policy === undefined) throw new Error('no se pudo crear policy')

    // `renewalMode` es una propiedad de PolicyVersion (§28), no derivable de Estado. Sólo
    // 'Automática' mapea a AUTOMATIC; cualquier otro valor observado (incluido ausente)
    // es MANUAL — el dominio no admite un tercer estado.
    const renewalMode = fila.raw[CAMPOS_POLIZA.tipoDeRenovacion] === 'Automática' ? 'AUTOMATIC' : 'MANUAL'
    const premium = vacioComoNulo(fila.raw[CAMPOS_POLIZA.prima])
    const moneda = vacioComoNulo(fila.raw[CAMPOS_POLIZA.moneda])
    const producto = vacioComoNulo(fila.raw[CAMPOS_POLIZA.riesgo])

    await sql`
      insert into policy_version (
        policy_id, version_number, effective_from, effective_to, holder_party_id,
        product_reference, term_start_date, term_end_date, renewal_mode, premium, currency,
        source_event_type, source_event_id
      ) values (
        ${policy.id}, 1, ${termStart}::date, null, ${holderPartyId},
        ${producto}, ${termStart}::date, ${termEnd}::date, ${renewalMode}, ${premium}, ${moneda},
        'Polizas', ${fila.source_record_id}
      )
      on conflict (policy_id, version_number) do nothing
    `

    importadas += 1
  }

  return { enScope: dentroDeScope.length, importadas, excepciones }
}

interface FilaEndoso {
  source_record_id: string
  policy_source_id: string | null
  raw: Record<string, string>
}

/**
 * Endosos → Endorsement, vinculados a su Policy vía `policy_version.source_event_id`
 * (el "ID de registro" de Polizas que originó la versión 1). Un Endoso cuya Policy padre
 * no está en scope no se importa (§66/D-0037: sin Policy padre, la fila del importador
 * nunca se intenta insertar). No produce PolicyVersion adicional — ver nota al inicio
 * del archivo.
 */
export const importarEndosos = async (sql: Ejecutor): Promise<{ importados: number; sinPolicyPadre: number }> => {
  const filas = await sql<FilaEndoso[]>`
    select source_record_id, policy_source_id, raw from staging_endorsement
  `
  let importados = 0
  let sinPolicyPadre = 0

  for (const fila of filas) {
    if (fila.policy_source_id === null) {
      sinPolicyPadre += 1
      continue
    }
    const [version] = await sql<{ policy_id: string }[]>`
      select policy_id from policy_version
      where source_event_type = 'Polizas' and source_event_id = ${fila.policy_source_id}
    `
    if (version === undefined) {
      sinPolicyPadre += 1
      continue
    }

    const inicio = fila.raw[CAMPOS_ENDOSO.inicioVigencia]
    const fin = fila.raw[CAMPOS_ENDOSO.finVigencia]

    await sql`
      insert into endorsement (policy_id, number, kind, effective_from, effective_to, source_reference)
      values (
        ${version.policy_id},
        ${vacioComoNulo(fila.raw[CAMPOS_ENDOSO.numeroDeEndoso])},
        ${vacioComoNulo(fila.raw[CAMPOS_ENDOSO.tipoEndoso]) ?? 'DESCONOCIDO'},
        ${fechaValida(inicio) ? inicio : null},
        ${fechaValida(fin) ? fin : null},
        ${fila.source_record_id}
      )
      on conflict (source_reference) do nothing
    `
    importados += 1
  }

  return { importados, sinPolicyPadre }
}

interface FilaRenovacion {
  source_record_id: string
  insurer_source_id: string | null
  raw: Record<string, string>
}

export interface ResultadoRenovacion {
  readonly resueltas: number
  readonly unresolved: number
}

/**
 * `renewedFromPolicyId` sólo cuando la predecesora existe como Policy dentro de Broker
 * OS (§32-33). La señal es el campo explícito de Zoho "Renovada de póliza n°", que ya
 * es la propia afirmación del origen sobre la continuidad — no una heurística derivada
 * de holder+aseguradora+fechas. Cuando el número no resuelve a ninguna Policy en scope,
 * la continuidad se conserva como ExternalReference UNRESOLVED, nunca se inventa.
 */
export const importarRenovaciones = async (sql: Ejecutor, batchId: string): Promise<ResultadoRenovacion> => {
  const filas = await sql<FilaRenovacion[]>`
    select sp.source_record_id, sp.insurer_source_id, sp.raw
    from staging_policy sp
    join policy_version pv on pv.source_event_type = 'Polizas' and pv.source_event_id = sp.source_record_id
    where coalesce(sp.raw ->> ${CAMPOS_POLIZA.renovadaDePolizaN}, '') <> ''
  `

  let resueltas = 0
  let unresolved = 0

  for (const fila of filas) {
    const numeroPredecesora = fila.raw[CAMPOS_POLIZA.renovadaDePolizaN]?.trim()
    if (numeroPredecesora === undefined || numeroPredecesora === '' || fila.insurer_source_id === null) {
      unresolved += 1
      await registrarExcepcion(sql, batchId, fila.source_record_id, {
        clase: 'RENEWAL_UNRESOLVED',
        detailCode: null,
      })
      continue
    }

    const [actual] = await sql<{ policy_id: string; insurer_id: string }[]>`
      select p.id as policy_id, p.insurer_id
      from policy_version pv
      join policy p on p.id = pv.policy_id
      where pv.source_event_type = 'Polizas' and pv.source_event_id = ${fila.source_record_id}
    `
    if (actual === undefined) {
      unresolved += 1
      await registrarExcepcion(sql, batchId, fila.source_record_id, {
        clase: 'RENEWAL_UNRESOLVED',
        detailCode: null,
      })
      continue
    }

    const [predecesora] = await sql<{ id: string }[]>`
      select id from policy where insurer_id = ${actual.insurer_id} and policy_number = ${numeroPredecesora}
    `

    if (predecesora === undefined) {
      unresolved += 1
      await registrarExcepcion(sql, batchId, fila.source_record_id, {
        clase: 'RENEWAL_UNRESOLVED',
        detailCode: numeroPredecesora,
      })
      await sql`
        insert into external_reference (
          source_system, source_entity_type, source_external_id, source_value,
          relation_type, resolution_status, unresolved_reason
        ) values (
          'Zoho', 'Polizas', ${numeroPredecesora}, ${numeroPredecesora},
          'POLICY_RENEWAL', 'UNRESOLVED', 'predecesora fuera de scope o no importada'
        )
        on conflict (source_system, source_entity_type, source_external_id, relation_type) do nothing
      `
      continue
    }

    if (predecesora.id === actual.policy_id) {
      unresolved += 1
      await registrarExcepcion(sql, batchId, fila.source_record_id, {
        clase: 'RENEWAL_UNRESOLVED',
        detailCode: 'self-reference',
      })
      continue
    }

    await sql`
      update policy set renewed_from_policy_id = ${predecesora.id} where id = ${actual.policy_id}
    `
    resueltas += 1
  }

  return { resueltas, unresolved }
}
