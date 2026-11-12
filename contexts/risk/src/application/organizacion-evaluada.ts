// La organización evaluada y su correspondencia con la empresa de Broker OS (T-0036, C2; D-0067,
// D-0071). La administra un Administrador activo desde la CLI `organizacion`, como los accesos:
// cada operación se autoriza en la base, corre en una transacción y deja su evento de auditoría.
//
// - La ficha guarda sector, tamaño y zonas; la vigente es la última.
// - El vínculo guarda el id de la empresa de Broker OS, opaco. Se registra y después se verifica
//   a mano; hasta verificarlo está pendiente y Broker OS no ve riesgos de esa empresa. Nada se
//   empareja solo, ni por nombre ni por CUIT (D-0071).
// - Una organización tiene como mucho una empresa, y una empresa como mucho una organización.

import type { Sql, TransactionSql } from '../persistence/database.ts'
import { operar, type ResultadoAdmin } from './accesos.ts'

type Db = Sql | TransactionSql

const EMPRESA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const rechazo = <T>(motivo: Extract<ResultadoAdmin<T>, { ok: false }>['motivo']): ResultadoAdmin<T> => ({ ok: false, motivo })

const textoValido = (t: string, max = 100): boolean => t.trim() === t && t.length >= 1 && t.length <= max && !/\p{Cc}/u.test(t)

/** Sólo una organización con riesgos registrados: un id mal escrito no crea una organización nueva. */
const organizacionExiste = async (tx: TransactionSql, org: string): Promise<boolean> =>
  textoValido(org, 200) && (await tx`select 1 from risk.riesgo where organizacion_id = ${org} limit 1`).length === 1

export interface FichaOrganizacion {
  readonly sector: string | null
  readonly tamano: string | null
  readonly zonas: readonly string[]
}

/** Registra la ficha vigente de una organización. */
export const registrarFicha = (
  db: Db, p: { readonly actor: string; readonly organizacionId: string } & FichaOrganizacion,
): Promise<ResultadoAdmin<null>> =>
  operar(db, p.actor, {
    accion: 'organizacion.ficha',
    tipoObjeto: 'organizacion',
    hacer: async (tx) => {
      if (!(await organizacionExiste(tx, p.organizacionId))) return rechazo('ORGANIZACION_INVALIDA')
      const zonas = [...new Set(p.zonas)]
      const valida = (p.sector === null || textoValido(p.sector)) && (p.tamano === null || textoValido(p.tamano))
        && zonas.length <= 50 && zonas.every((z) => textoValido(z))
      if (!valida) return rechazo('FICHA_INVALIDA')
      await tx`
        insert into risk.organizacion_ficha (organizacion_id, sector, tamano, zonas, autor_persona_id)
        values (${p.organizacionId}, ${p.sector}, ${p.tamano}, ${tx.array(zonas, 25)}, ${p.actor})`
      return { ok: true, valor: null, idObjeto: p.organizacionId }
    },
  })

interface VinculoVigente {
  readonly id: string
  readonly empresaId: string | null
  readonly verificado: boolean
}

const vinculoVigente = async (tx: Db, org: string): Promise<VinculoVigente | null> => {
  const [f] = await tx<{ id: string; empresa_id: string | null; verificado: boolean }[]>`
    select v.id::text, v.empresa_id, exists (select 1 from risk.vinculo_verificado w where w.vinculo_id = v.id) as verificado
    from risk.vinculo_empresa v where v.organizacion_id = ${org} order by v.id desc limit 1`
  return f === undefined ? null : { id: f.id, empresaId: f.empresa_id, verificado: f.verificado }
}

/** La organización cuyo vínculo vigente es con esa empresa, verificado o no. */
const organizacionVinculada = async (tx: Db, empresaId: string): Promise<string | null> => {
  const [f] = await tx<{ organizacion_id: string }[]>`
    select v.organizacion_id from risk.vinculo_empresa v
    where v.empresa_id = ${empresaId}
      and v.id = (select max(u.id) from risk.vinculo_empresa u where u.organizacion_id = v.organizacion_id)
    limit 1`
  return f?.organizacion_id ?? null
}

