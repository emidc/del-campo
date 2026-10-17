// Lo que el acceso de D-0069 lee y escribe: usuarios, credenciales (sólo inserción: la vigente
// es la última) y el registro de inicios de sesión y de vistas con resultados (T-0028).

import type { Sql, TransactionSql } from './database.ts'

type Db = Sql | TransactionSql

export interface CredencialVigente {
  readonly personaId: string
  readonly nombre: string
  readonly credencialId: string
  /** `null`: la persona está dada de baja. */
  readonly hash: string | null
}

/** La credencial vigente de un usuario, o `null` si el usuario no existe. */
export const credencialDeUsuario = async (db: Db, usuario: string): Promise<CredencialVigente | null> => {
  const [f] = await db<{ persona_id: string; nombre: string; id: string; password_hash: string | null }[]>`
    select u.persona_id, p.nombre, c.id::text, c.password_hash
    from risk.usuario u join risk.persona p on p.id = u.persona_id
    join lateral (select id, password_hash from risk.credencial where persona_id = u.persona_id order by id desc limit 1) c on true
    where u.usuario = ${usuario}`
  return f === undefined ? null : { personaId: f.persona_id, nombre: f.nombre, credencialId: f.id, hash: f.password_hash }
}

/** La credencial vigente de una persona, o `null` si no tiene. */
export const credencialDePersona = async (db: Db, personaId: string): Promise<CredencialVigente | null> => {
  const [f] = await db<{ persona_id: string; nombre: string; id: string; password_hash: string | null }[]>`
    select p.id as persona_id, p.nombre, c.id::text, c.password_hash
    from risk.persona p
    join lateral (select id, password_hash from risk.credencial where persona_id = p.id order by id desc limit 1) c on true
    where p.id = ${personaId}`
  return f === undefined ? null : { personaId: f.persona_id, nombre: f.nombre, credencialId: f.id, hash: f.password_hash }
}

export type Acceso =
  | { readonly tipo: 'inicio_sesion' }
  | { readonly tipo: 'vista_resultados'; readonly organizacionId: string; readonly vista: string }

export const registrarAcceso = async (db: Db, personaId: string, acceso: Acceso): Promise<void> => {
  const fila = acceso.tipo === 'inicio_sesion'
    ? { persona_id: personaId, tipo: acceso.tipo }
    : { persona_id: personaId, tipo: acceso.tipo, organizacion_id: acceso.organizacionId, vista: acceso.vista }
  await db`insert into risk.registro_acceso ${db(fila)}`
}

export const altaPersona = async (tx: TransactionSql, p: { id: string; nombre: string; usuario: string; hash: string }): Promise<void> => {
  await tx`insert into risk.persona ${tx({ id: p.id, nombre: p.nombre })}`
  await tx`insert into risk.usuario ${tx({ usuario: p.usuario, persona_id: p.id })}`
  await tx`insert into risk.credencial ${tx({ persona_id: p.id, password_hash: p.hash })}`
}

/** Una credencial nueva para una persona: un hash (rotación) o `null` (baja). */
export const nuevaCredencial = async (db: Db, personaId: string, hash: string | null): Promise<void> => {
  await db`insert into risk.credencial ${db({ persona_id: personaId, password_hash: hash })}`
}

/** Cuántos intentos fallidos tiene esa huella de usuario en los últimos `minutos` (T-0032). */
export const fallidosRecientes = async (db: Db, usuarioHuella: string, minutos: number): Promise<number> => {
  const [f] = await db<{ n: number }[]>`
    select count(*)::int as n from risk.login_fallido
    where usuario_huella = ${usuarioHuella} and ocurrido_en > now() - make_interval(mins => ${minutos})`
  return f?.n ?? 0
}

export const registrarFallido = async (db: Db, usuarioHuella: string): Promise<void> => {
  await db`insert into risk.login_fallido ${db({ usuario_huella: usuarioHuella })}`
}

/**
 * Serializa los intentos de un mismo usuario hasta el final de la transacción: sin esto, una
 * ráfaga de intentos en paralelo cuenta los fallidos antes de que ninguno se registre y el límite
 * no corta nada (revisión ciega de T-0032, hallazgo 3).
 */
export const bloquearIntentos = async (tx: TransactionSql, usuarioHuella: string): Promise<void> => {
  await tx`select pg_advisory_xact_lock(hashtextextended(${'risk.login:' + usuarioHuella}, 0))`
}
