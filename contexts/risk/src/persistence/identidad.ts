// Admisión de Risk OS en la base con AUTH_MODE=oidc (T-0035, D-0022, D-0077). Tiene la misma
// forma que la de Broker OS y la de Communication OS, escrita de nuevo acá porque el contexto no
// importa nada de otro (R-25, D-0063). La diferencia es que la persona ya existe: es la
// `risk.persona` de siempre, la autora de todo lo registrado con contraseña, y la identidad de
// Google se le vincula por invitación. Así la autoría histórica se conserva.
//
// Dos momentos:
//
// - **Al volver de Google** (`ingresar`): la identidad (proveedor, sujeto) se busca entre las
//   credenciales externas y, si no está, entre las invitaciones vigentes para ese email. La regla
//   la decide quien llama con `decidirLogin` de `@del-campo/identidad`, que la app puede importar
//   y el contexto no. Acá se leen sus entradas y se aplica su resultado, en una transacción y con
//   su evento de auditoría. Un ingreso deja además su `inicio_sesion` en `registro_acceso`, igual
//   que el login con contraseña (A8a).
// - **En cada request** (`conPrincipal`): se resuelve la persona, se asume `risk_persona` y se
//   declara el principal local a la transacción. Desde ahí deciden las políticas RLS y
//   `authz_persona()`, que exige una credencial externa y un rol vigente: una baja corta el acceso
//   en el request siguiente.
//
// Todo es de sólo inserción, como el resto del esquema: vincular es insertar la credencial, y la
// invitación queda consumida porque una credencial la nombra.

import type { RolInterno } from '../domain/permisos.ts'
import type { Sql, TransactionSql } from './database.ts'

type Db = Sql | TransactionSql

export type EstadoPersona = 'INVITADO' | 'ACTIVO' | 'BAJA'

/** Lo que identifica a una persona: el par (proveedor, sujeto) de D-0077, y su email. */
export interface IdentidadDeLogin {
  readonly proveedor: 'google'
  readonly sujeto: string
  readonly email: string
}

/** Compatibles con los tipos de `@del-campo/identidad`, con `usuarioId` = el id de la persona. */
export interface CredencialEncontrada {
  readonly usuarioId: string
  readonly estadoUsuario: EstadoPersona
}

export interface InvitacionEncontrada {
  readonly usuarioId: string
  readonly email: string
  readonly venceEn: number
  readonly estadoUsuario: EstadoPersona
}

export type DecisionLogin =
  | { readonly tipo: 'ENTRA' | 'VINCULA'; readonly usuarioId: string }
  | { readonly tipo: 'RECHAZA'; readonly motivo: string }

/** Quién consulta, una vez admitido en la base. Sólo lo construye `conPrincipal`. */
export interface PrincipalRisk {
  readonly personaId: string
  readonly nombre: string
  readonly rol: RolInterno
  /** La credencial externa con que entró, como `google:<id>`. */
  readonly credencialId: string
}

/** Abre una transacción, o un savepoint si ya hay una: las pruebas corren todo dentro de una que revierten. */
export const enTransaccion = <T>(db: Db, accion: (tx: TransactionSql) => Promise<T>): Promise<T> =>
  ('savepoint' in db ? db.savepoint(accion) : db.begin(accion)) as Promise<T>

export const normalizarEmail = (valor: string): string => valor.trim().toLowerCase()

/**
 * El estado de una persona en `oidc`, derivado de filas de sólo inserción: de baja si su último
 * rol es la baja; activa si además tiene su credencial externa; si no, invitada.
 */
const estadoDe = (rol: string | null, conCredencial: boolean): EstadoPersona =>
  rol === null ? 'BAJA' : conCredencial ? 'ACTIVO' : 'INVITADO'

// ── Auditoría ─────────────────────────────────────────────────────────────────

export type Origen = 'app' | 'cli'

/** Un evento estructurado y mínimo: quién, qué, sobre qué y con qué resultado. Sin payloads (0006). */
export interface EventoDeAuditoria {
  readonly actor: string | null
  readonly origen: Origen
  readonly accion: string
  readonly tipoObjeto: string | null
  readonly idObjeto: string | null
  readonly resultado: 'ok' | 'denied' | 'error'
  readonly motivo: string | null
}

