// Completa las pólizas y clientes ya cargados con lo que el export de Zoho trae y Broker
// OS todavía no tenía: estado, productor, premio, suma asegurada y forma de pago de cada
// póliza, y la carpeta de Drive de cada cliente. Sólo llena lo vacío: lo que el equipo
// ya cargó o corrigió en Broker OS no se pisa. Correrlo dos veces no cambia nada.
//
// La póliza se encuentra por el «ID de registro» de Zoho que guarda su versión importada
// (`policy_version.source_event_id`). El cliente, por `party_source_link`, que puede venir
// de otra base (la local de la importación) cuando la de destino no lo tiene.

import { classifyDriveUrl } from '../zoho-links/drive-url.ts'
import { datosDePoliza } from './datos-de-poliza.ts'
import type { Ejecutor } from './db.ts'
import { CAMPOS_CONTACTO, CAMPOS_CUENTA, CAMPOS_POLIZA } from './zoho-fields.ts'

type Fila = Readonly<Record<string, string | undefined>>

export const CAMPOS_COMPLETABLES = ['status', 'producer', 'totalPremium', 'sumInsured', 'paymentMethod'] as const
export type CampoCompletable = (typeof CAMPOS_COMPLETABLES)[number]

const COLUMNA_DE_ZOHO: Readonly<Record<CampoCompletable, string>> = {
  status: CAMPOS_POLIZA.estado,
  producer: CAMPOS_POLIZA.productor,
  totalPremium: CAMPOS_POLIZA.premio,
  sumInsured: CAMPOS_POLIZA.sumaAsegurada,
  paymentMethod: CAMPOS_POLIZA.formaDePago,
}

export interface ResumenDePolizas {
  readonly leidas: number
  readonly encontradas: number
  /** Encabezados que el export no trae: esos campos no se pueden completar. */
  readonly columnasFaltantes: readonly string[]
  /** Por campo: cuántas pólizas lo tienen en Zoho y cuántas se completarían en Broker OS. */
  readonly campos: Readonly<Record<CampoCompletable, { readonly enZoho: number; readonly aCompletar: number }>>
}

interface Valores {
  readonly id: string
  readonly status: string | null
  readonly producer: string | null
  readonly totalPremium: string | null
  readonly sumInsured: string | null
  readonly paymentMethod: string | null
}

export const completarPolizas = async (sql: Ejecutor, filas: readonly Fila[], aplicar: boolean): Promise<ResumenDePolizas> => {
  const encabezados = new Set(filas.flatMap((f) => Object.keys(f)))
  const columnasFaltantes = CAMPOS_COMPLETABLES.map((c) => COLUMNA_DE_ZOHO[c]).filter((c) => !encabezados.has(c))
  const valores: Valores[] = []
  for (const fila of filas) {
    const id = fila[CAMPOS_POLIZA.idDeRegistro]?.trim() ?? ''
    if (id !== '') valores.push({ id, ...datosDePoliza(fila) })
  }

  const filasDeBase = await sql<{ id: string; status: string | null; producer: string | null; total_premium: string | null; sum_insured: string | null; payment_method: string | null; zoho: string }[]>`
    select pv.id, pv.status, pv.producer, pv.total_premium::text, pv.sum_insured::text, pv.payment_method, pv.source_event_id as zoho
    from policy_version pv
    where pv.source_event_type = 'Polizas' and pv.effective_to is null
      and pv.source_event_id = any(${valores.map((v) => v.id)}::text[])`
  const enBase = new Map(filasDeBase.map((f) => [f.zoho, f]))

  const campos = Object.fromEntries(CAMPOS_COMPLETABLES.map((c) => [c, { enZoho: 0, aCompletar: 0 }])) as Record<
    CampoCompletable,
    { enZoho: number; aCompletar: number }
  >
  const actuales: Readonly<Record<CampoCompletable, (f: (typeof filasDeBase)[number]) => string | null>> = {
    status: (f) => f.status,
    producer: (f) => f.producer,
    totalPremium: (f) => f.total_premium,
    sumInsured: (f) => f.sum_insured,
    paymentMethod: (f) => f.payment_method,
  }
  const cambios: (Valores & { readonly versionId: string })[] = []
  for (const v of valores) {
    const actual = enBase.get(v.id)
    if (actual === undefined) continue
    let cambia = false
    for (const c of CAMPOS_COMPLETABLES) {
      if (v[c] === null) continue
      campos[c].enZoho += 1
      if (actuales[c](actual) === null) {
        campos[c].aCompletar += 1
        cambia = true
      }
    }
    if (cambia) cambios.push({ ...v, versionId: actual.id })
  }

  if (aplicar && cambios.length > 0) {
    await sql`
      update policy_version pv set
        status = coalesce(pv.status, z.status),
        producer = coalesce(pv.producer, z.producer),
        total_premium = coalesce(pv.total_premium, z.total_premium::numeric),
        sum_insured = coalesce(pv.sum_insured, z.sum_insured::numeric),
        payment_method = coalesce(pv.payment_method, z.payment_method)
      from jsonb_to_recordset(${sql.json(
        cambios.map((c) => ({
          id: c.versionId,
          status: c.status,
          producer: c.producer,
          total_premium: c.totalPremium,
          sum_insured: c.sumInsured,
          payment_method: c.paymentMethod,
        })),
      )}) as z(id uuid, status text, producer text, total_premium text, sum_insured text, payment_method text)
      where pv.id = z.id and pv.effective_to is null`
  }

  return { leidas: filas.length, encontradas: enBase.size, columnasFaltantes, campos }
}

