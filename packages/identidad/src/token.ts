// Token firmado entre contextos de D-0077 (condición 2 de D-0022).
//
// Cuando Broker OS llame a la API de Risk OS o de Communication OS, viaja la identidad
// de la persona, no la de Broker OS: un JWS ES256 de corta duración con el par
// (proveedor, sujeto), `iss` del contexto que llama, `aud` del contexto destino y un
// `jti` único. El destino verifica todo eso y después aplica su propia admisión y su
// propio alcance, con sus tablas: el token prueba quién es, nunca qué puede.
//
// Rotación: quien emite publica un JWKS con todas sus claves vigentes, identificadas por
// `kid`. Para rotar se agrega la nueva al JWKS, se empieza a firmar con ella y, cuando
// vencieron los tokens firmados con la vieja (60 s), se retira la vieja.
//
// Nunca se reenvía la cookie de sesión ni el ID token de Google.

import { randomUUID } from 'node:crypto'

import type { JWK } from 'jose'
import { SignJWT, calculateJwkThumbprint, decodeProtectedHeader, errors, exportJWK, generateKeyPair, importJWK, jwtVerify } from 'jose'

import type { Proveedor } from './identidad.ts'
import { esProveedor } from './identidad.ts'

export const ALGORITMO = 'ES256'
export const DURACION_TOKEN_SEGUNDOS = 60
/** Un token que dice durar más que esto se rechaza aunque esté bien firmado. */
export const DURACION_MAXIMA_SEGUNDOS = 120
/** Desfase de reloj tolerado entre contextos. */
export const TOLERANCIA_SEGUNDOS = 5

export interface ParDeClaves {
  /** Privada: sólo la tiene quien emite. Va en una variable de entorno, nunca en Git. */
  readonly privada: JWK
  /** Pública: va en el JWKS que lee el destino. */
  readonly publica: JWK
}

const CAMPOS_PUBLICOS = ['kty', 'crv', 'x', 'y', 'kid', 'alg', 'use'] as const

/** Deja sólo los campos públicos de una clave EC. Una clave privada nunca sale de acá. */
export const clavePublica = (jwk: JWK): JWK => {
  const publica: Record<string, unknown> = {}
  for (const campo of CAMPOS_PUBLICOS) {
    if (jwk[campo] !== undefined) publica[campo] = jwk[campo]
  }
  return publica
}

export const generarParDeClaves = async (): Promise<ParDeClaves> => {
  const { privateKey, publicKey } = await generateKeyPair(ALGORITMO, { extractable: true })
  const publicaJwk = await exportJWK(publicKey)
  const kid = await calculateJwkThumbprint(publicaJwk)
  const comun = { kid, alg: ALGORITMO, use: 'sig' }
  return {
    privada: { ...(await exportJWK(privateKey)), ...comun },
    publica: clavePublica({ ...publicaJwk, ...comun }),
  }
}

export interface Jwks {
  readonly keys: readonly JWK[]
}

/** El JWKS que publica quien emite: sólo partes públicas, cada una con su `kid`. */
export const jwksDe = (claves: readonly JWK[]): Jwks => {
  const keys = claves.map(clavePublica)
  const kids = keys.map((clave) => clave.kid)
  if (kids.some((kid) => typeof kid !== 'string' || kid === '')) throw new Error('toda clave del JWKS necesita kid')
  if (new Set(kids).size !== kids.length) throw new Error('el JWKS tiene kid repetidos')
  return { keys }
}

export interface Emision {
  readonly emisor: string
  readonly audiencia: string
  readonly proveedor: Proveedor
  readonly sujeto: string
  readonly duracionSegundos?: number
  /** Segundos desde la época. Sólo para pruebas; por defecto, el reloj del sistema. */
  readonly ahora?: number
}

export const emitirToken = async (clavePrivada: JWK, emision: Emision): Promise<string> => {
  if (typeof clavePrivada.kid !== 'string' || clavePrivada.kid === '') throw new Error('la clave de firma necesita kid')
  if (clavePrivada.d === undefined) throw new Error('para firmar hace falta la clave privada')
  const ahora = emision.ahora ?? Math.floor(Date.now() / 1000)
  const duracion = emision.duracionSegundos ?? DURACION_TOKEN_SEGUNDOS
  return new SignJWT({ prv: emision.proveedor })
    .setProtectedHeader({ alg: ALGORITMO, kid: clavePrivada.kid, typ: 'JWT' })
    .setIssuer(emision.emisor)
    .setAudience(emision.audiencia)
    .setSubject(emision.sujeto)
    .setIssuedAt(ahora)
    .setExpirationTime(ahora + duracion)
    .setJti(randomUUID())
    .sign(await importJWK(clavePrivada, ALGORITMO))
}

