// Administración de accesos de Risk OS con AUTH_MODE=oidc (D-0072, T-0035): invitar, cambiar el
// rol, dar de baja y asignar organizaciones. La usa la CLI de `cli-acceso.ts`; la app no tiene
// pantalla para esto. Es la misma forma que la de Broker OS y la de Communication OS, con dos
// diferencias propias de Risk OS:
//
// - la persona ya existe: una invitación puede nombrar una `risk.persona` de siempre, para que su
//   primer login con Google se vincule a ella y lo que registró con contraseña siga siendo suyo
//   (plan de migración, fase 4). Sólo para alguien nuevo se crea una persona;
// - todo es de sólo inserción: un cambio de rol, una baja o una asignación es una fila nueva.
//
// Cada operación:
//
// - exige un actor que sea Administrador activo (rol vigente y credencial externa), comprobado en
//   la base y no confiado al que llama. La única excepción es el arranque: sin ningún
//   Administrador activo, se puede invitar al primero sin actor, y queda auditado como tal;
// - corre en una transacción y deja su evento de auditoría, también cuando se rechaza.
//
// Nada acá envía correos ni toca sistemas externos: invitar es crear filas. Avisarle a la persona
// es una comunicación externa que hace un humano (R-13, R-14).

import { esRol, ROLES, type RolInterno } from '../domain/permisos.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { auditar, enTransaccion, normalizarEmail } from '../persistence/identidad.ts'
import { ulid } from './personas.ts'

type Db = Sql | TransactionSql

export { esRol, ROLES }

export type RechazoAdmin =
  | 'ACTOR_NO_AUTORIZADO'
  | 'EMAIL_INVALIDO'
  | 'DIAS_INVALIDOS'
  | 'NOMBRE_INVALIDO'
  | 'PERSONA_INEXISTENTE'
  | 'YA_VINCULADA'
  | 'ORGANIZACION_INVALIDA'
  | 'ULTIMO_ADMINISTRADOR'

export type ResultadoAdmin<T> = { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly motivo: RechazoAdmin }

/** Vigencia de una invitación si no se indica otra. */
export const DIAS_INVITACION = 7
const DIA_MS = 24 * 60 * 60 * 1000
const PERSONA = /^PER-[0-9A-HJKMNP-TV-Z]{26}$/

const rechazo = <T>(motivo: RechazoAdmin): ResultadoAdmin<T> => ({ ok: false, motivo })

const ADMIN_ACTIVO = `
  select p.id from risk.persona p
  where (select r.rol from risk.rol_persona r where r.persona_id = p.id order by r.id desc limit 1) = 'ADMINISTRADOR'
    and exists (select 1 from risk.credencial_externa c where c.persona_id = p.id)`

const esAdministradorActivo = async (tx: TransactionSql, personaId: string): Promise<boolean> =>
  (await tx.unsafe(`${ADMIN_ACTIVO} and p.id = $1`, [personaId])).length === 1

const administradoresActivos = async (tx: TransactionSql): Promise<string[]> =>
  (await tx.unsafe<{ id: string }[]>(ADMIN_ACTIVO)).map((f) => f.id)

const personaExiste = async (tx: TransactionSql, personaId: string): Promise<boolean> =>
  (await tx`select 1 from risk.persona where id = ${personaId}`).length === 1

interface Operacion<T> {
  readonly accion: string
  /** Lo que la operación hace una vez autorizado el actor. Devuelve el id del objeto. */
  readonly hacer: (tx: TransactionSql) => Promise<ResultadoAdmin<T> & { readonly idObjeto?: string }>
}

