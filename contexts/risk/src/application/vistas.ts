// Casos de uso de lectura de las vistas (T-0030). Cada uno pide la sesión de una persona: sin
// sesión no hay vista. Los que entregan ranking, bandas o `C_raw` (la lista con sus secciones,
// los escenarios y el detalle) registran el acceso de esa persona a esa organización antes de
// devolver nada (RO01 §2, Acceso; A8a): si el registro falla, no hay datos.
//
// El plan de acción, la transferencia y la actividad no muestran ranking, bandas ni `C_raw`, y
// no se registran como vistas con resultados.
//
// Con AUTH_MODE=oidc (T-0035) la sesión trae un rol: todas las vistas de una organización piden
// `riesgo.ver_resultados` y, a un Revisor, su orden previo de esa organización. Sin él, la base
// tampoco le entrega las evaluaciones (`authz_ve_resultados`, 0006): sin este chequeo, la vista
// se armaría incompleta en vez de explicar por qué no se muestra.

import {
  armarActividad, armarDetalle, armarEscenarios, armarLista, armarPlan, armarTransferencia,
  type VistaActividad, type VistaDetalle, type VistaEscenarios, type VistaLista, type VistaPlan, type VistaTransferencia,
} from '../domain/vistas.ts'
import type { VersionFunciones } from '../domain/modelo.ts'
import { registrarAcceso } from '../persistence/acceso.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { leerOrganizacion, leerOrganizaciones, organizacionDeRiesgo, type Organizacion } from '../persistence/vistas.ts'
import { exigirPermiso } from '../domain/permisos.ts'
import type { Sesion } from './acceso.ts'
import { exigirResultados } from './actualizacion.ts'

type Db = Sql | TransactionSql

/** Las vistas que registran un acceso con resultados, con el nombre que queda en `risk.registro_acceso.vista`. */
export const VISTAS_CON_RESULTADOS = ['lista', 'escenarios', 'detalle'] as const
export type VistaConResultados = (typeof VISTAS_CON_RESULTADOS)[number]

const conResultados = async (db: Db, sesion: Sesion, organizacionId: string, vista: VistaConResultados): Promise<void> => {
  await registrarAcceso(db, sesion.personaId, { tipo: 'vista_resultados', organizacionId, vista })
}

/** Las organizaciones con riesgos y cuántos objetos tiene cada una. No es una vista con resultados. */
export const organizaciones = async (db: Db, sesion: Sesion): Promise<Organizacion[]> => {
  exigirPermiso(sesion.rol, 'riesgo.consultar')
  return leerOrganizaciones(db)
}

/** Lista por organización con seguridad, no evaluables y cola; `null` si la organización o la unidad no existen. */
export const vistaLista = async (
  db: Db, sesion: Sesion, version: VersionFunciones, organizacionId: string, unidad: string | null = null,
): Promise<VistaLista | null> => {
  const d = await leerOrganizacion(db, organizacionId)
  if (d === null) return null
  if (unidad !== null && !d.riesgos.some((r) => r.unidadId === unidad)) return null
  await exigirResultados(db, sesion, organizacionId)
  const vista = armarLista(version, d, unidad)
  await conResultados(db, sesion, organizacionId, 'lista')
  return vista
}

export const vistaEscenarios = async (db: Db, sesion: Sesion, version: VersionFunciones, organizacionId: string): Promise<VistaEscenarios | null> => {
  const d = await leerOrganizacion(db, organizacionId)
  if (d === null) return null
  await exigirResultados(db, sesion, organizacionId)
  const vista = armarEscenarios(version, d)
  await conResultados(db, sesion, organizacionId, 'escenarios')
  return vista
}

/** El detalle de un riesgo, con `C_raw` junto al vector y las banderas (H6); `null` si no existe. */
export const vistaDetalle = async (db: Db, sesion: Sesion, version: VersionFunciones, riskId: string): Promise<VistaDetalle | null> => {
  const organizacionId = await organizacionDeRiesgo(db, riskId)
  if (organizacionId === null) return null
  const d = await leerOrganizacion(db, organizacionId)
  if (d === null) return null
  await exigirResultados(db, sesion, organizacionId)
  const vista = armarDetalle(version, d, riskId)
  await conResultados(db, sesion, organizacionId, 'detalle')
  return vista
}

export const vistaPlan = async (db: Db, sesion: Sesion, organizacionId: string): Promise<VistaPlan | null> => {
  const d = await leerOrganizacion(db, organizacionId)
  if (d === null) return null
  await exigirResultados(db, sesion, organizacionId)
  return armarPlan(d)
}

export const vistaTransferencia = async (
  db: Db, sesion: Sesion, version: VersionFunciones, organizacionId: string,
): Promise<VistaTransferencia | null> => {
  const d = await leerOrganizacion(db, organizacionId)
  if (d === null) return null
  await exigirResultados(db, sesion, organizacionId)
  return armarTransferencia(version, d)
}

export const vistaActividad = async (db: Db, sesion: Sesion, organizacionId: string): Promise<VistaActividad | null> => {
  const d = await leerOrganizacion(db, organizacionId)
  if (d === null) return null
  await exigirResultados(db, sesion, organizacionId)
  return armarActividad(d)
}