export const auditar = async (db: Db, evento: EventoDeAuditoria): Promise<void> => {
  await db`
    insert into risk.evento_auditoria (actor_persona_id, origen, accion, tipo_objeto, id_objeto, resultado, motivo)
    values (${evento.actor}, ${evento.origen}, ${evento.accion}, ${evento.tipoObjeto}, ${evento.idObjeto},
            ${evento.resultado}, ${evento.motivo})`
}

// ── Login ─────────────────────────────────────────────────────────────────────

interface FilaCredencial {
  readonly id: string
  readonly personaId: string
  readonly rol: string | null
}

const buscarCredencial = async (db: Db, identidad: Pick<IdentidadDeLogin, 'proveedor' | 'sujeto'>): Promise<FilaCredencial | null> => {
  const [f] = await db<{ id: string; personaId: string; rol: string | null }[]>`
    select id, persona_id as "personaId", rol from risk.admision_credencial(${identidad.proveedor}, ${identidad.sujeto})`
  return f ?? null
}

/** La última invitación sin consumir para ese email, con el estado de su persona. */
const buscarInvitacion = async (tx: TransactionSql, email: string): Promise<(InvitacionEncontrada & { readonly id: string }) | null> => {
  // Dos logins a la vez con la misma invitación: el segundo espera y después la ve consumida (0009).
  const [f] = await tx<{ id: string; personaId: string; email: string; venceEn: Date; rol: string | null; conCredencial: boolean }[]>`
    select id, persona_id as "personaId", email, vence_en as "venceEn", rol, con_credencial as "conCredencial"
    from risk.admision_invitacion(${email})`
  if (f === undefined) return null
  return {
    id: f.id, usuarioId: f.personaId, email: f.email, venceEn: f.venceEn.getTime(), estadoUsuario: estadoDe(f.rol, f.conCredencial),
  }
}

/**
 * Decide con `decidir` y aplica el login de una identidad que acaba de volver de Google. Un
 * VINCULA crea la credencial externa de la persona que nombra la invitación, y con eso la
 * consume. Todo intento queda auditado, también los rechazados.
 */
export const ingresar = async (
  db: Db,
  identidad: IdentidadDeLogin,
  decidir: (credencial: CredencialEncontrada | null, invitacion: InvitacionEncontrada | null) => DecisionLogin,
): Promise<DecisionLogin> =>
  enTransaccion(db, async (tx) => {
    await afirmarConexionOidc(tx)
    const fila = await buscarCredencial(tx, identidad)
    const credencial = fila === null ? null : { usuarioId: fila.personaId, estadoUsuario: estadoDe(fila.rol, true) }
    const invitacion =
      credencial === null && identidad.email.trim() !== '' ? await buscarInvitacion(tx, normalizarEmail(identidad.email)) : null
    const decision = decidir(credencial, invitacion)

    // Sólo se vincula a quien la invitación nombra: otra cosa es un error de quien llama.
    if (decision.tipo === 'VINCULA' && invitacion?.usuarioId !== decision.usuarioId) throw new Error('VINCULA sin una invitación para esa persona')
    if (decision.tipo === 'ENTRA' && credencial?.usuarioId !== decision.usuarioId) throw new Error('ENTRA sin la credencial de esa persona')

    if (decision.tipo === 'RECHAZA') {
      await auditar(tx, {
        actor: null, origen: 'app', accion: 'acceso.ingresar', tipoObjeto: null, idObjeto: null, resultado: 'denied', motivo: decision.motivo,
      })
    } else {
      // La base vuelve a comprobar la decisión y escribe el vínculo, el `inicio_sesion` (A8a) y
      // el evento, todo o nada (0009).
      const invitacionId = decision.tipo === 'VINCULA' ? (invitacion?.id ?? null) : null
      await tx`
        select risk.admision_registrar(${decision.usuarioId}, ${identidad.proveedor}, ${identidad.sujeto},
                                       ${normalizarEmail(identidad.email)}, ${invitacionId}::bigint)`
    }
    return decision
  })

// ── Cada request ──────────────────────────────────────────────────────────────

export type MotivoDenegado = 'SIN_CREDENCIAL' | 'SIN_ACCESO'

export type ResultadoPrincipal<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly motivo: MotivoDenegado }

/** El único rol con el que corren las consultas de una persona en modo `oidc`. */
export const ROL_RESTRINGIDO = 'risk_persona'