/** Autoriza al actor, ejecuta y audita. Un rechazo revierte lo hecho y deja su evento aparte. */
const operar = async <T>(db: Db, actor: string | null, operacion: Operacion<T>, permitirArranque = false): Promise<ResultadoAdmin<T>> => {
  class Revertir extends Error {
    readonly resultado: ResultadoAdmin<T>
    constructor(resultado: ResultadoAdmin<T>) {
      super('revertir')
      this.resultado = resultado
    }
  }

  let resultado: ResultadoAdmin<T>
  try {
    resultado = await enTransaccion(db, async (tx) => {
      // Las operaciones de acceso se serializan: dos bajas simultáneas no dejan sin Administrador.
      await tx`select pg_advisory_xact_lock(hashtextextended('risk.accesos', 0))`
      const autorizado = actor === null
        ? permitirArranque && (await administradoresActivos(tx)).length === 0
        : PERSONA.test(actor) && (await esAdministradorActivo(tx, actor))
      if (!autorizado) throw new Revertir(rechazo('ACTOR_NO_AUTORIZADO'))
      const hecho = await operacion.hacer(tx)
      if (!hecho.ok) throw new Revertir(hecho)
      await auditar(tx, {
        actor, origen: 'cli', accion: operacion.accion, tipoObjeto: 'persona', idObjeto: hecho.idObjeto ?? null,
        resultado: 'ok', motivo: actor === null ? 'ARRANQUE' : null,
      })
      return { ok: true, valor: hecho.valor } as const
    })
  } catch (error) {
    if (!(error instanceof Revertir)) throw error
    resultado = error.resultado
    if (!resultado.ok) {
      const motivo = resultado.motivo
      await enTransaccion(db, (tx) => auditar(tx, {
        actor: actor !== null && PERSONA.test(actor) ? actor : null, origen: 'cli', accion: operacion.accion, tipoObjeto: 'persona',
        idObjeto: null, resultado: 'denied', motivo,
      }))
    }
  }
  return resultado
}

export interface Invitacion {
  readonly personaId: string
  readonly invitacionId: string
  readonly venceEn: Date
}

export interface PedidoInvitacion {
  readonly actor: string | null
  readonly email: string
  readonly rol: RolInterno
  /** Una persona que ya usa Risk OS: se le vincula su cuenta de Google y conserva su autoría. */
  readonly personaId?: string
  /** Para alguien nuevo: se crea su persona con este nombre. */
  readonly nombre?: string
  readonly dias?: number
}

/**
 * Invita a una persona: la existente (`personaId`) o una nueva (`nombre`), con su rol y una
 * invitación vigente para su email. El rol rige desde que entra con Google.
 */
export const invitar = (db: Db, p: PedidoInvitacion): Promise<ResultadoAdmin<Invitacion>> => {
  const email = normalizarEmail(p.email)
  const dias = p.dias ?? DIAS_INVITACION
  // Sólo el primer Administrador puede entrar sin actor: nadie arranca como Operador o Revisor.
  const arranque = p.actor === null && p.rol === 'ADMINISTRADOR'
  return operar(db, p.actor, {
    accion: 'persona.invitar',
    hacer: async (tx) => {
      if (!/^[^@\s]+@[^@\s]+$/.test(email)) return rechazo('EMAIL_INVALIDO')
      if (!Number.isInteger(dias) || dias < 1 || dias > 30) return rechazo('DIAS_INVALIDOS')
      if (!esRol(p.rol)) return rechazo('ACTOR_NO_AUTORIZADO')
      let personaId: string
      if (p.personaId !== undefined) {
        if (!PERSONA.test(p.personaId) || !(await personaExiste(tx, p.personaId))) return rechazo('PERSONA_INEXISTENTE')
        personaId = p.personaId
        const vinculada = await tx`select 1 from risk.credencial_externa where persona_id = ${personaId}`
        if (vinculada.length > 0) return rechazo('YA_VINCULADA')
      } else {
        const nombre = (p.nombre ?? '').trim()
        if (nombre === '' || nombre.length > 200) return rechazo('NOMBRE_INVALIDO')
        personaId = `PER-${ulid()}`
        await tx`insert into risk.persona (id, nombre) values (${personaId}, ${nombre})`
      }
      const venceEn = new Date(Date.now() + dias * DIA_MS)
      const [inv] = await tx<{ id: string }[]>`
        insert into risk.invitacion (persona_id, email, vence_en, autor_persona_id)
        values (${personaId}, ${email}, ${venceEn}, ${p.actor}) returning id::text`
      await tx`insert into risk.rol_persona (persona_id, rol, autor_persona_id) values (${personaId}, ${p.rol}, ${p.actor})`
      if (inv === undefined) throw new Error('la invitación no se escribió')
      return { ok: true, valor: { personaId, invitacionId: inv.id, venceEn }, idObjeto: personaId }
    },
  }, arranque)
}

