// Acceso por persona (D-0069; RO01 §2, Acceso; decisión 2 del owner). La contraseña se guarda
// sólo como hash scrypt en `risk.credencial`, se compara en tiempo constante y la identidad que
// sale de acá —la persona— es la única que la app pasa a las vistas y a lo que escribe.
//
// Sin dependencias: `scrypt`, `randomBytes` y `timingSafeEqual` de `node:crypto`. El formato
// del hash es el de D-0066 (`scrypt:N:r:p:<sal>:<hash>`), con los mismos límites.

import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

import type { Sql, TransactionSql } from '../persistence/database.ts'
import { credencialDePersona, credencialDeUsuario, fallidosRecientes, registrarAcceso, registrarFallido } from '../persistence/acceso.ts'

type Db = Sql | TransactionSql

/** El owner la genera al azar; más corta se rechaza al generar el hash. */
export const LARGO_MINIMO_CONTRASENA = 20
/** El formato de `risk.usuario.usuario` (migración 0003). */
export const USUARIO = /^[a-z0-9][a-z0-9._-]{2,63}$/

const KEY_LENGTH = 32
const PARAMETROS = { N: 2 ** 15, r: 8, p: 1 }
const B64 = /^[A-Za-z0-9+/]+={0,2}$/

interface HashScrypt {
  readonly N: number
  readonly r: number
  readonly p: number
  readonly sal: Buffer
  readonly hash: Buffer
}

/** Lee un hash guardado. Un formato inválido es `null`: esa credencial no deja entrar. */
export const leerHash = (crudo: string): HashScrypt | null => {
  const partes = crudo.split(':')
  if (partes.length !== 6 || partes[0] !== 'scrypt') return null
  const [, n, r, p, sal, hash] = partes
  if (n === undefined || r === undefined || p === undefined || sal === undefined || hash === undefined) return null
  if (!/^\d+$/.test(n) || !/^\d+$/.test(r) || !/^\d+$/.test(p) || !B64.test(sal) || !B64.test(hash)) return null
  const N = Number(n)
  // N potencia de 2 entre 2^14 y 2^20: ni un hash débil ni uno que agote la memoria.
  if (N < 2 ** 14 || N > 2 ** 20 || (N & (N - 1)) !== 0) return null
  if (Number(r) < 8 || Number(r) > 32 || Number(p) < 1 || Number(p) > 4) return null
  const salBuf = Buffer.from(sal, 'base64')
  const hashBuf = Buffer.from(hash, 'base64')
  if (salBuf.length < 16 || hashBuf.length !== KEY_LENGTH) return null
  return { N, r: Number(r), p: Number(p), sal: salBuf, hash: hashBuf }
}

const derivar = (contrasena: string, sal: Buffer, params: { N: number; r: number; p: number }): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(contrasena.normalize('NFC'), sal, KEY_LENGTH, { ...params, maxmem: 256 * params.N * params.r }, (error, key) => {
      if (error === null) resolve(key)
      else reject(error)
    })
  })

/** El hash que se guarda. Rechaza contraseñas cortas, contadas en code points. */
export const hashContrasena = async (contrasena: string): Promise<string> => {
  if (Array.from(contrasena).length < LARGO_MINIMO_CONTRASENA) {
    throw new Error(`la contraseña tiene que tener al menos ${String(LARGO_MINIMO_CONTRASENA)} caracteres`)
  }
  const sal = randomBytes(16)
  const key = await derivar(contrasena, sal, PARAMETROS)
  const { N, r, p } = PARAMETROS
  return `scrypt:${String(N)}:${String(r)}:${String(p)}:${sal.toString('base64')}:${key.toString('base64')}`
}

// Contra este hash se compara cuando el usuario no existe o está de baja: la demora es la misma
// y no dice cuál de los dos datos estaba mal. Se calcula una vez, con una contraseña al azar.
let hashDeRelleno: Promise<HashScrypt> | null = null
const relleno = (): Promise<HashScrypt> => {
  hashDeRelleno ??= hashContrasena(randomBytes(24).toString('base64')).then((h) => {
    const leido = leerHash(h)
    if (leido === null) throw new Error('hash de relleno inválido')
    return leido
  })
  return hashDeRelleno
}

/** `true` si la contraseña corresponde al hash. Siempre calcula scrypt. */
export const verificarContrasena = async (hash: string | null, contrasena: string): Promise<boolean> => {
  const leido = hash === null ? null : leerHash(hash)
  const contra = leido ?? (await relleno())
  const key = await derivar(contrasena, contra.sal, contra)
  return timingSafeEqual(key, contra.hash) && leido !== null
}

/** La persona de una sesión: la identidad de todo lo que se lee o se escribe desde la app. */
export interface Sesion {
  readonly personaId: string
  readonly nombre: string
  /** La credencial con que entró: si deja de ser la vigente, la sesión deja de valer. */
  readonly credencialId: string
}

/**
 * Límite de intentos (T-0032; D-0069 lo deja para el despliegue): con tantos fallidos de un
 * mismo usuario dentro de la ventana, ese usuario no entra, ni con la contraseña correcta,
 * hasta que el más viejo salga de la ventana. Vale igual para un usuario que no existe, así que
 * no dice cuáles existen. Un intento bloqueado no se registra: el bloqueo vence solo. Con
 * contraseñas de 20 caracteres o más al azar, 10 intentos cada 15 minutos no alcanzan para
 * adivinar ninguna; el costo es que alguien que conozca un usuario lo puede bloquear un rato.
 */
export const LOGIN_MAXIMO_FALLIDOS = 10
export const LOGIN_VENTANA_MINUTOS = 15

/** Lo que se guarda del usuario tipeado en un intento fallido: su huella, nunca el texto. */
export const huellaUsuario = (usuario: string): string => createHash('sha256').update(usuario, 'utf8').digest('hex')

/**
 * Valida usuario y contraseña. Si son válidos, registra el inicio de sesión de la persona
 * (RO01 §2, Acceso; A8a) y devuelve la sesión; si no, `null`, sin decir cuál de los dos falló ni
 * si el usuario está bloqueado por intentos fallidos.
 */
export const iniciarSesion = async (db: Db, usuario: string, contrasena: string): Promise<Sesion | null> => {
  const huella = huellaUsuario(usuario)
  if ((await fallidosRecientes(db, huella, LOGIN_VENTANA_MINUTOS)) >= LOGIN_MAXIMO_FALLIDOS) return null
  const c = USUARIO.test(usuario) ? await credencialDeUsuario(db, usuario) : null
  const ok = await verificarContrasena(c?.hash ?? null, contrasena)
  if (!ok || c === null) {
    await registrarFallido(db, huella)
    return null
  }
  await registrarAcceso(db, c.personaId, { tipo: 'inicio_sesion' })
  return { personaId: c.personaId, nombre: c.nombre, credencialId: c.credencialId }
}

/** La sesión de una persona si esa credencial sigue siendo su vigente, o `null`. */
export const sesionVigente = async (db: Db, personaId: string, credencialId: string): Promise<Sesion | null> => {
  const c = await credencialDePersona(db, personaId)
  if (c?.hash == null || c.credencialId !== credencialId) return null
  return { personaId: c.personaId, nombre: c.nombre, credencialId: c.credencialId }
}
