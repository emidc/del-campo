// Lote sintético de VS01 para desarrollo y para el despliegue inicial autorizado.
//
// R-19: los agentes de desarrollo trabajan con fixtures sintéticas. La excepción D-0053
// es del importador de T-0013 y **no se extiende a T-0018**: nada de lo que este script
// escribe sale de datos reales, y el script se niega a correr contra la base de T-0013.
//
// Cubre los cinco estados que el recorrido tiene que saber mostrar:
//   A · documento de la póliza con asociación revisada   → "Abrir documento"
//   B · homónima de A, sin ninguna referencia            → ambigüedad + ausencia
//   C · sólo carpeta del cliente, con pendiente          → "Abrir carpeta del cliente"
//   D · pendiente inaccesible, sin carpeta ni archivo    → pendiente sin enlace
//   E · renovación de A, con endoso en el historial      → historial y navegación
//
// Uso: node scripts/vs01/seed-sintetico.mjs [--reset]

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import postgres from 'postgres'

const root = fileURLToPath(new URL('../../', import.meta.url))

const leerEnv = () => {
  const archivo = join(root, '.env')
  if (!existsSync(archivo)) return {}
  const pares = {}
  for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#')) continue
    const corte = limpia.indexOf('=')
    if (corte === -1) continue
    pares[limpia.slice(0, corte).trim()] = limpia.slice(corte + 1).trim()
  }
  return pares
}

const url = process.env.DATABASE_URL ?? leerEnv().DATABASE_URL
if (!url) {
  console.error('falta DATABASE_URL. Ver docs/desarrollo/postgres-local.md')
  process.exit(1)
}

