// Admisión de Communication OS en la base (T-0035, D-0022, D-0077). Es la misma forma
// que la de Broker OS (`packages/api/src/acceso/base.ts`), escrita de nuevo acá porque el
// contexto no importa nada de otro (R-25, D-0063). Dos momentos:
//
// - **Al volver de Google** (`ingresar`): la identidad (proveedor, sujeto) se busca entre
//   las credenciales y, si no hay, entre las invitaciones vigentes para ese email. La
//   regla la decide quien llama, con `decidirLogin` de `@del-campo/identidad`, que la app
//   puede importar y el contexto no; acá se leen sus entradas y se aplica su resultado,
//   en una transacción, con su evento de auditoría.
// - **En cada request** (`conPrincipal`): se resuelve el usuario, se asume
//   `communication_app` y se declara el principal local a la transacción. Desde ahí
//   deciden las políticas RLS y `authz_usuario()`, que exige que la persona siga ACTIVE y
//   con rol: una baja corta el acceso en el request siguiente.
//
// Las dos lecturas previas a asumir el rol corren con la conexión de la app, que es dueña
// de las tablas: todavía no hay principal que declarar.

import type { Conexion, TransactionSql } from './database.ts'

export type Rol = 'ADMINISTRADOR' | 'OPERADOR' | 'REVISOR'
export type EstadoUsuario = 'INVITADO' | 'ACTIVO' | 'BAJA'

/** Lo que identifica a una persona: el par (proveedor, sujeto) de D-0077, y su email. */
export interface IdentidadDeLogin {
  readonly proveedor: 'google'
  readonly sujeto: string
  readonly email: string
}

export interface CredencialEncontrada {
  readonly usuarioId: string
  readonly estadoUsuario: EstadoUsuario
}

export interface InvitacionEncontrada {
  readonly usuarioId: string
  readonly email: string
  readonly venceEn: number
  readonly estadoUsuario: EstadoUsuario
}

/** Compatible con `DecisionLogin` de `@del-campo/identidad`. */
export type DecisionLogin =
  | { readonly tipo: 'ENTRA' | 'VINCULA'; readonly usuarioId: string }
  | { readonly tipo: 'RECHAZA'; readonly motivo: string }

/** Quién consulta, una vez admitido en la base. Sólo lo construye `conPrincipal`. */
export interface PrincipalCommunication {
  readonly usuarioId: string
  readonly rol: Rol
}

/**
 * Abre una transacción, o un savepoint si ya hay una. Así las operaciones se componen, y
 * las pruebas las corren dentro de una transacción que después revierten.
 */
export const enTransaccion = <T>(conexion: Conexion, accion: (tx: TransactionSql) => Promise<T>): Promise<T> =>
  ('savepoint' in conexion ? conexion.savepoint(accion) : conexion.begin(accion)) as Promise<T>

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

export const normalizarEmail = (valor: string): string => valor.trim().toLowerCase()

// ── Auditoría ─────────────────────────────────────────────────────────────────

export type Origen = 'app' | 'cli'

/**
 * Un evento estructurado y mínimo: quién, qué, sobre qué y con qué resultado. Sin
 * payloads ni texto libre; la base rechaza cualquier otra cosa (0005).
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

export const auditar = async (tx: Conexion, evento: EventoDeAuditoria): Promise<void> => {
  await tx`
    insert into communication.audit_event
      (actor_user_id, origin, action, object_type, object_id, outcome, reason_code)
    values (${evento.actor}, ${evento.origen}, ${evento.accion}, ${evento.tipoObjeto},
            ${evento.idObjeto}, ${evento.resultado}, ${evento.motivo})
  `
}

// ── Login ─────────────────────────────────────────────────────────────────────

const buscarCredencial = async (
  tx: Conexion,
  identidad: Pick<IdentidadDeLogin, 'proveedor' | 'sujeto'>,
): Promise<CredencialEncontrada | null> => {
  const [fila] = await tx<{ usuarioId: string; status: string }[]>`
    select u.id as "usuarioId", u.status
    from communication.user_credential c join communication.app_user u on u.id = c.user_id
    where c.provider = ${identidad.proveedor} and c.subject = ${identidad.sujeto}
  `
  return fila === undefined ? null : { usuarioId: fila.usuarioId, estadoUsuario: estadoDe(fila.status) }
}

const buscarInvitacion = async (
  tx: TransactionSql,
  email: string,
): Promise<(InvitacionEncontrada & { readonly id: string }) | null> => {
  // `for update`: dos logins simultáneos con la misma invitación no la consumen dos veces.
  const [fila] = await tx<{ id: string; usuarioId: string; email: string; venceEn: Date; status: string }[]>`
    select i.id, i.user_id as "usuarioId", i.email, i.expires_at as "venceEn", u.status
    from communication.user_invitation i join communication.app_user u on u.id = i.user_id
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
 * Decide con `decidir` y aplica el login de una identidad que acaba de volver de Google.
 * Un VINCULA crea la credencial, consume la invitación y activa al usuario en la misma
 * transacción. Todo intento queda auditado, también los rechazados.
 */
