// T-0013 — un solo entrypoint para el importador. Cada comando es un paso separado y
// deliberadamente secuencial: `run` no arranca si `verify-manifest` no corrió antes con
// éxito en la misma invocación humana (el operador lo hace a mano, paso a paso — ver
// TASKS/T-0013-importador-una-pasada-desde-zoho.md, Verification).
//
// Toda la salida de este CLI es agregada: conteos, nombres de archivo, `failure_class`.
// Nunca una fila de staging ni un valor de columna del lote. → D-0053

import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { importarCatalogoAseguradoras, RUTA_CATALOGO_APROBADO } from './catalog.ts'
import { conectar } from './db.ts'
import { importarContactos, importarCuentas, importarMembresias } from './parties.ts'
import { importarEndosos, importarPolizas, importarRenovaciones } from './policies.ts'
import { generarReporte } from './report.ts'
import { cargarContactos, cargarCuentas, cargarEndosos, cargarPolizas } from './staging.ts'
import { calcularFingerprint, compararFingerprints } from './verify-idempotency.ts'
import type { FingerprintPorTabla } from './verify-idempotency.ts'
import { parsearManifiesto, verificarLote } from './verify-manifest.ts'

const RAIZ = resolve(import.meta.dirname, '..', '..', '..', '..')
const DIRECTORIO_LOTE = resolve(RAIZ, 'data', 'zoho-export-2026-09-16')
const MANIFIESTO = resolve(
  DIRECTORIO_LOTE,
  'profile',
  'profile-20260918T212140075873Z.json',
)

const morir = (mensaje: string): never => {
  process.stderr.write(`✗ ${mensaje}\n`)
  process.exit(1)
}

const verificarManifiesto = async (): Promise<void> => {
  const manifiesto = parsearManifiesto(readFileSync(MANIFIESTO, 'utf8'))

  let total = 0
  let mismatches = 0
  for await (const resultado of verificarLote(manifiesto, DIRECTORIO_LOTE)) {
    total += 1
    if (!resultado.coincide) {
      mismatches += 1
      process.stderr.write(`✗ MISMATCH ${resultado.archivo}\n`)
    }
  }

  if (mismatches > 0) {
    morir(
      `${String(mismatches)} de ${String(total)} archivo(s) no coinciden con el manifiesto. ` +
        'No se continúa: el lote no es el declarado por T-0004.',
    )
  }

  process.stdout.write(`✓ manifiesto verificado: ${String(total)} archivo(s), 0 mismatches\n`)
}

const RUTAS_MODULO = {
  polizas: resolve(
    DIRECTORIO_LOTE,
    'raw',
    '025738fc637310e0d368afd49868375c1cce73c263cadf9821055d59dd47bc80',
    '0001.csv',
  ),
  endosos: resolve(
    DIRECTORIO_LOTE,
    'raw',
    '8ca87d205690ef89676c3a21d365d507335fcfe52ccd78206efeba28d971ca2c',
    '0001.csv',
  ),
  contactos: resolve(
    DIRECTORIO_LOTE,
    'raw',
    'fef574c156c24cd58a242fe77322b69386977b3c59522969397941732dae5501',
    '0001.csv',
  ),
  cuentas: resolve(
    DIRECTORIO_LOTE,
    'raw',
    'e2c4246d5b98ca59ecc01dac6375f73212a0c308d00b8c7c8e5920054993011e',
    '0001.csv',
  ),
} as const

const cargarStaging = async (): Promise<void> => {
  const sql = conectar()
  try {
    const [batch] = await sql<{ id: string }[]>`
      insert into staging_import_batch (source_manifest_sha256, notes)
      values (${'profile-20260918T212140075873Z.json'}, ${'T-0013 cli run'})
      returning id
    `
    if (batch === undefined) throw new Error('no se pudo crear staging_import_batch')

    const conteoPolizas = await cargarPolizas(sql, batch.id, RUTAS_MODULO.polizas)
    const conteoEndosos = await cargarEndosos(sql, batch.id, RUTAS_MODULO.endosos)
    const conteoContactos = await cargarContactos(sql, batch.id, RUTAS_MODULO.contactos)
    const conteoCuentas = await cargarCuentas(sql, batch.id, RUTAS_MODULO.cuentas)

    process.stdout.write(
      `✓ staging cargado (batch ${batch.id}): ` +
        `${String(conteoPolizas)} Polizas, ${String(conteoEndosos)} Endosos, ` +
        `${String(conteoContactos)} Contactos, ${String(conteoCuentas)} Cuentas\n`,
    )
  } finally {
    await sql.end()
  }
}

const importarCatalogo = async (): Promise<void> => {
  const sql = conectar()
  try {
    const mapa = await importarCatalogoAseguradoras(sql, RUTA_CATALOGO_APROBADO(RAIZ))
    const filas = await sql<{ n: number }[]>`select count(*)::int as n from insurer`
    const n = filas[0]?.n ?? 0
    process.stdout.write(`✓ catálogo de aseguradoras: ${String(mapa.size)} source_id mapeados, ${String(n)} Insurer en base\n`)
  } finally {
    await sql.end()
  }
}

const importarParties = async (): Promise<void> => {
  const sql = conectar()
  try {
    const contactos = await importarContactos(sql)
    const cuentas = await importarCuentas(sql)
    const membresias = await importarMembresias(sql)
    process.stdout.write(
      `✓ parties: ${String(contactos)} Contactos, ${String(cuentas)} Cuentas, ${String(membresias)} membresías\n`,
    )
  } finally {
    await sql.end()
  }
}

