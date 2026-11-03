// Administración de accesos de Broker OS: invitar, cambiar rol, dar de baja, asignar y
// desasignar clientes (D-0072, D-0027, ADR-0078). La usa la CLI de `cli.ts`; la interfaz
// web llega después. Cada operación:
//
// - exige un actor que sea Administrador ACTIVE, comprobado en la base y no confiado al
//   que llama. La única excepción es el arranque: sin ningún Administrador activo, se
//   puede invitar al primero sin actor, y queda auditado como tal;
// - corre en una transacción y deja un evento de auditoría, también cuando se rechaza.
//
// Nada acá envía correos ni toca sistemas externos: invitar es crear la fila. Avisarle a
// la persona es una comunicación externa que hace un humano (R-13, R-14).

import { normalizarEmail } from '@del-campo/identidad'
import type postgres from 'postgres'

import type { Conexion, Rol } from './base.ts'
import { auditar, enTransaccion } from './base.ts'

export const ROLES: readonly Rol[] = ['ADMINISTRADOR', 'OPERADOR', 'REVISOR']

export const esRol = (valor: string): valor is Rol => (ROLES as readonly string[]).includes(valor)

export type RechazoAdmin =
  | 'ACTOR_NO_AUTORIZADO'
  | 'EMAIL_INVALIDO'
  | 'DIAS_INVALIDOS'
  | 'YA_EXISTE'
  | 'USUARIO_INEXISTENTE'
  | 'CLIENTE_INEXISTENTE'
  | 'ASIGNACION_SUPERPUESTA'
  | 'ASIGNACION_INEXISTENTE'
  | 'ULTIMO_ADMINISTRADOR'

export type ResultadoAdmin<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly motivo: RechazoAdmin }

/** Vigencia de una invitación si no se indica otra. */
export const DIAS_INVITACION = 7

const DIA_MS = 24 * 60 * 60 * 1000

const rechazo = <T>(motivo: RechazoAdmin): ResultadoAdmin<T> => ({ ok: false, motivo })

const esAdministradorActivo = async (tx: postgres.TransactionSql, usuarioId: string): Promise<boolean> => {
  const filas = await tx`
    select 1 from app_user where id = ${usuarioId} and status = 'ACTIVE' and role = 'ADMINISTRADOR'
  `
  return filas.length === 1
}

const hayAdministradorActivo = async (tx: postgres.TransactionSql): Promise<boolean> => {
  const filas = await tx`select 1 from app_user where status = 'ACTIVE' and role = 'ADMINISTRADOR' limit 1`
  return filas.length === 1
}

interface Operacion<T> {
  readonly accion: string
  readonly tipoObjeto: string
  /** Lo que la operación hace una vez autorizado el actor. Devuelve el id del objeto. */
  readonly hacer: (tx: postgres.TransactionSql) => Promise<ResultadoAdmin<T> & { readonly idObjeto?: string }>
}

/**
 * Autoriza al actor, ejecuta y audita. Un rechazo de la operación revierte lo que haya
 * hecho y deja igual su evento, en una transacción aparte.
 */
const operar = async <T>(
  conexion: Conexion,
  actor: string | null,
  operacion: Operacion<T>,
  permitirArranque = false,
): Promise<ResultadoAdmin<T>> => {
  class Revertir extends Error {
    readonly resultado: ResultadoAdmin<T>
    constructor(resultado: ResultadoAdmin<T>) {
      super('revertir')
      this.resultado = resultado
    }
  }

  let resultado: ResultadoAdmin<T>
  let idObjeto: string | null = null
  try {
    resultado = await enTransaccion(conexion, async (tx) => {
      const autorizado =
        actor === null
          ? permitirArranque && !(await hayAdministradorActivo(tx))
          : await esAdministradorActivo(tx, actor)
      if (!autorizado) throw new Revertir(rechazo('ACTOR_NO_AUTORIZADO'))

      const hecho = await operacion.hacer(tx)
      if (!hecho.ok) throw new Revertir(hecho)
      idObjeto = hecho.idObjeto ?? null
      await auditar(tx, {
        actor,
        origen: 'cli',
        accion: operacion.accion,
        tipoObjeto: operacion.tipoObjeto,
        idObjeto,
        resultado: 'ok',
        motivo: actor === null ? 'ARRANQUE' : null,
      })
      return { ok: true, valor: hecho.valor } as const
    })
  } catch (error) {
    if (!(error instanceof Revertir)) throw error
    resultado = error.resultado
    if (!resultado.ok) {
      const motivo = resultado.motivo
      await enTransaccion(conexion, async (tx) => {
        await auditar(tx, {
          actor,
          origen: 'cli',
          accion: operacion.accion,
          tipoObjeto: operacion.tipoObjeto,
          idObjeto: null,
          resultado: 'denied',
          motivo,
        })
      })
    }
  }
  return resultado
}