const nombreBase = new URL(url).pathname.replace(/^\//, '')

// Dos guardas, no una. La primera nombra la base prohibida; la segunda exige que el
// nombre declare que es sintética. Juntas, escribir en una base con datos reales exige
// haberla renombrado a propósito.
if (nombreBase.includes('t0013')) {
  console.error(
    `✗ ${nombreBase} es la base del importador de T-0013, con datos reales de clientes.\n` +
      '  La excepción de D-0053 no alcanza a T-0018 (R-19). Usá una base sintética.',
  )
  process.exit(1)
}
if (!/sintetic|synthetic|demo/i.test(nombreBase)) {
  console.error(
    `✗ ${nombreBase} no se declara sintética en su nombre.\n` +
      '  Renombrala (p. ej. delcampo_t0018_sintetico) antes de sembrarla.',
  )
  process.exit(1)
}

const sql = postgres(url, { max: 2 })
const reset = process.argv.includes('--reset')

const HOY = new Date().toISOString().slice(0, 10)
const DRIVE = 'https://drive.google.com'

const uno = (filas) => filas[0]

const crearPersona = async (tx, nombre, apellido, dni) => {
  const party = uno(await tx`insert into party (kind, display_name_cache)
    values ('PERSON', ${`${nombre} ${apellido}`}) returning id`)
  await tx`insert into person_profile (party_id, first_name, last_name, dni)
    values (${party.id}, ${nombre}, ${apellido}, ${dni})`
  return party.id
}

const crearOrganizacion = async (tx, razonSocial, cuit) => {
  const party = uno(await tx`insert into party (kind, display_name_cache)
    values ('ORGANIZATION', ${razonSocial}) returning id`)
  await tx`insert into organization_profile (party_id, legal_name, cuit)
    values (${party.id}, ${razonSocial}, ${cuit})`
  return party.id
}

const crearAseguradora = async (tx, nombre) => {
  const party = await crearOrganizacion(tx, nombre, null)
  const insurer = uno(await tx`insert into insurer (organization_party_id, canonical_name)
    values (${party}, ${nombre}) returning id`)
  return insurer.id
}

const crearPoliza = async (tx, { insurerId, numero, tomador, renovadaDe = null, endoso = null }) => {
  const policy = uno(await tx`insert into policy (insurer_id, policy_number, renewed_from_policy_id)
    values (${insurerId}, ${numero}, ${renovadaDe}) returning id`)

  let endorsementId = null
  if (endoso !== null) {
    const fila = uno(await tx`insert into endorsement (policy_id, number, kind, effective_from, source_reference)
      values (${policy.id}, ${endoso.numero}, ${endoso.tipo}, ${endoso.desde}, 'seed-sintetico')
      returning id`)
    endorsementId = fila.id
  }

  await tx`insert into policy_version (
      policy_id, version_number, effective_from, effective_to, holder_party_id,
      product_reference, term_start_date, term_end_date, renewal_mode, premium, currency,
      status, endorsement_id, source_event_type
    ) values (
      ${policy.id}, 1, '2026-01-01', null, ${tomador},
      'Automotores — sintético', '2026-01-01', '2026-12-31', 'MANUAL', 185000, 'ARS',
      'VIGENTE', ${endorsementId}, 'SEED'
    )`
  return policy.id
}

/** Referencia documental de la Policy, resuelta contra un archivo de Drive. */
const vincularDocumento = async (tx, policyId, nombreArchivo) => {
  const link = uno(await tx`insert into document_link (
      resource_type, resource_id, drive_file_id, drive_url, drive_item_type,
      document_kind, reconciliation_status, last_seen_at
    ) values (
      'POLICY', ${policyId}, ${`sintetico-${nombreArchivo}`},
      ${`${DRIVE}/file/d/sintetico-${nombreArchivo}/view`}, 'FILE',
      'POLIZA', 'SYNCED', now()
    ) returning id`)

  const referencia = uno(await tx`insert into external_reference (
      source_system, source_entity_type, source_external_id, source_value, relation_type,
      resolution_status, resolved_target_type, resolved_target_id
    ) values (
      'ZOHO', 'Notes', ${`nota-${nombreArchivo}`}, ${`${DRIVE}/file/d/sintetico-${nombreArchivo}/view`},
      'POLICY_DOCUMENT', 'RESOLVED', 'DOCUMENT_LINK', ${link.id}
    ) returning id`)

  await tx`insert into policy_document_reference (external_reference_id, policy_id)
    values (${referencia.id}, ${policyId})`
}

/** Carpeta del cliente: se vincula al Party, no a la Policy. Varias pólizas la comparten. */
const vincularCarpetaDelCliente = async (tx, partyId, slug) => {
  await tx`insert into document_link (
      resource_type, resource_id, drive_file_id, drive_url, drive_item_type,
      document_kind, reconciliation_status, last_seen_at
    ) values (
      'PARTY', ${partyId}, ${`sintetico-carpeta-${slug}`},
      ${`${DRIVE}/drive/folders/sintetico-carpeta-${slug}`}, 'FOLDER',
      null, 'SYNCED', now()
    )`
}

/** Pendiente documental: la referencia existe en el origen y no se pudo resolver. */
const dejarPendiente = async (tx, policyId, motivo) => {
  const referencia = uno(await tx`insert into external_reference (
      source_system, source_entity_type, source_external_id, source_value, relation_type,
      resolution_status, unresolved_reason
    ) values (
      'ZOHO', 'Notes', ${`nota-pendiente-${motivo.toLowerCase()}`},
      'texto de nota sin enlace utilizable', 'POLICY_DOCUMENT', 'UNRESOLVED', ${motivo}
    ) returning id`)
  await tx`insert into policy_document_reference (external_reference_id, policy_id)
    values (${referencia.id}, ${policyId})`
}

const limpiar = async (tx) => {
  await tx`delete from policy_document_reference`
  await tx`delete from external_reference`
  await tx`delete from document_link`
  await tx`delete from policy_version`
  await tx`delete from endorsement`
  await tx`delete from policy`
  await tx`delete from insurer`
  await tx`delete from organization_membership`
  await tx`delete from contact_point`
  await tx`delete from person_profile`
  await tx`delete from organization_profile`
  await tx`delete from party`
  await tx`delete from staging_import_batch`
}

try {
  await sql.begin(async (tx) => {
    const yaHay = uno(await tx`select count(*)::int as n from policy`)
    if (yaHay.n > 0 && !reset) {
      throw new Error(
        `la base ya tiene ${yaHay.n} póliza(s). Volvé a correr con --reset para reemplazarlas.`,
      )
    }
    if (reset) await limpiar(tx)

    // El lote que la app informa en pantalla. Que diga "SINTÉTICO" es parte del punto:
    // nadie debe poder confundir este despliegue con datos de la correduría.
    await tx`insert into staging_import_batch (started_at, source_manifest_sha256, notes)
      values (now(), ${'0'.repeat(64)}, 'LOTE SINTÉTICO — sin datos de clientes')`

    const norte = await crearAseguradora(tx, 'Aseguradora Sintética Norte')
    const sur = await crearAseguradora(tx, 'Aseguradora Sintética Sur')

    // Dos homónimas con DNI distinto: así la búsqueda por nombre y apellido produce
    // candidatos ambiguos de verdad, que es el estado que §2 exige no presentar como
    // coincidencia inequívoca.
    const anaUno = await crearPersona(tx, 'Ana', 'Ejemplo', '30111222')
    const anaDos = await crearPersona(tx, 'Ana', 'Ejemplo', '30999888')
    const empresa = await crearOrganizacion(tx, 'Comercio Sintético SRL', '30711111114')

    await tx`insert into organization_membership (
        organization_party_id, person_party_id, kind, role_or_position, is_primary
      ) values (${empresa}, ${anaUno}, 'CONTACTO', 'Titular', true)`

    const polizaA = await crearPoliza(tx, {
      insurerId: norte, numero: 'SINT-A-1001', tomador: anaUno,
    })
    await vincularDocumento(tx, polizaA, 'poliza-a-1001')

    const polizaB = await crearPoliza(tx, {
      insurerId: sur, numero: 'SINT-B-2002', tomador: anaDos,
    })
    // B queda deliberadamente sin ninguna referencia: la póliza igual se muestra.
    void polizaB

    const polizaC = await crearPoliza(tx, {
      insurerId: norte, numero: 'SINT-C-3003', tomador: empresa,
    })
    await vincularCarpetaDelCliente(tx, empresa, 'comercio-sintetico')
    await dejarPendiente(tx, polizaC, 'AMBIGUOUS')

    const polizaD = await crearPoliza(tx, {
      insurerId: sur, numero: 'SINT-D-4004', tomador: anaUno,
    })
    await dejarPendiente(tx, polizaD, 'INACCESSIBLE')

    await crearPoliza(tx, {
      insurerId: norte, numero: 'SINT-E-5005', tomador: anaUno, renovadaDe: polizaA,
      endoso: { numero: 'E-1', tipo: 'CAMBIO_DE_VEHICULO', desde: '2026-06-01' },
    })
  })

  const resumen = await sql`
    select (select count(*) from policy) as polizas,
           (select count(*) from party) as partes,
           (select count(*) from document_link where drive_item_type = 'FILE') as archivos,
           (select count(*) from document_link where drive_item_type = 'FOLDER') as carpetas,
           (select count(*) from external_reference where resolution_status = 'UNRESOLVED') as pendientes
  `
  const r = resumen[0]
  console.log(`✓ Lote sintético sembrado en ${nombreBase} (${HOY})`)
  console.log(
    `  ${r.polizas} pólizas · ${r.partes} partes · ${r.archivos} archivo(s) · ` +
      `${r.carpetas} carpeta(s) · ${r.pendientes} pendiente(s)`,
  )
  console.log('  Ninguno de estos datos proviene de un cliente real (R-19).')
} catch (error) {
  console.error(`✗ ${error.message}`)
  process.exitCode = 1
} finally {
  await sql.end()
}