/** El rol vigente de una persona; `null` si está de baja o nunca tuvo uno. */
const rolVigente = async (tx: TransactionSql, personaId: string): Promise<string | null> => {
  const [f] = await tx<{ rol: string | null }[]>`
    select rol from risk.rol_persona where persona_id = ${personaId} order by id desc limit 1`
  return f?.rol ?? null
}

/** Nunca queda sin Administrador activo: ni un cambio de rol ni una baja se llevan al último. */
const dejaSinAdministrador = async (tx: TransactionSql, personaId: string): Promise<boolean> => {
  const admins = await administradoresActivos(tx)
  return admins.length === 1 && admins[0] === personaId
}

/** Cambia el rol de una persona; vale desde su request siguiente. */
export const cambiarRol = (db: Db, p: { readonly actor: string; readonly personaId: string; readonly rol: RolInterno }): Promise<ResultadoAdmin<null>> =>
  operar(db, p.actor, {
    accion: 'persona.cambiar_rol',
    hacer: async (tx) => {
      if (!PERSONA.test(p.personaId) || !(await personaExiste(tx, p.personaId))) return rechazo('PERSONA_INEXISTENTE')
      if (p.rol !== 'ADMINISTRADOR' && (await dejaSinAdministrador(tx, p.personaId))) return rechazo('ULTIMO_ADMINISTRADOR')
      await tx`insert into risk.rol_persona (persona_id, rol, autor_persona_id) values (${p.personaId}, ${p.rol}, ${p.actor})`
      return { ok: true, valor: null, idObjeto: p.personaId }
    },
  })

/**
 * Baja: una fila sin rol. La persona no entra y su sesión abierta deja de valer en el request
 * siguiente. Lo que escribió queda, con su autoría.
 */
export const darDeBaja = (db: Db, p: { readonly actor: string; readonly personaId: string }): Promise<ResultadoAdmin<null>> =>
  operar(db, p.actor, {
    accion: 'persona.dar_de_baja',
    hacer: async (tx) => {
      if (!PERSONA.test(p.personaId) || !(await personaExiste(tx, p.personaId))) return rechazo('PERSONA_INEXISTENTE')
      if (await dejaSinAdministrador(tx, p.personaId)) return rechazo('ULTIMO_ADMINISTRADOR')
      if ((await rolVigente(tx, p.personaId)) !== null) {
        await tx`insert into risk.rol_persona (persona_id, rol, autor_persona_id) values (${p.personaId}, null, ${p.actor})`
      }
      return { ok: true, valor: null, idObjeto: p.personaId }
    },
  })

/**
 * Asigna (o quita) una organización a una persona, una por una (D-0027). La carga inicial de toda
 * la cartera para un Operador es una asignación por organización, nunca un acceso universal.
 */
export const asignar = (
  db: Db, p: { readonly actor: string; readonly personaId: string; readonly organizacionId: string; readonly vigente: boolean },
): Promise<ResultadoAdmin<null>> =>
  operar(db, p.actor, {
    accion: p.vigente ? 'persona.asignar' : 'persona.desasignar',
    hacer: async (tx) => {
      if (!PERSONA.test(p.personaId) || !(await personaExiste(tx, p.personaId))) return rechazo('PERSONA_INEXISTENTE')
      const org = p.organizacionId
      if (org.length === 0 || org.length > 200 || org.trim() !== org || /\p{Cc}/u.test(org)) return rechazo('ORGANIZACION_INVALIDA')
      await tx`
        insert into risk.asignacion (persona_id, organizacion_id, vigente, autor_persona_id)
        values (${p.personaId}, ${org}, ${p.vigente}, ${p.actor})`
      return { ok: true, valor: null, idObjeto: p.personaId }
    },
  })
