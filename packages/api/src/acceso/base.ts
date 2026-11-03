// Admisión de Broker OS en la base (T-0035, D-0022, D-0077). Dos momentos:
//
// - **Al volver de Google** (`ingresar`): la identidad (proveedor, sujeto) se busca entre
//   las credenciales; si no hay, se busca una invitación vigente para ese email
//   verificado. La regla es `decidirLogin`, pura y probada en `@del-campo/identidad`;
//   acá sólo se leen sus entradas y se aplica su resultado, en una transacción.
// - **En cada request** (`conPrincipal`): la sesión trae la identidad, no permisos. Se
//   resuelve el usuario, se asume `broker_app` y se declara el principal local a la
//   transacción. Desde ahí deciden las políticas RLS y `authz.usuario()`, que exige que la
//   persona siga ACTIVE y con rol: una baja corta el acceso en el request siguiente.
//
// Las dos lecturas previas a asumir el rol (credencial e invitación) corren con la
// conexión de la app, que es dueña de las tablas: todavía no hay principal que declarar.
// Son consultas parametrizadas por la identidad que Google acaba de firmar, nada más.

import type {
  CredencialEncontrada,
  DecisionLogin,
  EstadoUsuario,
  Identidad,
  InvitacionEncontrada,
} from '@del-campo/identidad'
import { decidirLogin, normalizarEmail } from '@del-campo/identidad'
import type postgres from 'postgres'

export type Rol = 'ADMINISTRADOR' | 'OPERADOR' | 'REVISOR'

/** Quién consulta, una vez admitido en la base. Sólo lo construye `conPrincipal`. */
export interface PrincipalBroker {
  readonly usuarioId: string
  readonly rol: Rol
}

type Ejecutor = postgres.Sql | postgres.TransactionSql

/** Una conexión, o una transacción ya abierta: dentro de una, cada operación es un savepoint. */
export type Conexion = postgres.Sql | postgres.TransactionSql

/**
 * Abre una transacción, o un savepoint si ya hay una. Así las operaciones se componen, y
 * las pruebas las corren dentro de una transacción que después revierten (R-19).
 */
