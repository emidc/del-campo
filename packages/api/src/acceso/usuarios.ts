// T-0060 — Usuarios del equipo desde la app: verlos, invitar y dar de baja. Sólo un
// Administrador invita o da de baja; la regla la aplica `admin.ts` contra la base.

import type { Principal } from '../session/admission.ts'
import { sql } from '../db.ts'
import type { RechazoAdmin } from './admin.ts'
import { darDeBaja, invitar } from './admin.ts'
import { conPrincipal } from './base.ts'
import type { Conexion } from './base.ts'
import { AccesoDenegado, identidadDe } from './datos.ts'

export interface UsuarioDelEquipo {
  readonly id: string
  readonly email: string
  readonly estado: 'INVITED' | 'ACTIVE' | 'INACTIVE'
  readonly administra: boolean
}

export interface Equipo {
  readonly yo: string
  readonly administro: boolean
  readonly usuarios: readonly UsuarioDelEquipo[]
}

export const leerEquipo = async (conexion: Conexion, principal: Principal): Promise<Equipo> => {
  const resultado = await conPrincipal(conexion, identidadDe(principal), async (tx, yo) => ({
    yo: yo.usuarioId,
    administro: yo.rol === 'ADMINISTRADOR',
    usuarios: await tx<UsuarioDelEquipo[]>`
      select id, email, status as estado, coalesce(role = 'ADMINISTRADOR', false) as administra
      from app_user
      where role in ('ADMINISTRADOR', 'OPERADOR')
      order by (status = 'INACTIVE'), email
    `,
  }))
  if (!resultado.ok) throw new AccesoDenegado(resultado.motivo)
  return resultado.valor
}

const actor = async (conexion: Conexion, principal: Principal): Promise<string> => {
  const resultado = await conPrincipal(conexion, identidadDe(principal), (_tx, yo) => Promise.resolve(yo.usuarioId))
  if (!resultado.ok) throw new AccesoDenegado(resultado.motivo)
  return resultado.valor
}

/** Vigencia de la invitación hecha desde la app: el máximo, para no tener que repetirla. */
const DIAS = 30

/** Invita a una persona al equipo. Devuelve null si salió bien, o el motivo del rechazo. */
export const invitarAlEquipoCon = async (
  conexion: Conexion,
  principal: Principal,
  email: string,
): Promise<RechazoAdmin | null> => {
  const resultado = await invitar(conexion, { actor: await actor(conexion, principal), email, rol: 'OPERADOR', dias: DIAS })
  return resultado.ok ? null : resultado.motivo
}

export const darDeBajaDelEquipoCon = async (
  conexion: Conexion,
  principal: Principal,
  usuarioId: string,
): Promise<RechazoAdmin | null> => {
  const resultado = await darDeBaja(conexion, { actor: await actor(conexion, principal), usuarioId })
  return resultado.ok ? null : resultado.motivo
}

export const equipo = (principal: Principal): Promise<Equipo> => leerEquipo(sql(), principal)
export const invitarAlEquipo = (principal: Principal, email: string): Promise<RechazoAdmin | null> =>
  invitarAlEquipoCon(sql(), principal, email)
export const darDeBajaDelEquipo = (principal: Principal, usuarioId: string): Promise<RechazoAdmin | null> =>
  darDeBajaDelEquipoCon(sql(), principal, usuarioId)
