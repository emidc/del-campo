// T-0061 — La sección Riesgos de la ficha de empresa: las listas de la planilla (Riesgos,
// Acciones, Transferencia, Fuentes) y lo que guardó el modelo de riesgos (ubicaciones,
// relevamientos, conclusiones del agente). Todo de la base de Broker OS, por `conDatos`:
// como `broker_app`, a nombre de quien mira, con RLS decidiendo. Sólo el equipo lo ve.

import type { Conclusion, CurrentFact, Location, RiskItem, RiskItemFields, RiskList, Survey } from '@del-campo/db'
import {
  RISK_LISTS,
  cleanRiskItemCode,
  cleanRiskItemFields,
  commentRiskItem,
  createRiskItem,
  listConclusions,
  listCurrentFacts,
  listLocations,
  listRiskItems,
  listSurveys,
  retireRiskItem,
  updateRiskItem,
} from '@del-campo/db'

import type { Conexion } from '../acceso/base.ts'
import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import { esUuid } from '../polizas/edicion.ts'
import type { Principal } from '../session/admission.ts'

export type { RiskItem, RiskItemFields, RiskList }

export const esListaDeRiesgos = (valor: unknown): valor is RiskList =>
  typeof valor === 'string' && (RISK_LISTS as readonly string[]).includes(valor)

export interface RiesgosDeEmpresa {
  readonly items: readonly RiskItem[]
  readonly ubicaciones: readonly Location[]
  readonly condiciones: readonly CurrentFact[]
  readonly relevamientos: readonly Survey[]
  readonly conclusiones: readonly Conclusion[]
}

export const riesgosDeEmpresaCon = async (conexion: Conexion, principal: Principal, partyId: string): Promise<RiesgosDeEmpresa> => {
  if (!esUuid(partyId)) return { items: [], ubicaciones: [], condiciones: [], relevamientos: [], conclusiones: [] }
  return conDatos(conexion, principal, async (tx) => ({
    items: await listRiskItems(tx, partyId, { includeRetired: true }),
    ubicaciones: await listLocations(tx, partyId),
    condiciones: await listCurrentFacts(tx, partyId),
    relevamientos: await listSurveys(tx, partyId),
    conclusiones: await listConclusions(tx, partyId),
  }))
}

export const listasDeRiesgos = async (principal: Principal, partyId: string): Promise<RiesgosDeEmpresa> =>
  riesgosDeEmpresaCon(sql(), principal, partyId)

export type ResultadoDeItem = 'guardado' | 'repetido' | 'codigo_invalido' | 'demasiado_largo' | 'inexistente' | 'vacio'

export const MENSAJE_DE_ITEM: Readonly<Record<ResultadoDeItem, string>> = {
  guardado: 'Guardado.',
  repetido: 'Ya hay un ítem con ese código en esta lista.',
  codigo_invalido: 'El código va con una letra y números, por ejemplo R30 o A27.',
  demasiado_largo: 'Algún campo es demasiado largo (hasta 4000 caracteres).',
  inexistente: 'Ese ítem ya no existe.',
  vacio: 'Escribí el comentario.',
}

export const crearItemCon = async (
  conexion: Conexion,
  principal: Principal,
  partyId: string,
  lista: RiskList,
  codigo: string,
  crudo: Readonly<Record<string, unknown>>,
): Promise<ResultadoDeItem> => {
  if (!esUuid(partyId)) return 'inexistente'
  const code = cleanRiskItemCode(codigo)
  if (code === null) return 'codigo_invalido'
  const fields = cleanRiskItemFields(lista, crudo)
  if (fields === null) return 'demasiado_largo'
  const r = await conDatos(conexion, principal, (tx) => createRiskItem(tx, { partyId, list: lista, code, fields }))
  return r.kind === 'ok' ? 'guardado' : 'repetido'
}

export const editarItemCon = async (
  conexion: Conexion,
  principal: Principal,
  partyId: string,
  itemId: string,
  lista: RiskList,
  crudo: Readonly<Record<string, unknown>>,
): Promise<ResultadoDeItem> => {
  if (!esUuid(partyId) || !esUuid(itemId)) return 'inexistente'
  const fields = cleanRiskItemFields(lista, crudo)
  if (fields === null) return 'demasiado_largo'
  const r = await conDatos(conexion, principal, (tx) => updateRiskItem(tx, partyId, itemId, fields))
  return r.kind === 'ok' ? 'guardado' : 'inexistente'
}

export const darDeBajaItemCon = async (
  conexion: Conexion,
  principal: Principal,
  partyId: string,
  itemId: string,
  baja: boolean,
): Promise<ResultadoDeItem> => {
  if (!esUuid(partyId) || !esUuid(itemId)) return 'inexistente'
  const r = await conDatos(conexion, principal, (tx) => retireRiskItem(tx, partyId, itemId, baja))
  return r.kind === 'ok' ? 'guardado' : 'inexistente'
}

export const comentarItemCon = async (
  conexion: Conexion,
  principal: Principal,
  partyId: string,
  itemId: string,
  texto: string,
): Promise<ResultadoDeItem> => {
  if (!esUuid(partyId) || !esUuid(itemId)) return 'inexistente'
  const body = texto.trim()
  if (body === '') return 'vacio'
  if (body.length > 4000) return 'demasiado_largo'
  const r = await conDatos(conexion, principal, (tx) => commentRiskItem(tx, partyId, itemId, body))
  return r.kind === 'ok' ? 'guardado' : 'inexistente'
}

export const crearItemDeRiesgo = async (
  principal: Principal,
  partyId: string,
  lista: RiskList,
  codigo: string,
  crudo: Readonly<Record<string, unknown>>,
): Promise<ResultadoDeItem> => crearItemCon(sql(), principal, partyId, lista, codigo, crudo)

export const editarItemDeRiesgo = async (
  principal: Principal,
  partyId: string,
  itemId: string,
  lista: RiskList,
  crudo: Readonly<Record<string, unknown>>,
): Promise<ResultadoDeItem> => editarItemCon(sql(), principal, partyId, itemId, lista, crudo)

export const darDeBajaItemDeRiesgo = async (principal: Principal, partyId: string, itemId: string, baja: boolean): Promise<ResultadoDeItem> =>
  darDeBajaItemCon(sql(), principal, partyId, itemId, baja)

export const comentarItemDeRiesgo = async (principal: Principal, partyId: string, itemId: string, texto: string): Promise<ResultadoDeItem> =>
  comentarItemCon(sql(), principal, partyId, itemId, texto)
