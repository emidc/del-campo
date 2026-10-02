// T-0022 / D-0064 — los enlaces de Drive que el lote de Zoho informa, cargados como un
// nivel propio (`document_link.link_level = 'ZOHO_UNVERIFIED'`).
//
// Qué NO hace, a propósito:
//
//  - no comprueba el destino (no resuelve, no pide, no sigue redirects): D-0057 y D-0064
//    reservan "comprobado" para lo que una persona abrió y registró;
//  - no proyecta nada a dominio (external_reference / policy_document_reference): esas
//    estructuras son de D-0054 y representan una relación sustentada, que un enlace sin
//    comprobar no es;
//  - no toca ninguna fila de nivel HUMAN, ni document_verification_input.
//
// Reemplazo de la foto: una carga borra **sólo** los ZOHO_UNVERIFIED anteriores y
// reinserta los del lote nuevo, en la transacción del llamador. Eso da agregar, cambiar
// y quitar en una sola operación, y hace la carga idempotente sin un upsert por fila:
// releer el mismo lote deja exactamente el mismo contenido.

import { leerCsv } from '../import/csv.ts'
import type { Ejecutor } from '../import/db.ts'
import { rutaDeModulo } from '../import/lote.ts'
import { CAMPOS_CONTACTO, CAMPOS_CUENTA, CAMPOS_POLIZA } from '../import/zoho-fields.ts'
import { classifyDriveUrl } from './drive-url.ts'
import type { DriveRejection, DriveTarget } from './drive-url.ts'

/** Por qué una fila del lote no produjo un enlace ofrecido. Son categorías, no datos. */
export type SkipReason =
  | DriveRejection
  /** La URL apunta a una carpeta y la fila es de Pólizas: una carpeta no es el documento. */
  | 'CARPETA_EN_POLIZA'
  /** La URL apunta a un archivo y la fila es de Contactos/Cuentas: se pedía la carpeta. */
  | 'ARCHIVO_EN_CLIENTE'
  /** El registro de origen no está importado en Broker OS (fuera del scope de T-0013). */
  | 'FUERA_DEL_SCOPE'
  /**
   * La fila del lote no trae «ID de registro». Separado de FUERA_DEL_SCOPE a propósito:
   * un registro no importado es esperable y masivo, una fila sin id es un defecto del
   * export que conviene ver. Mezclados, el conteo agregado no permite distinguirlos.
   */
  | 'SIN_ID_DE_ORIGEN'
  /** Dos URLs distintas para el mismo recurso: no se elige ninguna (D-0057). */
  | 'AMBIGUO'

export interface ZohoLinkCounts {
  readonly filas: number
  readonly ofrecidos: number
  readonly omitidos: Readonly<Record<SkipReason, number>>
}

export interface ZohoLinkLoadResult {
  readonly polizas: ZohoLinkCounts
  readonly clientes: ZohoLinkCounts
  /** Enlaces de Zoho borrados de la foto anterior. */
  readonly borrados: number
  /** Filas efectivamente escritas, por tipo de recurso. */
  readonly insertados: { readonly policy: number; readonly party: number }
}

const SKIP_REASONS: readonly SkipReason[] = [
  'VACIA',
  'NO_ES_URL',
  'NO_ES_DRIVE',
  'FORMA_DESCONOCIDA',
  'CARPETA_EN_POLIZA',
  'ARCHIVO_EN_CLIENTE',
  'FUERA_DEL_SCOPE',
  'SIN_ID_DE_ORIGEN',
  'AMBIGUO',
]

class Tally {
  filas = 0
  ofrecidos = 0
  readonly omitidos = new Map<SkipReason, number>(SKIP_REASONS.map((reason) => [reason, 0]))

  skip(reason: SkipReason): void {
    this.omitidos.set(reason, (this.omitidos.get(reason) ?? 0) + 1)
  }

  snapshot(): ZohoLinkCounts {
    return {
      filas: this.filas,
      ofrecidos: this.ofrecidos,
      omitidos: Object.fromEntries(this.omitidos) as Record<SkipReason, number>,
    }
  }
}

interface PendingLink {
  readonly resourceType: 'POLICY' | 'PARTY'
  readonly resourceId: string
  readonly url: string
  readonly target: DriveTarget
}