const codigoPostgres = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined

// ── Operaciones ───────────────────────────────────────────────────────────────

export interface Invitacion {
  readonly usuarioId: string
  readonly invitacionId: string
  readonly venceEn: Date
}

/** Crea el usuario INVITED con su rol y una invitación vigente para su email. */
export const invitar = (
  conexion: Conexion,
  pedido: { readonly actor: string | null; readonly email: string; readonly rol: Rol; readonly dias?: number },
): Promise<ResultadoAdmin<Invitacion>> => {
  const email = normalizarEmail(pedido.email)
  const dias = pedido.dias ?? DIAS_INVITACION
  // Sólo el primer Administrador puede entrar sin actor: nadie arranca como Operador.
  const arranque = pedido.actor === null && pedido.rol === 'ADMINISTRADOR'
  return operar(
    conexion,
    pedido.actor,
    {
      accion: 'usuario.invitar',
      tipoObjeto: 'app_user',
      hacer: async (tx) => {
        if (!/^[^@\s]+@[^@\s]+$/.test(email)) return rechazo('EMAIL_INVALIDO')
        if (!Number.isInteger(dias) || dias < 1 || dias > 30) return rechazo('DIAS_INVALIDOS')
        const existentes = await tx`select 1 from app_user where email = ${email}`
        if (existentes.length > 0) return rechazo('YA_EXISTE')
        const venceEn = new Date(Date.now() + dias * DIA_MS)
        const [usuario] = await tx<{ id: string }[]>`
          insert into app_user (email, status, auth_provider, role)
          values (${email}, 'INVITED', 'google', ${pedido.rol}) returning id
        `
        if (usuario === undefined) throw new Error('insert sin fila')
        const [invitacion] = await tx<{ id: string }[]>`
          insert into user_invitation (user_id, email, expires_at, created_by)
          values (${usuario.id}, ${email}, ${venceEn}, ${pedido.actor}) returning id
        `
        if (invitacion === undefined) throw new Error('insert sin fila')
        return {
          ok: true,
          valor: { usuarioId: usuario.id, invitacionId: invitacion.id, venceEn },
          idObjeto: usuario.id,
        }
      },
    },
    arranque,
  )
}

/** Quedarse sin ningún Administrador activo dejaría el sistema sin quien administre. */
const dejariaSinAdministrador = async (tx: postgres.TransactionSql, usuarioId: string): Promise<boolean> => {
  const filas = await tx`
    select 1 from app_user
    where status = 'ACTIVE' and role = 'ADMINISTRADOR' and id <> ${usuarioId}
    limit 1
  `
  return filas.length === 0
}