/** Registra el vínculo con una empresa, pendiente hasta verificarlo. `null` quita el vínculo. */
export const vincular = (
  db: Db, p: { readonly actor: string; readonly organizacionId: string; readonly empresaId: string | null },
): Promise<ResultadoAdmin<null>> =>
  operar(db, p.actor, {
    accion: p.empresaId === null ? 'organizacion.desvincular' : 'organizacion.vincular',
    tipoObjeto: 'organizacion',
    hacer: async (tx) => {
      if (!(await organizacionExiste(tx, p.organizacionId))) return rechazo('ORGANIZACION_INVALIDA')
      const vigente = await vinculoVigente(tx, p.organizacionId)
      if (p.empresaId === null) {
        if (vigente?.empresaId == null) return rechazo('SIN_VINCULO')
      } else {
        if (!EMPRESA.test(p.empresaId)) return rechazo('EMPRESA_INVALIDA')
        const otra = await organizacionVinculada(tx, p.empresaId)
        if (otra !== null && otra !== p.organizacionId) return rechazo('EMPRESA_YA_VINCULADA')
        if (vigente?.empresaId === p.empresaId) return { ok: true, valor: null, idObjeto: p.organizacionId }
      }
      await tx`
        insert into risk.vinculo_empresa (organizacion_id, empresa_id, autor_persona_id)
        values (${p.organizacionId}, ${p.empresaId}, ${p.actor})`
      return { ok: true, valor: null, idObjeto: p.organizacionId }
    },
  })

/** Confirma el vínculo vigente de una organización. Desde ahí Broker OS ve sus riesgos. */
export const verificarVinculo = (db: Db, p: { readonly actor: string; readonly organizacionId: string }): Promise<ResultadoAdmin<null>> =>
  operar(db, p.actor, {
    accion: 'organizacion.verificar_vinculo',
    tipoObjeto: 'organizacion',
    hacer: async (tx) => {
      const vigente = await vinculoVigente(tx, p.organizacionId)
      if (vigente?.empresaId == null) return rechazo('SIN_VINCULO')
      if (!vigente.verificado) {
        await tx`insert into risk.vinculo_verificado (vinculo_id, autor_persona_id) values (${vigente.id}, ${p.actor})`
      }
      return { ok: true, valor: null, idObjeto: p.organizacionId }
    },
  })

export interface OrganizacionEvaluada extends FichaOrganizacion {
  readonly organizacionId: string
  /** `sin_vinculo`: nadie la vinculó; `pendiente`: vinculada sin verificar. */
  readonly vinculo: 'sin_vinculo' | 'pendiente' | 'verificado'
  readonly empresaId: string | null
}

/** Cada organización con riesgos, con su ficha vigente y el estado de su vínculo. */
export const organizacionesEvaluadas = async (db: Db): Promise<OrganizacionEvaluada[]> => {
  const filas = await db<{ organizacion_id: string; sector: string | null; tamano: string | null; zonas: string[] | null; empresa_id: string | null; verificado: boolean | null }[]>`
    with orgs as (select distinct organizacion_id from risk.riesgo),
    ficha as (select distinct on (organizacion_id) * from risk.organizacion_ficha order by organizacion_id, id desc),
    vinculo as (select distinct on (organizacion_id) * from risk.vinculo_empresa order by organizacion_id, id desc)
    select o.organizacion_id, f.sector, f.tamano, f.zonas, v.empresa_id,
           exists (select 1 from risk.vinculo_verificado w where w.vinculo_id = v.id) as verificado
    from orgs o left join ficha f using (organizacion_id) left join vinculo v using (organizacion_id)
    order by o.organizacion_id`
  return filas.map((f) => ({
    organizacionId: f.organizacion_id,
    sector: f.sector,
    tamano: f.tamano,
    zonas: f.zonas ?? [],
    empresaId: f.empresa_id,
    vinculo: f.empresa_id === null ? 'sin_vinculo' : f.verificado === true ? 'verificado' : 'pendiente',
  }))
}

export interface VinculoDeEmpresa {
  readonly organizacionId: string
  readonly estado: 'pendiente' | 'verificado'
}

/**
 * El vínculo vigente de una empresa de Broker OS, pendiente o verificado; `null` si no tiene. Con
 * la transacción de una persona, RLS oculta las organizaciones que no ve: una no asignada responde
 * lo mismo que una empresa sin vínculo. Es la lectura de C4-03a.
 */
export const vinculoDeEmpresa = async (db: Db, empresaId: string): Promise<VinculoDeEmpresa | null> => {
  if (!EMPRESA.test(empresaId)) return null
  const organizacionId = await organizacionVinculada(db, empresaId)
  if (organizacionId === null) return null
  const vigente = await vinculoVigente(db, organizacionId)
  return vigente === null ? null : { organizacionId, estado: vigente.verificado ? 'verificado' : 'pendiente' }
}

/**
 * La organización evaluada de una empresa de Broker OS, sólo con el vínculo vigente y verificado;
 * `null` si no tiene o está pendiente. Es la lectura que va a usar la proyección de C4.
 */
export const organizacionDeEmpresa = async (db: Db, empresaId: string): Promise<OrganizacionEvaluada | null> => {
  if (!EMPRESA.test(empresaId)) return null
  const org = await organizacionVinculada(db, empresaId)
  if (org === null) return null
  return (await organizacionesEvaluadas(db)).find((o) => o.organizacionId === org && o.vinculo === 'verificado') ?? null
}
