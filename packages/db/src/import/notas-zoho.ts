// Notas de Zoho → `party_note` (0032_notas.sql). Lee los exports «Notas_Contactos» y
// «Notas_Cuentas»: cada nota cuelga de un contacto o una cuenta por «ID principal.id».
//
// - Se cargan como activas, con `source = 'Zoho'`, el ID de la nota, quién la escribió en
//   Zoho y cuándo (hora de Argentina).
// - Una nota que ya está en Broker OS (mismo ID de Zoho) no se vuelve a cargar: correr de
//   nuevo no duplica.
// - Va a revisión si su contacto o cuenta no está en Broker OS, o si no tiene ni título
//   ni texto.
//
// `planificar` es puro: decide qué cargar sin tocar la base. `aplicar` ejecuta el plan.

import type { Ejecutor } from './db.ts'

export type Entidad = 'Contactos' | 'Cuentas'

export interface NotaZoho {
  readonly entidad: Entidad
  readonly zohoId: string
  readonly principalId: string
  readonly titulo: string
  readonly contenido: string
  readonly autor: string
  /** «2019-08-23 12:30:49», hora de Argentina, como la exporta Zoho. */
  readonly creada: string
}

export const COLUMNAS_NOTA = {
  id: 'ID de registro',
  principal: 'ID principal.id',
  titulo: 'Título de la nota',
  contenido: 'Contenido de la nota',
  autor: 'Creado por',
  creada: 'Hora de creación',
} as const

export type MotivoRevision = 'sin_cliente' | 'vacia' | 'fecha_invalida'

export interface Alta {
  readonly zohoId: string
  readonly partyId: string
  readonly title: string | null
  readonly body: string
  readonly author: string | null
  readonly createdAt: string
}

export interface Plan {
  readonly altas: Alta[]
  readonly yaCargadas: number
  readonly repetidas: number
  readonly revisar: { readonly entidad: Entidad; readonly zohoId: string; readonly motivo: MotivoRevision }[]
}

const FECHA = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/

/**
 * @param clientes `entidad:ID de Zoho` → parte de Broker OS.
 * @param cargadas IDs de Zoho de las notas que ya están en Broker OS.
 */
export const planificar = (notas: readonly NotaZoho[], clientes: ReadonlyMap<string, string>, cargadas: ReadonlySet<string>): Plan => {
  const plan: Plan = { altas: [], yaCargadas: 0, repetidas: 0, revisar: [] }
  const vistas = new Set<string>()
  let yaCargadas = 0
  let repetidas = 0
  for (const n of notas) {
    if (cargadas.has(n.zohoId)) {
      yaCargadas++
      continue
    }
    if (vistas.has(n.zohoId)) {
      repetidas++
      continue
    }
    vistas.add(n.zohoId)
    const partyId = clientes.get(`${n.entidad}:${n.principalId}`)
    if (partyId === undefined) {
      plan.revisar.push({ entidad: n.entidad, zohoId: n.zohoId, motivo: 'sin_cliente' })
      continue
    }
    const titulo = n.titulo.trim().replace(/\s+/g, ' ').slice(0, 200)
    const cuerpo = n.contenido.replace(/\r\n/g, '\n').trim().slice(0, 20000)
    if (titulo === '' && cuerpo === '') {
      plan.revisar.push({ entidad: n.entidad, zohoId: n.zohoId, motivo: 'vacia' })
      continue
    }
    const fecha = FECHA.exec(n.creada.trim())
    if (fecha === null) {
      plan.revisar.push({ entidad: n.entidad, zohoId: n.zohoId, motivo: 'fecha_invalida' })
      continue
    }
    const autor = n.autor.trim().slice(0, 120)
    plan.altas.push({
      zohoId: n.zohoId,
      partyId,
      title: titulo === '' ? null : titulo,
      body: cuerpo,
      author: autor === '' ? null : autor,
      createdAt: `${fecha[1] ?? ''}T${fecha[2] ?? ''}-03:00`,
    })
  }
  return { ...plan, yaCargadas, repetidas }
}

/** Carga las notas del plan. Una que ya esté (mismo ID de Zoho) no se toca. */
export const aplicar = async (sql: Ejecutor, plan: Plan): Promise<void> => {
  for (const a of plan.altas) {
    await sql`
      insert into party_note (party_id, title, body, source, source_record_id, source_author, created_at)
      values (${a.partyId}, ${a.title}, ${a.body}, 'Zoho', ${a.zohoId}, ${a.author}, ${a.createdAt})
      on conflict (source_record_id) do nothing`
  }
}