const importarPoliciesYRenovaciones = async (): Promise<void> => {
  const sql = conectar()
  try {
    const [batch] = await sql<{ id: string }[]>`
      select id from staging_import_batch order by started_at desc limit 1
    `
    if (batch === undefined) throw new Error('no hay staging_import_batch; correr load-staging primero')

    const mapaAseguradoras = await importarCatalogoAseguradoras(sql, RUTA_CATALOGO_APROBADO(RAIZ))
    const resultadoPolizas = await importarPolizas(sql, batch.id, mapaAseguradoras)
    const resultadoEndosos = await importarEndosos(sql)
    const resultadoRenovaciones = await importarRenovaciones(sql, batch.id)

    // El contador de `importarPolizas` es un acumulador de loop; este conteo es una
    // query independiente contra la base. Divergen exactamente en el escenario que la
    // revisión ciega de R-33 encontró (un `on conflict do update` que fusionaba filas
    // sin que el loop se enterara): compararlos acá es la red que evita que ese tipo de
    // bug vuelva a pasar inadvertido detrás de un número que "parece" razonable.
    const filasPolicyVersion = await sql<{ n: number }[]>`
      select count(*)::int as n from policy_version where source_event_type = 'Polizas'
    `
    const conteoPolicyVersion = filasPolicyVersion[0]?.n ?? -1
    if (conteoPolicyVersion !== resultadoPolizas.importadas) {
      morir(
        `discrepancia entre el conteo de importarPolizas (${String(resultadoPolizas.importadas)}) y ` +
          `policy_version real (${String(conteoPolicyVersion)}). No se continúa: el contador del loop y ` +
          'el estado de la base dejaron de coincidir.',
      )
    }

    process.stdout.write(
      `✓ policies: ${String(resultadoPolizas.enScope)} en scope, ${String(resultadoPolizas.importadas)} importadas\n` +
        `  excepciones: ${JSON.stringify(resultadoPolizas.excepciones)}\n` +
        `✓ endosos: ${String(resultadoEndosos.importados)} importados, ${String(resultadoEndosos.sinPolicyPadre)} sin Policy padre\n` +
        `✓ renovaciones: ${String(resultadoRenovaciones.resueltas)} resueltas, ${String(resultadoRenovaciones.unresolved)} unresolved\n`,
    )
  } finally {
    await sql.end()
  }
}

// Fuera del repositorio a propósito: es un archivo de trabajo entre dos invocaciones del
// CLI (`snapshot-fingerprint` y `verify-idempotency`), no evidencia versionada. Lo que
// se versiona es el resultado de la comparación en `ops/evidence/T-0013.md`.
const RUTA_FINGERPRINT =
  process.env.T0013_FINGERPRINT_PATH ?? join(tmpdir(), 't0013-fingerprint.json')

const guardarFingerprint = async (): Promise<void> => {
  const sql = conectar()
  try {
    const fingerprint = await calcularFingerprint(sql)
    writeFileSync(RUTA_FINGERPRINT, JSON.stringify(fingerprint, null, 2))
    const totalFilas = Object.values(fingerprint).reduce((acc, f) => acc + f.filas, 0)
    process.stdout.write(`✓ fingerprint guardado (${String(totalFilas)} filas de dominio en total)\n`)
  } finally {
    await sql.end()
  }
}

const compararFingerprint = async (): Promise<void> => {
  const antes = JSON.parse(readFileSync(RUTA_FINGERPRINT, 'utf8')) as FingerprintPorTabla
  const sql = conectar()
  try {
    const despues = await calcularFingerprint(sql)
    const diferencias = compararFingerprints(antes, despues)
    if (diferencias.length > 0) {
      for (const diferencia of diferencias) {
        process.stderr.write(
          `✗ ${diferencia.tabla}: antes ${String(diferencia.antes.filas)} filas/${diferencia.antes.hash.slice(0, 8)}, ` +
            `después ${String(diferencia.despues.filas)} filas/${diferencia.despues.hash.slice(0, 8)}\n`,
        )
      }
      morir(`${String(diferencias.length)} tabla(s) de dominio cambiaron entre corridas: no es idempotente.`)
    }
    process.stdout.write(`✓ idempotencia confirmada: ${String(Object.keys(despues).length)} tablas de dominio, mismo estado\n`)
  } finally {
    await sql.end()
  }
}

const comando = process.argv[2]

switch (comando) {
  case 'verify-manifest':
    await verificarManifiesto()
    break
  case 'load-staging':
    await cargarStaging()
    break
  case 'load-catalog':
    await importarCatalogo()
    break
  case 'load-parties':
    await importarParties()
    break
  case 'load-policies':
    await importarPoliciesYRenovaciones()
    break
  case 'report':
    await (async () => {
      const sql = conectar()
      try {
        process.stdout.write(`${JSON.stringify(await generarReporte(sql), null, 2)}\n`)
      } finally {
        await sql.end()
      }
    })()
    break
  case 'snapshot-fingerprint':
    await guardarFingerprint()
    break
  case 'verify-idempotency':
    await compararFingerprint()
    break
  default:
    morir(
      `comando desconocido: "${comando ?? ''}". Se espera verify-manifest, load-staging, load-catalog, load-parties, load-policies, snapshot-fingerprint, verify-idempotency o report.`,
    )
}
