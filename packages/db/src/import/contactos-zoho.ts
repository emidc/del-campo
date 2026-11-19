// Teléfonos y mails de Zoho → `contact_point`, normalizados. La importación de T-0013 los
// cargó como estaban escritos y sin "Otro teléfono"; muchos no vinculan con WhatsApp
// porque llevan 0, 15 o el número partido. Este paso los pone en formato +54, agrega los
// que faltan y deja un solo dueño por número.
//
// Reglas (Emiliano, 2026-11-19):
// - Un número sin característica no se completa: va a revisión.
// - Si el mismo teléfono o mail está en una persona y en una empresa, queda en la persona.
// - Si está en más de una persona (o en más de una empresa sin persona), no se carga de
//   nuevo y va a revisión: lo que ya estaba cargado queda como estaba.
//
// `planificar` es puro: decide qué cambiar sin tocar la base. `aplicar` ejecuta el plan
// en una transacción.

import type { Ejecutor } from './db.ts'

export type Entidad = 'Contactos' | 'Cuentas'
export type Canal = 'PHONE' | 'EMAIL'

export interface ValorZoho {
  readonly entidad: Entidad
  readonly zohoId: string
  readonly canal: Canal
  readonly columna: string
  readonly valor: string
}

export interface Existente {
  readonly id: string
  readonly partyId: string
  readonly channel: 'PHONE' | 'WHATSAPP' | 'EMAIL'
  readonly value: string
  readonly normalizedValue: string
  readonly source: string | null
}

export type MotivoRevision = 'telefono_sin_caracteristica' | 'telefono_invalido' | 'mail_invalido' | 'compartido' | 'sin_cliente'

export interface Revision {
  readonly entidad: Entidad
  readonly zohoId: string
  readonly canal: Canal
  readonly columna: string
  readonly motivo: MotivoRevision
}

export interface Plan {
  readonly actualizar: { readonly id: string; readonly value: string; readonly normalized: string }[]
  readonly altas: { readonly partyId: string; readonly channel: Canal; readonly value: string; readonly normalized: string; readonly source: string }[]
  readonly bajas: string[]
  readonly sinCambios: number
  readonly revisar: Revision[]
}

export type Telefono =
  | { readonly kind: 'ok'; readonly value: string; readonly normalized: string; readonly movil: boolean }
  | { readonly kind: 'sin_caracteristica' | 'invalido' }

/**
 * Un teléfono argentino en formato +54 (+549 si es celular), o por qué no se puede.
 * Acepta 0 de larga distancia, 15 de celular, +54/0054 y +549. Con 10 dígitos
 * nacionales (característica + número) está completo; con 7 u 8, o un 15 sin
 * característica, le falta la característica y no se inventa.
 */
export const normalizarTelefono = (raw: string, esMovil = false): Telefono => {
  let d = raw.replace(/\D/g, '')
  let movil = esMovil
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('54') && d.length >= 12) {
    d = d.slice(2)
    if (d.startsWith('9')) {
      movil = true
      d = d.slice(1)
    }
  }
  if (d.startsWith('0')) d = d.slice(1)
  if (d.length === 12) {
    // característica + 15 + número. La característica es 11, o de 3 o 4 dígitos.
    const largos = d.startsWith('11') ? [2] : [3, 4].filter((a) => d.slice(a, a + 2) === '15')
    const [a] = largos
    if (largos.length !== 1 || a === undefined || d.slice(a, a + 2) !== '15') return { kind: 'invalido' }
    d = d.slice(0, a) + d.slice(a + 2)
    movil = true
  }
  if (d.length === 10 && /^[1-3]/.test(d)) {
    const value = `+54${movil ? '9' : ''}${d}`
    return { kind: 'ok', value, normalized: value.slice(1), movil }
  }
  if (d.length === 7 || d.length === 8 || (d.length === 9 && d.startsWith('15'))) return { kind: 'sin_caracteristica' }
  return { kind: 'invalido' }
}

export const normalizarMail = (raw: string): string | null => {
  const v = raw.trim().toLowerCase()
  return /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(v) ? v : null
}

/** Con qué se compara un contacto: los últimos 10 dígitos de un teléfono, el mail en minúsculas. */
const clave = (canal: Canal, normalized: string): string => (canal === 'PHONE' ? normalized.slice(-10) : normalized)

const claveExistente = (e: Existente): string | null => {
  if (e.channel === 'EMAIL') return normalizarMail(e.value)
  const t = normalizarTelefono(e.value)
  if (t.kind === 'ok') return t.normalized.slice(-10)
  const d = e.value.replace(/\D/g, '')
  return d.length >= 10 ? d.slice(-10) : null
}

const canalDe = (e: Existente): Canal => (e.channel === 'EMAIL' ? 'EMAIL' : 'PHONE')
const esDeZoho = (e: Existente): boolean => e.source?.startsWith('zoho:') === true

interface Candidato {
  readonly v: ValorZoho
  readonly partyId: string
  readonly value: string
  readonly normalized: string
  readonly movil: boolean
}