/**
 * Acumula por recurso y detecta el único conflicto posible: dos filas del lote que
 * apuntan al mismo recurso con URLs distintas (dos Contactos resueltos a la misma Party,
 * por ejemplo). Elegir una sería presentar lo ambiguo como inequívoco; se descartan
 * todas las filas de ese recurso y se cuentan como AMBIGUO en su módulo.
 */
class LinksPorRecurso {
  private readonly porRecurso = new Map<string, { link: PendingLink | null; filas: number }>()

  add(link: PendingLink): void {
    const clave = `${link.resourceType}:${link.resourceId}`
    const previo = this.porRecurso.get(clave)
    if (previo === undefined) {
      this.porRecurso.set(clave, { link, filas: 1 })
      return
    }
    previo.filas += 1
    if (previo.link !== null && previo.link.url !== link.url) previo.link = null
  }

  /** Los enlaces que sobreviven, y cuántas filas quedaron descartadas por ambigüedad. */
  resolver(): {
    readonly links: readonly PendingLink[]
    readonly filasAmbiguas: { readonly POLICY: number; readonly PARTY: number }
  } {
    const links: PendingLink[] = []
    const filasAmbiguas = { POLICY: 0, PARTY: 0 }
    for (const [clave, entrada] of this.porRecurso) {
      if (entrada.link !== null) {
        links.push(entrada.link)
        continue
      }
      const tipo = clave.startsWith('POLICY:') ? 'POLICY' : 'PARTY'
      filasAmbiguas[tipo] += entrada.filas
    }
    return { links, filasAmbiguas }
  }

  /** Filas que resolvieron al mismo recurso con la misma URL y por eso se insertan una sola vez. */
  duplicadosExactos(): { readonly POLICY: number; readonly PARTY: number } {
    const duplicados = { POLICY: 0, PARTY: 0 }
    for (const [clave, entrada] of this.porRecurso) {
      if (entrada.link === null || entrada.filas <= 1) continue
      const tipo = clave.startsWith('POLICY:') ? 'POLICY' : 'PARTY'
      duplicados[tipo] += entrada.filas - 1
    }
    return duplicados
  }
}

/**
 * Policies por `source_event_id` del módulo Pólizas, en una sola consulta. Igual criterio
 * que T-0017: un `source_event_id` que resuelve a más de una Policy no resuelve a
 * ninguna. Cargar el mapa completo evita una consulta por fila sobre ~2.000 filas.
 */
const mapaDePolicies = async (sql: Ejecutor): Promise<Map<string, string>> => {
  const rows = await sql<{ source_event_id: string; policy_id: string; candidatos: string }[]>`
    select source_event_id, min(policy_id::text) as policy_id, count(distinct policy_id) as candidatos
    from policy_version
    where source_event_type = 'Polizas' and source_event_id is not null
    group by source_event_id
  `
  const mapa = new Map<string, string>()
  for (const row of rows) {
    if (Number(row.candidatos) === 1) mapa.set(row.source_event_id, row.policy_id)
  }
  return mapa
}

/**
 * Contactos y Cuentas a su Party por `party_source_link`, la tabla que T-0013 creó
 * justamente para que la identidad de origen resuelva sin matching difuso (§61).
 */
const mapaDeParties = async (
  sql: Ejecutor,
  entityType: 'Contactos' | 'Cuentas',
): Promise<Map<string, string>> => {
  const rows = await sql<{ source_record_id: string; party_id: string }[]>`
    select source_record_id, party_id::text as party_id
    from party_source_link
    where source_system = 'Zoho' and source_entity_type = ${entityType}
  `
  return new Map(rows.map((row) => [row.source_record_id, row.party_id]))
}

interface ModuleSpec {
  readonly ruta: string
  readonly idColumn: string
  readonly urlColumn: string
  readonly resourceType: 'POLICY' | 'PARTY'
  readonly esperado: DriveTarget
  readonly resolver: Map<string, string>
}

