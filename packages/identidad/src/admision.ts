// Reglas puras de admisión de D-0077: sin red, sin base y sin reloj propio, para que las
// pruebas negativas sean baratas y existan (el mismo criterio que D-0060).
//
// Este módulo decide dos cosas y nada más:
//   1. si el estado de una cookie de sesión deja pasar una identidad;
//   2. qué hacer cuando alguien vuelve de Google: entrar con una credencial existente,
//      vincular una invitación, o rechazar.
// Lo que cada contexto busca en su base (el usuario, su estado, la invitación) llega como
// argumento. Si la persona sigue ACTIVA lo vuelve a exigir la base en cada request
// (`authz.usuario()`, D-0022): por eso la baja es inmediata aunque la cookie siga viva.

import type { Identidad } from './identidad.ts'
import { identidadUtilizable, normalizarEmail } from './identidad.ts'

export type EstadoSesion =
  | { readonly tipo: 'NINGUNA' }
  | { readonly tipo: 'INVALIDA' }
  | { readonly tipo: 'VENCIDA' }
  | { readonly tipo: 'IDENTIDAD'; readonly identidad: Identidad }

export type RechazoSesion = 'SIN_SESION' | 'SESION_INVALIDA' | 'SESION_VENCIDA'

export type ResultadoSesion =
  | { readonly ok: true; readonly identidad: Identidad }
  | { readonly ok: false; readonly motivo: RechazoSesion }

export const evaluarSesion = (estado: EstadoSesion): ResultadoSesion => {
  switch (estado.tipo) {
    case 'NINGUNA':
      return { ok: false, motivo: 'SIN_SESION' }
    case 'INVALIDA':
      return { ok: false, motivo: 'SESION_INVALIDA' }
    case 'VENCIDA':
      return { ok: false, motivo: 'SESION_VENCIDA' }
    case 'IDENTIDAD':
      return identidadUtilizable(estado.identidad)
        ? { ok: true, identidad: estado.identidad }
        : { ok: false, motivo: 'SESION_INVALIDA' }
  }
}

/** Estados del usuario interno de un contexto (plan de migración, §2). */
export type EstadoUsuario = 'INVITADO' | 'ACTIVO' | 'BAJA'

/** La credencial que el contexto encontró para el par (proveedor, sujeto), si hay una. */
export interface CredencialEncontrada {
  readonly usuarioId: string
  readonly estadoUsuario: EstadoUsuario
}

/** La invitación vigente para el email, si hay una. `usuarioId` es a quién se vincula. */
export interface InvitacionEncontrada {
  readonly usuarioId: string
  readonly email: string
  /** Instante en que vence, en milisegundos. Una invitación vencida no vincula. */
  readonly venceEn: number
  readonly estadoUsuario: EstadoUsuario
}

export type RechazoLogin =
  | 'IDENTIDAD_INVALIDA'
  | 'EMAIL_NO_VERIFICADO'
  | 'DADO_DE_BAJA'
  | 'NO_INVITADO'

export type DecisionLogin =
  | { readonly tipo: 'ENTRA'; readonly usuarioId: string }
  | { readonly tipo: 'VINCULA'; readonly usuarioId: string }
  | { readonly tipo: 'RECHAZA'; readonly motivo: RechazoLogin }

/**
 * Qué hacer con una identidad que acaba de volver de Google.
 *
 * - Con credencial: entra si el usuario está ACTIVO. El email puede haber cambiado; da
 *   igual, porque la clave es el sujeto.
 * - Sin credencial: vincula sólo con una invitación vigente para ese mismo email
 *   verificado, cuyo usuario no esté dado de baja. Si no, no entra: autenticarse con
 *   Google no da acceso (D-0072).
 *
 * Todo rechazo de un contexto se muestra igual hacia afuera; el motivo es para quien opera.
 */
export const decidirLogin = (
  identidad: Identidad,
  credencial: CredencialEncontrada | null,
  invitacion: InvitacionEncontrada | null,
  ahora: number,
): DecisionLogin => {
  if (!identidadUtilizable(identidad)) return { tipo: 'RECHAZA', motivo: 'IDENTIDAD_INVALIDA' }
  if (!identidad.emailVerificado) return { tipo: 'RECHAZA', motivo: 'EMAIL_NO_VERIFICADO' }

  if (credencial !== null) {
    if (credencial.estadoUsuario === 'ACTIVO') return { tipo: 'ENTRA', usuarioId: credencial.usuarioId }
    if (credencial.estadoUsuario === 'BAJA') return { tipo: 'RECHAZA', motivo: 'DADO_DE_BAJA' }
    // Una credencial de un usuario todavía INVITADO no debería existir: el vínculo lo
    // activa en la misma transacción. Si aparece, no se adivina: no entra.
    return { tipo: 'RECHAZA', motivo: 'NO_INVITADO' }
  }

  if (invitacion === null) return { tipo: 'RECHAZA', motivo: 'NO_INVITADO' }
  if (normalizarEmail(invitacion.email) !== normalizarEmail(identidad.email)) {
    return { tipo: 'RECHAZA', motivo: 'NO_INVITADO' }
  }
  if (invitacion.venceEn <= ahora) return { tipo: 'RECHAZA', motivo: 'NO_INVITADO' }
  if (invitacion.estadoUsuario === 'BAJA') return { tipo: 'RECHAZA', motivo: 'DADO_DE_BAJA' }
  return { tipo: 'VINCULA', usuarioId: invitacion.usuarioId }
}