export const planificar = (
  valores: readonly ValorZoho[],
  clientes: ReadonlyMap<string, string>,
  existentes: readonly Existente[],
): Plan => {
  const revisar: Revision[] = []
  const aRevision = (v: ValorZoho, motivo: MotivoRevision): void => {
    revisar.push({ entidad: v.entidad, zohoId: v.zohoId, canal: v.canal, columna: v.columna, motivo })
  }

  // 1. Normalizar cada valor y ubicar su cliente.
  const porClave = new Map<string, Candidato[]>()
  for (const v of valores) {
    const partyId = clientes.get(`${v.entidad}:${v.zohoId}`)
    let limpio: Omit<Candidato, 'v' | 'partyId'>
    if (v.canal === 'EMAIL') {
      const m = normalizarMail(v.valor)
      if (m === null) {
        aRevision(v, 'mail_invalido')
        continue
      }
      limpio = { value: m, normalized: m, movil: false }
    } else {
      const t = normalizarTelefono(v.valor, v.columna === 'Móvil')
      if (t.kind !== 'ok') {
        aRevision(v, t.kind === 'sin_caracteristica' ? 'telefono_sin_caracteristica' : 'telefono_invalido')
        continue
      }
      limpio = t
    }
    if (partyId === undefined) {
      aRevision(v, 'sin_cliente')
      continue
    }
    const c: Candidato = { v, partyId, value: limpio.value, normalized: limpio.normalized, movil: limpio.movil }
    const k = `${v.canal}|${clave(v.canal, c.normalized)}`
    porClave.set(k, [...(porClave.get(k) ?? []), c])
  }

  // Lo vigente, por cliente y clave.
  const vigentes = new Map<string, Existente[]>()
  for (const e of existentes) {
    const k = claveExistente(e)
    if (k === null) continue
    const id = `${e.partyId}|${canalDe(e)}|${k}`
    vigentes.set(id, [...(vigentes.get(id) ?? []), e])
  }

  const actualizar: Plan['actualizar'] = []
  const altas: Plan['altas'] = []
  const bajas: string[] = []
  let sinCambios = 0

  for (const [k, candidatos] of porClave) {
    const [canal, kk] = k.split('|') as [Canal, string]
    // 2. Un solo dueño: la persona antes que la empresa.
    const personas = candidatos.filter((c) => c.v.entidad === 'Contactos')
    const duenos = personas.length > 0 ? personas : candidatos
    const partiesDuenas = new Set(duenos.map((c) => c.partyId))
    // Si el número figura como celular en alguna columna, se guarda como celular.
    if (partiesDuenas.size > 1) {
      for (const c of candidatos) aRevision(c.v, 'compartido')
      continue
    }
    const [partyId] = partiesDuenas
    const elegido = duenos.find((c) => c.movil) ?? duenos[0]
    if (partyId === undefined || elegido === undefined) continue

    // 3. Lo que ya tiene el dueño: se corrige el formato o se agrega.
    const suyos = vigentes.get(`${partyId}|${canal}|${kk}`) ?? []
    if (suyos.length === 0) {
      altas.push({ partyId, channel: canal, value: elegido.value, normalized: elegido.normalized, source: `zoho:${elegido.v.entidad}:${elegido.v.zohoId}` })
    } else {
      const deZoho = suyos.filter(esDeZoho)
      const cargadoPorEquipo = deZoho.length < suyos.length
      // Si el equipo ya lo cargó, vale lo suyo y las copias de Zoho sobran.
      const queda = cargadoPorEquipo ? undefined : (deZoho.find((e) => e.normalizedValue === elegido.normalized) ?? deZoho[0])
      for (const e of deZoho) if (e !== queda) bajas.push(e.id)
      if (queda !== undefined && (queda.value !== elegido.value || queda.normalizedValue !== elegido.normalized)) {
        actualizar.push({ id: queda.id, value: elegido.value, normalized: elegido.normalized })
      } else sinCambios += 1
    }

    // 4. Las empresas que repetían el número de su persona lo pierden.
    for (const c of candidatos) {
      if (c.partyId === partyId) continue
      for (const e of vigentes.get(`${c.partyId}|${canal}|${kk}`) ?? []) if (esDeZoho(e) && !bajas.includes(e.id)) bajas.push(e.id)
    }
  }

  return { actualizar, altas, bajas, sinCambios, revisar }
}

export const aplicar = async (sql: Ejecutor, plan: Plan): Promise<void> => {
  // Primero las bajas: liberan el valor normalizado para las actualizaciones.
  for (const id of plan.bajas) {
    await sql`update contact_point set status = 'INACTIVE', valid_to = clock_timestamp() where id = ${id} and status = 'ACTIVE'`
  }
  for (const a of plan.actualizar) {
    await sql`update contact_point set value = ${a.value}, normalized_value = ${a.normalized} where id = ${a.id}`
  }
  for (const a of plan.altas) {
    await sql`
      insert into contact_point (party_id, channel, value, normalized_value, source)
      values (${a.partyId}, ${a.channel}, ${a.value}, ${a.normalized}, ${a.source})
      on conflict (party_id, channel, normalized_value, source)
        do update set status = 'ACTIVE', valid_to = null, value = excluded.value`
  }
}