/**
 * Recuerda los `jti` ya aceptados hasta que vencen. `registrar` devuelve `false` si el
 * `jti` ya estaba: el token se está reutilizando. Cada contexto lo implementa en su base
 * cuando tenga llamadas reales; acá hay una implementación en memoria para pruebas.
 */
export interface RegistroJti {
  registrar(jti: string, venceEn: number, ahora: number): boolean | Promise<boolean>
}

export const registroJtiEnMemoria = (): RegistroJti => {
  const vistos = new Map<string, number>()
  return {
    registrar(jti, venceEn, ahora) {
      for (const [visto, vence] of vistos) if (vence < ahora) vistos.delete(visto)
      if (vistos.has(jti)) return false
      vistos.set(jti, venceEn)
      return true
    },
  }
}

export interface Verificacion {
  readonly jwks: Jwks
  /** El contexto que llama, tal como firma en `iss`. */
  readonly emisor: string
  /** Este contexto, tal como aparece en `aud`. */
  readonly audiencia: string
  /** `null` sólo donde la reutilización no corresponde; las llamadas reales lo usan. */
  readonly registroJti: RegistroJti | null
  readonly ahora?: number
}

export type RechazoToken =
  | 'FORMATO'
  | 'ALGORITMO'
  | 'KID_DESCONOCIDO'
  | 'FIRMA'
  | 'EMISOR'
  | 'AUDIENCIA'
  | 'VENCIDO'
  | 'DURACION'
  | 'CLAIMS'
  | 'REUTILIZADO'

export type ResultadoToken =
  | { readonly ok: true; readonly proveedor: Proveedor; readonly sujeto: string; readonly jti: string }
  | { readonly ok: false; readonly motivo: RechazoToken }

const rechazo = (motivo: RechazoToken): ResultadoToken => ({ ok: false, motivo })

const motivoDeError = (error: unknown): RechazoToken => {
  if (error instanceof errors.JWTExpired) return 'VENCIDO'
  if (error instanceof errors.JWTClaimValidationFailed) {
    if (error.claim === 'iss') return 'EMISOR'
    if (error.claim === 'aud') return 'AUDIENCIA'
    if (error.claim === 'iat' || error.claim === 'nbf') return 'DURACION'
    return 'CLAIMS'
  }
  if (error instanceof errors.JWSSignatureVerificationFailed) return 'FIRMA'
  if (error instanceof errors.JOSEAlgNotAllowed) return 'ALGORITMO'
  return 'FORMATO'
}

/**
 * Verifica un token entre contextos. Nunca lanza por un token malo: devuelve el motivo.
 * El `jti` se registra al final, sólo si todo lo demás es válido, para que un token
 * falso no pueda quemar el `jti` de uno verdadero.
 */
export const verificarToken = async (token: string, verificacion: Verificacion): Promise<ResultadoToken> => {
  const ahora = verificacion.ahora ?? Math.floor(Date.now() / 1000)

  let cabecera: ReturnType<typeof decodeProtectedHeader>
  try {
    cabecera = decodeProtectedHeader(token)
  } catch {
    return rechazo('FORMATO')
  }
  if (cabecera.alg !== ALGORITMO) return rechazo('ALGORITMO')
  const clave = verificacion.jwks.keys.find((k) => k.kid !== undefined && k.kid === cabecera.kid)
  if (clave === undefined) return rechazo('KID_DESCONOCIDO')

  let payload: Awaited<ReturnType<typeof jwtVerify>>['payload']
  try {
    const resultado = await jwtVerify(token, await importJWK(clavePublica(clave), ALGORITMO), {
      algorithms: [ALGORITMO],
      issuer: verificacion.emisor,
      audience: verificacion.audiencia,
      currentDate: new Date(ahora * 1000),
      clockTolerance: TOLERANCIA_SEGUNDOS,
      requiredClaims: ['iss', 'aud', 'sub', 'iat', 'exp', 'jti'],
    })
    payload = resultado.payload
  } catch (error) {
    return rechazo(motivoDeError(error))
  }

  const { sub, jti, iat, exp, prv } = payload
  if (typeof sub !== 'string' || sub === '' || typeof jti !== 'string' || jti === '' || !esProveedor(prv)) {
    return rechazo('CLAIMS')
  }
  if (typeof iat !== 'number' || typeof exp !== 'number') return rechazo('CLAIMS')
  if (iat > ahora + TOLERANCIA_SEGUNDOS) return rechazo('DURACION')
  if (exp - iat > DURACION_MAXIMA_SEGUNDOS) return rechazo('DURACION')

  if (verificacion.registroJti !== null && !(await verificacion.registroJti.registrar(jti, exp, ahora))) {
    return rechazo('REUTILIZADO')
  }
  return { ok: true, proveedor: prv, sujeto: sub, jti }
}