export const enTransaccion = <T>(
  conexion: Conexion,
  accion: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> =>
  ('savepoint' in conexion
    ? conexion.savepoint(accion)
    : conexion.begin(accion)) as Promise<T>

const ESTADOS: Readonly<Record<string, EstadoUsuario>> = {
  INVITED: 'INVITADO',
  ACTIVE: 'ACTIVO',
  INACTIVE: 'BAJA',
}

const estadoDe = (status: string): EstadoUsuario => {
  const estado = ESTADOS[status]
  if (estado === undefined) throw new Error(`estado de app_user desconocido: ${status}`)
  return estado
}

// ── Auditoría ─────────────────────────────────────────────────────────────────

export type Origen = 'app' | 'cli'

/**
 * Un evento estructurado y mínimo: quién, qué, sobre qué y con qué resultado. Sin
 * payloads ni texto libre; la base rechaza cualquier otra cosa (0007).
 */
export interface EventoDeAuditoria {
  readonly actor: string | null
  readonly origen: Origen
  readonly accion: string
  readonly tipoObjeto: string | null
  readonly idObjeto: string | null
  readonly resultado: 'ok' | 'denied' | 'error'
  readonly motivo: string | null
}

export const auditar = async (tx: Ejecutor, evento: EventoDeAuditoria): Promise<void> => {
  await tx`
    insert into audit_event (actor_user_id, origin, action, object_type, object_id, outcome, reason_code)
    values (${evento.actor}, ${evento.origen}, ${evento.accion}, ${evento.tipoObjeto},
            ${evento.idObjeto}, ${evento.resultado}, ${evento.motivo})
  `
}

// ── Login ─────────────────────────────────────────────────────────────────────

const buscarCredencial = async (
  tx: Ejecutor,
  identidad: Identidad,
): Promise<CredencialEncontrada | null> => {
  const [fila] = await tx<{ usuarioId: string; status: string }[]>`
    select u.id as "usuarioId", u.status
    from user_credential c join app_user u on u.id = c.user_id
    where c.provider = ${identidad.proveedor} and c.subject = ${identidad.sujeto}
  `
  return fila === undefined ? null : { usuarioId: fila.usuarioId, estadoUsuario: estadoDe(fila.status) }
}

const buscarInvitacion = async (
  tx: Ejecutor,
  email: string,
): Promise<(InvitacionEncontrada & { readonly id: string }) | null> => {
  // `for update`: dos logins simultáneos con la misma invitación no la consumen dos veces.
  const [fila] = await tx<{ id: string; usuarioId: string; email: string; venceEn: Date; status: string }[]>`
    select i.id, i.user_id as "usuarioId", i.email, i.expires_at as "venceEn", u.status
    from user_invitation i join app_user u on u.id = i.user_id
    where i.email = ${email} and i.consumed_at is null
    for update of i
  `
  if (fila === undefined) return null
  return {
    id: fila.id,
    usuarioId: fila.usuarioId,
    email: fila.email,
    venceEn: fila.venceEn.getTime(),
    estadoUsuario: estadoDe(fila.status),
  }
}

/**
 * Decide y aplica el login de una identidad que acaba de volver de Google. Un VINCULA
 * crea la credencial, consume la invitación y activa al usuario en la misma transacción.
 * Todo intento queda auditado, también los rechazados.
 */
export const ingresar = async (
  conexion: Conexion,
  identidad: Identidad,
  ahora: number = Date.now(),
): Promise<DecisionLogin> =>
  enTransaccion(conexion, async (tx) => {
    const credencial = await buscarCredencial(tx, identidad)
    const invitacion =
      credencial === null && identidad.email.trim() !== ''
        ? await buscarInvitacion(tx, normalizarEmail(identidad.email))
        : null
    const decision = decidirLogin(identidad, credencial, invitacion, ahora)

    if (decision.tipo === 'VINCULA' && invitacion !== null) {
      await tx`
        insert into user_credential (user_id, provider, subject)
        values (${decision.usuarioId}, ${identidad.proveedor}, ${identidad.sujeto})
      `
      await tx`update user_invitation set consumed_at = now() where id = ${invitacion.id}`
      await tx`update app_user set status = 'ACTIVE' where id = ${decision.usuarioId} and status = 'INVITED'`
    }

    await auditar(tx, {
      actor: decision.tipo === 'RECHAZA' ? null : decision.usuarioId,
      origen: 'app',
      accion: decision.tipo === 'VINCULA' ? 'acceso.vincular' : 'acceso.ingresar',
      tipoObjeto: decision.tipo === 'RECHAZA' ? null : 'app_user',
      idObjeto: decision.tipo === 'RECHAZA' ? null : decision.usuarioId,
      resultado: decision.tipo === 'RECHAZA' ? 'denied' : 'ok',
      motivo: decision.tipo === 'RECHAZA' ? decision.motivo : null,
    })
    return decision
  })

// ── Cada request ──────────────────────────────────────────────────────────────

export type ResultadoPrincipal<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly motivo: 'SIN_CREDENCIAL' | 'SIN_ACCESO' }

/**
 * Corre `accion` como `broker_app`, con el principal declarado local a la transacción.
 * Si la persona no tiene credencial, fue dada de baja o no tiene rol, `accion` no corre.
 *
 * `set local` y `set_config(…, true)` mueren con la transacción: con el pooler en modo
 * transacción, la conexión siguiente no hereda ni el rol ni el principal (D-0022).
 */
export const conPrincipal = async <T>(
  conexion: Conexion,
  identidad: Identidad,
  accion: (tx: postgres.TransactionSql, principal: PrincipalBroker) => Promise<T>,
): Promise<ResultadoPrincipal<T>> =>
  enTransaccion(conexion, async (tx): Promise<ResultadoPrincipal<T>> => {
    const credencial = await buscarCredencial(tx, identidad)
    if (credencial === null) return { ok: false, motivo: 'SIN_CREDENCIAL' }

    await tx`set local role broker_app`
    await tx`select set_config('authz.usuario_id', ${credencial.usuarioId}, true)`
    const [fila] = await tx<{ usuarioId: string | null; rol: Rol | null }[]>`
      select authz.usuario() as "usuarioId", authz.rol() as rol
    `
    if (fila?.usuarioId == null || fila.rol === null) return { ok: false, motivo: 'SIN_ACCESO' }

    return { ok: true, valor: await accion(tx, { usuarioId: fila.usuarioId, rol: fila.rol }) }
  })