export const cambiarRol = (
  conexion: Conexion,
  pedido: { readonly actor: string; readonly usuarioId: string; readonly rol: Rol },
): Promise<ResultadoAdmin<null>> =>
  operar(conexion, pedido.actor, {
    accion: 'usuario.cambiar_rol',
    tipoObjeto: 'app_user',
    hacer: async (tx) => {
      const [actual] = await tx<{ role: Rol | null }[]>`
        select role from app_user where id = ${pedido.usuarioId} for update
      `
      if (actual === undefined) return rechazo('USUARIO_INEXISTENTE')
      if (actual.role === 'ADMINISTRADOR' && pedido.rol !== 'ADMINISTRADOR' && (await dejariaSinAdministrador(tx, pedido.usuarioId))) {
        return rechazo('ULTIMO_ADMINISTRADOR')
      }
      await tx`update app_user set role = ${pedido.rol} where id = ${pedido.usuarioId}`
      return { ok: true, valor: null, idObjeto: pedido.usuarioId }
    },
  })

/**
 * La baja corta el acceso en el request siguiente: `authz.usuario()` deja de reconocer a
 * la persona aunque su cookie siga viva. Las invitaciones pendientes quedan sin efecto
 * porque `decidirLogin` rechaza a un usuario dado de baja.
 */
export const darDeBaja = (
  conexion: Conexion,
  pedido: { readonly actor: string; readonly usuarioId: string },
): Promise<ResultadoAdmin<null>> =>
  operar(conexion, pedido.actor, {
    accion: 'usuario.dar_de_baja',
    tipoObjeto: 'app_user',
    hacer: async (tx) => {
      const [actual] = await tx<{ role: Rol | null }[]>`
        select role from app_user where id = ${pedido.usuarioId} for update
      `
      if (actual === undefined) return rechazo('USUARIO_INEXISTENTE')
      if (actual.role === 'ADMINISTRADOR' && (await dejariaSinAdministrador(tx, pedido.usuarioId))) {
        return rechazo('ULTIMO_ADMINISTRADOR')
      }
      await tx`update app_user set status = 'INACTIVE' where id = ${pedido.usuarioId}`
      return { ok: true, valor: null, idObjeto: pedido.usuarioId }
    },
  })

/** Una asignación por cliente, desde ahora y sin fin (ADR-0078). */
export const asignarCliente = (
  conexion: Conexion,
  pedido: { readonly actor: string; readonly usuarioId: string; readonly clientePartyId: string },
): Promise<ResultadoAdmin<string>> =>
  operar(conexion, pedido.actor, {
    accion: 'cliente.asignar',
    tipoObjeto: 'client_assignment',
    hacer: async (tx) => {
      const usuarios = await tx`select 1 from app_user where id = ${pedido.usuarioId}`
      if (usuarios.length === 0) return rechazo('USUARIO_INEXISTENTE')
      const clientes = await tx`select 1 from party where id = ${pedido.clientePartyId}`
      if (clientes.length === 0) return rechazo('CLIENTE_INEXISTENTE')
      try {
        const [fila] = await tx<{ id: string }[]>`
          insert into client_assignment (user_id, client_party_id, assigned_by)
          values (${pedido.usuarioId}, ${pedido.clientePartyId}, ${pedido.actor}) returning id
        `
        if (fila === undefined) throw new Error('insert sin fila')
        return { ok: true, valor: fila.id, idObjeto: fila.id }
      } catch (error) {
        // 23P01: la exclusión GiST de 0007. Se traduce a un motivo; el resto se propaga.
        if (codigoPostgres(error) === '23P01') return rechazo('ASIGNACION_SUPERPUESTA')
        throw error
      }
    },
  })

/** Cierra una asignación vigente. No se borra: la historia queda (D-0027). */
export const cerrarAsignacion = (
  conexion: Conexion,
  pedido: { readonly actor: string; readonly asignacionId: string },
): Promise<ResultadoAdmin<null>> =>
  operar(conexion, pedido.actor, {
    accion: 'cliente.desasignar',
    tipoObjeto: 'client_assignment',
    hacer: async (tx) => {
      const filas = await tx`
        update client_assignment set valid = tstzrange(lower(valid), now(), '[)')
        where id = ${pedido.asignacionId} and upper_inf(valid) and lower(valid) < now()
        returning id
      `
      if (filas.length === 0) return rechazo('ASIGNACION_INEXISTENTE')
      return { ok: true, valor: null, idObjeto: pedido.asignacionId }
    },
  })
