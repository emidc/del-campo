// T-0062 — Token personal del servidor MCP. Cada persona del equipo genera el suyo en la
// app; el agente que lo usa actúa con ese usuario. Se guarda sólo el hash.

import { createHash, randomBytes } from 'node:crypto'

import type { Conexion } from '../acceso/base.ts'
import { conPrincipal, enTransaccion } from '../acceso/base.ts'
import { AccesoDenegado, identidadDe } from '../acceso/datos.ts'
import type { Principal } from '../session/admission.ts'

const PREFIJO = 'bos_'

export const hashDeToken = (token: string): string => createHash('sha256').update(token).digest('hex')

/** Genera el token de la persona y revoca el anterior. Devuelve el valor, que no se vuelve a mostrar. */
export const crearTokenMcp = async (conexion: Conexion, principal: Principal): Promise<string> => {
  const quien = await conPrincipal(conexion, identidadDe(principal), (_tx, p) => Promise.resolve(p.usuarioId))
  if (!quien.ok) throw new AccesoDenegado(quien.motivo)
  const token = PREFIJO + randomBytes(32).toString('base64url')
  await enTransaccion(conexion, async (tx) => {
    await tx`update mcp_token set revoked_at = now() where user_id = ${quien.valor} and revoked_at is null`
    await tx`insert into mcp_token (user_id, token_hash) values (${quien.valor}, ${hashDeToken(token)})`
  })
  return token
}

/** Revoca el token vigente de la persona, si tiene. */
export const revocarTokenMcp = async (conexion: Conexion, principal: Principal): Promise<void> => {
  const quien = await conPrincipal(conexion, identidadDe(principal), (_tx, p) => Promise.resolve(p.usuarioId))
  if (!quien.ok) throw new AccesoDenegado(quien.motivo)
  await conexion`update mcp_token set revoked_at = now() where user_id = ${quien.valor} and revoked_at is null`
}

/** Desde cuándo tiene token vigente la persona, o null. */
export const tokenMcpVigente = async (conexion: Conexion, principal: Principal): Promise<Date | null> => {
  const [fila] = await conexion<{ creado: Date }[]>`
    select t.created_at as creado
    from mcp_token t join user_credential c on c.user_id = t.user_id
    where c.provider = 'google' and c.subject = ${principal.sub} and t.revoked_at is null
  `
  return fila?.creado ?? null
}

export interface TitularDeToken {
  readonly usuarioId: string
  readonly principal: Principal
}

/**
 * A quién pertenece un token vigente. Devuelve la misma identidad que deja el login con
 * Google, así las consultas pasan por `conDatos` igual que en la app: una baja corta el
 * acceso del agente en el pedido siguiente.
 */
export const resolverTokenMcp = async (conexion: Conexion, token: string): Promise<TitularDeToken | null> => {
  if (!token.startsWith(PREFIJO) || token.length > 100) return null
  const [fila] = await conexion<{ id: string; usuarioId: string; sub: string; email: string }[]>`
    select t.id, u.id as "usuarioId", c.subject as sub, u.email
    from mcp_token t
    join app_user u on u.id = t.user_id
    join user_credential c on c.user_id = u.id and c.provider = 'google'
    where t.token_hash = ${hashDeToken(token)} and t.revoked_at is null and u.status = 'ACTIVE'
  `
  if (fila === undefined) return null
  await conexion`update mcp_token set last_used_at = now() where id = ${fila.id}`
  return { usuarioId: fila.usuarioId, principal: { sub: fila.sub, email: fila.email, displayName: null } }
}