export interface ResumenDeCarpetas {
  readonly leidas: number
  readonly conCarpeta: number
  readonly sinCliente: number
  readonly yaTenian: number
  readonly nuevas: number
}

/** Los vínculos Zoho → cliente: «Contactos:<id>» o «Cuentas:<id>» → party_id. */
export const vinculosDeClientes = async (sql: Ejecutor): Promise<Map<string, string>> => {
  const filas = await sql<{ clave: string; party_id: string }[]>`
    select source_entity_type || ':' || source_record_id as clave, party_id::text as party_id
    from party_source_link where source_system = 'Zoho'`
  return new Map(filas.map((f) => [f.clave, f.party_id]))
}

export const completarCarpetas = async (
  sql: Ejecutor,
  contactos: readonly Fila[],
  cuentas: readonly Fila[],
  vinculos: ReadonlyMap<string, string>,
  aplicar: boolean,
): Promise<ResumenDeCarpetas> => {
  const pedidas = new Map<string, string>()
  let leidas = 0
  let conCarpeta = 0
  let sinCliente = 0
  for (const [modulo, filas, idCol, urlCol] of [
    ['Contactos', contactos, CAMPOS_CONTACTO.idDeRegistro, CAMPOS_CONTACTO.driveUrl],
    ['Cuentas', cuentas, CAMPOS_CUENTA.idDeRegistro, CAMPOS_CUENTA.driveUrl],
  ] as const) {
    for (const fila of filas) {
      leidas += 1
      const url = classifyDriveUrl(fila[urlCol] ?? '')
      if (!url.ok || url.target !== 'FOLDER') continue
      conCarpeta += 1
      const party = vinculos.get(`${modulo}:${fila[idCol]?.trim() ?? ''}`)
      if (party === undefined) {
        sinCliente += 1
        continue
      }
      if (!pedidas.has(party)) pedidas.set(party, url.url)
    }
  }

  // Sólo clientes que existen en la base de destino y que todavía no tienen carpeta.
  const existentes = await sql<{ id: string; tiene: boolean }[]>`
    select p.id::text as id, exists (
      select 1 from document_link dl where dl.resource_type = 'PARTY' and dl.resource_id = p.id and dl.drive_item_type = 'FOLDER'
    ) as tiene
    from party p where p.id = any(${[...pedidas.keys()]}::uuid[])`
  const nuevas = existentes.filter((e) => !e.tiene)
  sinCliente += pedidas.size - existentes.length

  if (aplicar) {
    for (const e of nuevas) {
      const url = pedidas.get(e.id)
      if (url === undefined) continue
      await sql`
        insert into document_link (
          resource_type, resource_id, drive_file_id, drive_url, drive_item_type, reconciliation_status, link_level
        ) values ('PARTY', ${e.id}, ${url}, ${url}, 'FOLDER', 'NOT_REFERENCED', 'ZOHO_UNVERIFIED')
        on conflict do nothing`
    }
  }

  return { leidas, conCarpeta, sinCliente, yaTenian: existentes.length - nuevas.length, nuevas: nuevas.length }
}
