// Cookie de sesión como JWE (`dir` + A256GCM) con `jose`, como en VS01 (D-0060).
// Cifrada y no sólo firmada: lleva el email de una persona.
//
// Cada app la usa con su propio nombre de cookie y su propio propósito, que entra en la
// derivación de la clave: el mismo secreto en dos apps no produce la misma clave, y una
// cookie de una app no se descifra en otra.
//
// La sesión dice quién es. No autoriza nada: el contexto resuelve el usuario y su estado
// en la base en cada request (D-0022).

import { createHash } from 'node:crypto'

import { EncryptJWT, errors, jwtDecrypt } from 'jose'

import type { EstadoSesion } from './admision.ts'
import type { Identidad } from './identidad.ts'
import { esProveedor } from './identidad.ts'

export const MIN_LARGO_SECRETO = 32

/** Ocho horas: una jornada, como hoy en los tres contextos. */
export const DURACION_SESION_SEGUNDOS = 8 * 60 * 60

export interface ConfigSesion {
  /** Nombre de la cookie, propio de cada app. */
  readonly cookie: string
  /** Propósito de la clave, propio de cada app; entra en la derivación. */
  readonly proposito: string
  readonly secreto: string
  readonly segura: boolean
  readonly duracionSegundos?: number
}

/** Deriva 32 bytes para A256GCM a partir del secreto y de un propósito. */
export const derivarClave = (secreto: string, proposito: string): Uint8Array => {
  if (secreto.length < MIN_LARGO_SECRETO) {
    throw new Error(`el secreto de sesión debe tener al menos ${String(MIN_LARGO_SECRETO)} caracteres`)
  }
  if (proposito.trim() === '') throw new Error('falta el propósito de la clave')
  return new Uint8Array(createHash('sha256').update(`${proposito}\u0000${secreto}`, 'utf8').digest())
}

export const sellarSesion = (identidad: Identidad, config: ConfigSesion): Promise<string> =>
  new EncryptJWT({
    proveedor: identidad.proveedor,
    email: identidad.email,
    emailVerificado: identidad.emailVerificado,
    nombre: identidad.nombre,
  })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setSubject(identidad.sujeto)
    .setIssuedAt()
    .setExpirationTime(`${String(config.duracionSegundos ?? DURACION_SESION_SEGUNDOS)}s`)
    .encrypt(derivarClave(config.secreto, config.proposito))

/** Nunca lanza por una cookie mala: devuelve el estado (una cookie adulterada es esperable). */
export const leerSesion = (valor: string | undefined, config: ConfigSesion): Promise<EstadoSesion> =>
  valor === undefined || valor === ''
    ? Promise.resolve({ tipo: 'NINGUNA' })
    : jwtDecrypt(valor, derivarClave(config.secreto, config.proposito)).then(
        ({ payload }): EstadoSesion => {
          const { sub, proveedor, email, emailVerificado, nombre } = payload
          if (typeof sub !== 'string' || typeof email !== 'string' || !esProveedor(proveedor)) {
            return { tipo: 'INVALIDA' }
          }
          return {
            tipo: 'IDENTIDAD',
            identidad: {
              proveedor,
              sujeto: sub,
              email,
              emailVerificado: emailVerificado === true,
              nombre: typeof nombre === 'string' && nombre !== '' ? nombre : null,
            },
          }
        },
        (error: unknown): EstadoSesion =>
          error instanceof errors.JWTExpired ? { tipo: 'VENCIDA' } : { tipo: 'INVALIDA' },
      )

export interface AtributosCookie {
  readonly name: string
  readonly value: string
  readonly httpOnly: true
  readonly sameSite: 'lax'
  readonly secure: boolean
  readonly path: '/'
  readonly maxAge: number
}

export const cookieDeSesion = (valor: string, config: ConfigSesion): AtributosCookie => ({
  name: config.cookie,
  value: valor,
  httpOnly: true,
  sameSite: 'lax',
  secure: config.segura,
  path: '/',
  maxAge: config.duracionSegundos ?? DURACION_SESION_SEGUNDOS,
})

export const cookieBorrada = (config: ConfigSesion): AtributosCookie => ({
  ...cookieDeSesion('', config),
  maxAge: 0,
})
