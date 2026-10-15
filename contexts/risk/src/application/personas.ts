// Alta, cambio de contraseña y baja de las personas con acceso a la UI (D-0069). Las ejecuta el
// owner con `cli-persona.ts`; la app no tiene pantalla para esto (RO01 §8: sin roles).

import { randomBytes } from 'node:crypto'

import type { Sql } from '../persistence/database.ts'
import { altaPersona, credencialDeUsuario, nuevaCredencial } from '../persistence/acceso.ts'
import { hashContrasena, USUARIO } from './acceso.ts'

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** Un ULID (48 bits de milisegundos y 80 al azar, en Crockford base32), como los ids del contrato (RV-ID-01). */
export function ulid(ahora: number = Date.now()): string {
  let tiempo = ''
  for (let t = ahora, i = 0; i < 10; i++, t = Math.floor(t / 32)) tiempo = (CROCKFORD[t % 32] ?? '0') + tiempo
  const azar = [...randomBytes(16)].map((b) => CROCKFORD[b % 32] ?? '0').join('')
  return tiempo + azar
}

/** Da de alta una persona con su usuario y su primera contraseña. Devuelve el id de la persona. */
export const darDeAlta = async (sql: Sql, nombre: string, usuario: string, contrasena: string): Promise<string> => {
  if (!USUARIO.test(usuario)) throw new Error('el usuario va en minúsculas, dígitos, punto, guion o guion bajo, de 3 a 64 caracteres')
  if (nombre.trim() === '') throw new Error('falta el nombre')
  const hash = await hashContrasena(contrasena)
  const id = `PER-${ulid()}`
  await sql.begin((tx) => altaPersona(tx, { id, nombre: nombre.trim(), usuario, hash }))
  return id
}

const personaDe = async (sql: Sql, usuario: string): Promise<string> => {
  const c = await credencialDeUsuario(sql, usuario)
  if (c === null) throw new Error(`no existe el usuario ${usuario}`)
  return c.personaId
}

/** Una contraseña nueva: invalida las sesiones abiertas con la anterior. */
export const cambiarContrasena = async (sql: Sql, usuario: string, contrasena: string): Promise<void> => {
  const hash = await hashContrasena(contrasena)
  await nuevaCredencial(sql, await personaDe(sql, usuario), hash)
}

/** Baja: la persona ya no entra y sus sesiones abiertas dejan de valer. Lo que escribió queda. */
export const darDeBaja = async (sql: Sql, usuario: string): Promise<void> => {
  await nuevaCredencial(sql, await personaDe(sql, usuario), null)
}
