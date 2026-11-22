// Notas de Zoho → `party_note` (0032_notas.sql). Lee los exports «Notas_Contactos» y
// «Notas_Cuentas»: cada nota cuelga de un contacto o una cuenta por «ID principal.id».
//
// - Se cargan como activas, con `source = 'Zoho'`, el ID de la nota, quién la escribió en
//   Zoho y cuándo (hora de Argentina).
// - El HTML de Zoho (<br>, <b>, vínculos…) se pasa a texto. Las ya cargadas con HTML que
//   nadie editó se limpian en la misma corrida.
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

// Zoho guarda las notas con formato como HTML. Se pasan a texto: saltos de línea, viñetas
// y vínculos legibles. Sólo se quitan las etiquetas que usa Zoho: un mail escrito como
// <nombre@dominio> queda como está.
const ETIQUETAS = 'a|b|br|div|em|font|i|li|ol|p|span|strong|u|ul'

const ENTIDADES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

const decodificar = (texto: string): string =>
  texto.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (entera, cuerpo: string) => {
    if (cuerpo.startsWith('#x') || cuerpo.startsWith('#X')) return String.fromCodePoint(parseInt(cuerpo.slice(2), 16))
    if (cuerpo.startsWith('#')) return String.fromCodePoint(parseInt(cuerpo.slice(1), 10))
    return ENTIDADES[cuerpo.toLowerCase()] ?? entera
  })

/** Un vínculo de Zoho como texto: el texto visible, y la dirección si es otra. */
const vinculo = (href: string, visible: string): string => {
  const texto = visible.replace(new RegExp(`</?(?:${ETIQUETAS})\\b[^>]*>`, 'gi'), '').trim()
  const destino = decodificar(href.trim())
  const sinEsquema = destino.replace(/^(https?:\/\/|mailto:)/i, '').replace(/\/$/, '')
  if (texto === '') return sinEsquema
  if (sinEsquema === '' || texto.includes(sinEsquema) || sinEsquema.includes('@')) return texto
  return `${texto} (${destino})`
}

/** El texto de una nota de Zoho sin HTML. Si no tiene HTML, queda igual. */
export const textoDeNota = (crudo: string): string => {
  if (!new RegExp(`</?(?:${ETIQUETAS})\\b`, 'i').test(crudo) && !/&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(crudo)) return crudo.trim()
  const texto = crudo
    .replace(/\r\n?/g, '\n')
    .replace(/<a\b[^>]*?href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_t, href: string, visible: string) => vinculo(href, visible))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|ul|ol)>/gi, '\n')
    .replace(new RegExp(`</?(?:${ETIQUETAS})\\b[^>]*>`, 'gi'), '')
  return decodificar(texto)
    .split('\n')
    .map((linea) => linea.replace(/[ \t\u00a0]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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
    const titulo = textoDeNota(n.titulo).replace(/\s+/g, ' ').slice(0, 200)
    const cuerpo = textoDeNota(n.contenido.replace(/\r\n/g, '\n')).trim().slice(0, 20000)
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

export interface NotaCargada {
  readonly id: string
  readonly title: string | null
  readonly body: string
}

/**
 * Las notas de Zoho ya cargadas que todavía tienen HTML, con su texto limpio. Se les pasan
 * sólo las que nadie editó en Broker OS.
 */
export const limpiezas = (cargadas: readonly NotaCargada[]): NotaCargada[] =>
  cargadas.flatMap((n) => {
    const title = n.title === null ? null : textoDeNota(n.title).replace(/\s+/g, ' ').slice(0, 200) || null
    const body = textoDeNota(n.body).slice(0, 20000)
    if (title === n.title && body === n.body) return []
    if (title === null && body.trim() === '') return []
    return [{ id: n.id, title, body }]
  })

/** Reemplaza el HTML por el texto limpio, sin tocar las notas que alguien editó mientras tanto. */
export const aplicarLimpiezas = async (sql: Ejecutor, notas: readonly NotaCargada[]): Promise<void> => {
  for (const n of notas) {
    await sql`update party_note set title = ${n.title}, body = ${n.body} where id = ${n.id} and source = 'Zoho' and updated_at is null`
  }
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