/**
 * El rol de conexión del modo `oidc` (0009). No lee ninguna tabla y no pasa por
 * `legado_risk_app`: admite con las funciones `admision_*` y después asume `risk_persona`.
 */
export const ROL_CONEXION_OIDC = 'risk_oidc'

const CONEXION_NO_OIDC = `el modo oidc corre sólo con la conexión de ${ROL_CONEXION_OIDC} (T-0035)`

/**
 * Falla si la conexión no es la de `oidc`. Con la de `legacy` (`risk_app`, que ve todo por
 * `legado_risk_app`) o la del dueño (exento de RLS), una consulta fuera de la transacción
 * restringida leería sin RLS: por eso el camino `oidc` no corre con ellas, ni siquiera mal
 * configurado (T-0035, decisión del owner del 2026-11-04).
 */
export const afirmarConexionOidc = async (db: Db): Promise<void> => {
  const [f] = await db<{ rol: string }[]>`select current_user as rol`
  if (f?.rol !== ROL_CONEXION_OIDC) throw new Error(CONEXION_NO_OIDC)
}

/**
 * Falla si la transacción no corre como `risk_persona` con un principal declarado. Una consulta
 * que por error recibiera la conexión de la app, que no está sujeta a RLS (el dueño) o pasa por
 * `legado_risk_app`, falla en vez de devolver todo.
 */
export const afirmarRestringida = async (db: Db): Promise<void> => {
  const [f] = await db<{ rol: string; principal: string | null }[]>`
    select current_user as rol, risk.authz_persona_declarada() as principal`
  if (f?.rol !== ROL_RESTRINGIDO || f.principal === null) {
    throw new Error('consulta de datos fuera de una transacción restringida (T-0035, D-0022)')
  }
}

/**
 * Corre `accion` como `risk_persona`, con el principal declarado local a la transacción. Si la
 * persona no tiene credencial externa, fue dada de baja o no tiene rol, `accion` no corre.
 *
 * `set local` y `set_config(…, true)` mueren con la transacción: con el pooler en modo
 * transacción, la conexión siguiente no hereda ni el rol ni el principal (D-0022). Dentro de una
 * transacción ya abierta corre en un savepoint y, al terminar sin error, restaura el rol y el
 * principal que había. Si `accion` lanza, el savepoint se revierte con todo.
 */
export const conPrincipal = async <T>(
  db: Db,
  identidad: Pick<IdentidadDeLogin, 'proveedor' | 'sujeto'>,
  accion: (tx: TransactionSql, principal: PrincipalRisk) => Promise<T>,
): Promise<ResultadoPrincipal<T>> =>
  enTransaccion(db, async (tx): Promise<ResultadoPrincipal<T>> => {
    const [previo] = await tx<{ rol: string; principal: string }[]>`
      select current_user as rol, coalesce(current_setting('authz.persona_id', true), '') as principal`
    if (previo === undefined) throw new Error('sin estado previo de la transacción')
    if (previo.rol !== ROL_CONEXION_OIDC) throw new Error(CONEXION_NO_OIDC)
    const restaurar = async (): Promise<void> => {
      await tx`set local role ${tx(previo.rol)}`
      await tx`select set_config('authz.persona_id', ${previo.principal}, true)`
    }

    const correr = async (): Promise<ResultadoPrincipal<T>> => {
      const credencial = await buscarCredencial(tx, identidad)
      if (credencial === null) return { ok: false, motivo: 'SIN_CREDENCIAL' }

      await tx`set local role risk_persona`
      await tx`select set_config('authz.persona_id', ${credencial.personaId}, true)`
      const [f] = await tx<{ personaId: string | null; rol: RolInterno | null; nombre: string | null }[]>`
        select risk.authz_persona() as "personaId", risk.authz_rol() as rol,
               (select p.nombre from risk.persona p where p.id = risk.authz_persona()) as nombre`
      if (f?.personaId == null || f.rol === null || f.nombre === null) return { ok: false, motivo: 'SIN_ACCESO' }

      await afirmarRestringida(tx)
      return { ok: true, valor: await accion(tx, { personaId: f.personaId, nombre: f.nombre, rol: f.rol, credencialId: `google:${credencial.id}` }) }
    }

    const resultado = await correr()
    await restaurar()
    return resultado
  })