const recorrerModulo = async (
  spec: ModuleSpec,
  tally: Tally,
  destino: LinksPorRecurso,
): Promise<void> => {
  for await (const fila of leerCsv(spec.ruta)) {
    tally.filas += 1

    const sourceId = (fila[spec.idColumn] ?? '').trim()
    const clasificacion = classifyDriveUrl(fila[spec.urlColumn] ?? '')

    if (!clasificacion.ok) {
      tally.skip(clasificacion.rejection)
      continue
    }
    if (clasificacion.target !== spec.esperado) {
      tally.skip(spec.esperado === 'FILE' ? 'CARPETA_EN_POLIZA' : 'ARCHIVO_EN_CLIENTE')
      continue
    }

    if (sourceId === '') {
      tally.skip('SIN_ID_DE_ORIGEN')
      continue
    }
    const resourceId = spec.resolver.get(sourceId)
    if (resourceId === undefined) {
      tally.skip('FUERA_DEL_SCOPE')
      continue
    }

    tally.ofrecidos += 1
    destino.add({
      resourceType: spec.resourceType,
      resourceId,
      url: clasificacion.url,
      target: clasificacion.target,
    })
  }
}

const insertar = async (sql: Ejecutor, links: readonly PendingLink[]): Promise<void> => {
  for (const link of links) {
    await sql`
      insert into document_link (
        resource_type, resource_id, drive_file_id, drive_url, drive_item_type,
        reconciliation_status, link_level
      ) values (
        ${link.resourceType}, ${link.resourceId}, ${link.url}, ${link.url}, ${link.target},
        ${'NOT_REFERENCED'}, ${'ZOHO_UNVERIFIED'}
      )
    `
  }
}

/**
 * Lee los módulos Pólizas, Contactos y Cuentas de `raizDelLote` y reemplaza por completo
 * la foto de enlaces de Zoho. Debe correr dentro de una transacción: entre el borrado de
 * la foto anterior y la inserción de la nueva, la base no tiene enlaces de Zoho.
 */
export const loadZohoLinks = async (
  sql: Ejecutor,
  raizDelLote: string,
): Promise<ZohoLinkLoadResult> => {
  const [policies, contactos, cuentas] = await Promise.all([
    mapaDePolicies(sql),
    mapaDeParties(sql, 'Contactos'),
    mapaDeParties(sql, 'Cuentas'),
  ])

  const tallyPolizas = new Tally()
  const tallyClientes = new Tally()
  const destino = new LinksPorRecurso()

  await recorrerModulo(
    {
      ruta: rutaDeModulo(raizDelLote, 'polizas'),
      idColumn: CAMPOS_POLIZA.idDeRegistro,
      urlColumn: CAMPOS_POLIZA.urlDriveDocPoliza,
      resourceType: 'POLICY',
      esperado: 'FILE',
      resolver: policies,
    },
    tallyPolizas,
    destino,
  )

  for (const [modulo, idColumn, urlColumn, resolver] of [
    ['contactos', CAMPOS_CONTACTO.idDeRegistro, CAMPOS_CONTACTO.driveUrl, contactos],
    ['cuentas', CAMPOS_CUENTA.idDeRegistro, CAMPOS_CUENTA.driveUrl, cuentas],
  ] as const) {
    await recorrerModulo(
      {
        ruta: rutaDeModulo(raizDelLote, modulo),
        idColumn,
        urlColumn,
        resourceType: 'PARTY',
        esperado: 'FOLDER',
        resolver,
      },
      tallyClientes,
      destino,
    )
  }

  const { links, filasAmbiguas } = destino.resolver()
  const duplicados = destino.duplicadosExactos()
  // `ofrecidos` se contó por fila del lote; la base guarda uno por recurso. Las filas
  // ambiguas pasan a AMBIGUO y las repetidas idénticas simplemente dejan de contarse,
  // para que ofrecidos == filas insertadas.
  for (const [tally, tipo] of [
    [tallyPolizas, 'POLICY'],
    [tallyClientes, 'PARTY'],
  ] as const) {
    for (let i = 0; i < filasAmbiguas[tipo]; i += 1) tally.skip('AMBIGUO')
    tally.ofrecidos -= filasAmbiguas[tipo] + duplicados[tipo]
  }

  const borrados = await sql<{ id: string }[]>`
    delete from document_link where link_level = 'ZOHO_UNVERIFIED' returning id
  `
  await insertar(sql, links)

  return {
    polizas: tallyPolizas.snapshot(),
    clientes: tallyClientes.snapshot(),
    borrados: borrados.length,
    insertados: {
      policy: links.filter((link) => link.resourceType === 'POLICY').length,
      party: links.filter((link) => link.resourceType === 'PARTY').length,
    },
  }
}