export const ingresar = async (
  conexion: Conexion,
  identidad: IdentidadDeLogin,
  decidir: (credencial: CredencialEncontrada | null, invitacion: InvitacionEncontrada | null) => DecisionLogin,
): Promise<DecisionLogin> =>
  enTransaccion(conexion, async (tx) => {
    const credencial = await buscarCredencial(tx, identidad)
    const invitacion =
      credencial === null && identidad.email.trim() !== ''
        ? await buscarInvitacion(tx, normalizarEmail(identidad.email))
        : null
    const decision = decidir(credencial, invitacion)

    if (decision.tipo === 'VINCULA') {
      // Sólo se vincula a quien la invitación nombra: una decisión que dijera otra cosa
      // es un error de quien llama, no un acceso.
      if (invitacion?.usuarioId !== decision.usuarioId) {
        throw new Error('VINCULA sin una invitación para ese usuario')
      }
      await tx`
        insert into communication.user_credential (user_id, provider, subject)
        values (${decision.usuarioId}, ${identidad.proveedor}, ${identidad.sujeto})
      `
      await tx`update communication.user_invitation set consumed_at = now() where id = ${invitacion.id}`
      await tx`
        update communication.app_user set status = 'ACTIVE'
        where id = ${decision.usuarioId} and status = 'INVITED'
      `
    }
    if (decision.tipo === 'ENTRA' && credencial?.usuarioId !== decision.usuarioId) {
      throw new Error('ENTRA sin la credencial de ese usuario')
    }

    const rechazo = decision.tipo === 'RECHAZA'
    await auditar(tx, {
      actor: rechazo ? null : decision.usuarioId,
      origen: 'app',
      accion: decision.tipo === 'VINCULA' ? 'acceso.vincular' : 'acceso.ingresar',
      tipoObjeto: rechazo ? null : 'app_user',
      idObjeto: rechazo ? null : decision.usuarioId,
      resultado: rechazo ? 'denied' : 'ok',
      motivo: rechazo ? decision.motivo : null,
    })
    return decision
  })

// ── Cada request ──────────────────────────────────────────────────────────────

export type MotivoDenegado = 'SIN_CREDENCIAL' | 'SIN_ACCESO'

export type ResultadoPrincipal<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly motivo: MotivoDenegado }

/** El único rol con el que corren las consultas de datos en modo `oidc`. */
export const ROL_RESTRINGIDO = 'communication_app'

/**
 * Falla si la transacción no corre como `communication_app` con un principal declarado.
 * Una consulta que por error recibiera la conexión de la app, que es dueña de las tablas
 * y por eso no está sujeta a RLS, falla en vez de devolver todo.
 */
export const afirmarRestringida = async (tx: Conexion): Promise<void> => {
  const [fila] = await tx<{ rol: string; principal: string | null }[]>`
    select current_user as rol, communication.authz_usuario_declarado()::text as principal
  `
  if (fila?.rol !== ROL_RESTRINGIDO || fila.principal === null) {
    throw new Error('consulta de datos fuera de una transacción restringida (T-0035, D-0022)')
  }
}

/**
 * Corre `accion` como `communication_app`, con el principal declarado local a la
 * transacción. Si la persona no tiene credencial, fue dada de baja o no tiene rol,
 * `accion` no corre.
 *
 * `set local` y `set_config(…, true)` mueren con la transacción: con el pooler en modo
 * transacción, la conexión siguiente no hereda ni el rol ni el principal (D-0022).
 *
 * Dentro de una transacción ya abierta corre en un savepoint, y `set local` vive hasta el
 * final de la transacción de afuera. Por eso, al terminar sin error, se restauran el rol
 * y el principal que había antes. Si `accion` lanza, el savepoint se revierte con todo.
 */
export const conPrincipal = async <T>(
  conexion: Conexion,
  identidad: Pick<IdentidadDeLogin, 'proveedor' | 'sujeto'>,
  accion: (tx: TransactionSql, principal: PrincipalCommunication) => Promise<T>,
): Promise<ResultadoPrincipal<T>> =>
  enTransaccion(conexion, async (tx): Promise<ResultadoPrincipal<T>> => {
    const [previo] = await tx<{ rol: string; principal: string }[]>`
      select current_user as rol, coalesce(current_setting('authz.usuario_id', true), '') as principal
    `
    if (previo === undefined) throw new Error('sin estado previo de la transacción')

    const restaurar = async (): Promise<void> => {
      await tx`set local role ${tx(previo.rol)}`
      await tx`select set_config('authz.usuario_id', ${previo.principal}, true)`
    }

    const correr = async (): Promise<ResultadoPrincipal<T>> => {
      const credencial = await buscarCredencial(tx, identidad)
      if (credencial === null) return { ok: false, motivo: 'SIN_CREDENCIAL' }

      await tx`set local role communication_app`
      await tx`select set_config('authz.usuario_id', ${credencial.usuarioId}, true)`
      const [fila] = await tx<{ usuarioId: string | null; rol: Rol | null }[]>`
        select communication.authz_usuario() as "usuarioId", communication.authz_rol() as rol
      `
      if (fila?.usuarioId == null || fila.rol === null) return { ok: false, motivo: 'SIN_ACCESO' }

      await afirmarRestringida(tx)
      return { ok: true, valor: await accion(tx, { usuarioId: fila.usuarioId, rol: fila.rol }) }
    }

    const resultado = await correr()
    await restaurar()
    return resultado
  })
