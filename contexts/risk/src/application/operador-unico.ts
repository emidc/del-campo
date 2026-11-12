// Aprobación interna por operador único (D-0083, T-0041): lo que queda fuera de los casos de uso
// de la actualización.
//
// - `registrarRevisionIa` deja la revisión de IA de una versión: una evaluación, una acción o una
//   cobertura, que no se editan. La registra un Administrador activo desde la CLI `revision-ia`,
//   como los accesos. Sin ella, y sin 24 horas desde el registro de esa versión, el autor no la
//   aprueba (`actualizacion.ts` y la migración 0012).
// - `exigirEntregable` es la guarda de todo lo que salga hacia un cliente. Hoy Risk OS no tiene
//   exportación, publicación ni entrega: el primer canal que se agregue la llama antes de
//   producir nada. La lectura interna de Broker OS (`riesgosDeEmpresa`) no es una entrega.

import { RechazoActualizacion } from '../domain/actualizacion.ts'
import { ROTULO_APROBACION_INTERNA } from '../domain/permisos.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import { operar, type ResultadoAdmin } from './accesos.ts'

type Db = Sql | TransactionSql

const OBJETO = /^(EVA|ACC|TRF)-[0-9A-HJKMNP-TV-Z]{26}$/
const TABLA = { EVA: 'evaluacion', ACC: 'accion', TRF: 'transferencia' } as const

export interface PedidoRevisionIa {
  readonly actor: string
  /** El id de la versión revisada: `EVA-…`, `ACC-…` o `TRF-…`. */
  readonly objetoId: string
  readonly modelo: string
  readonly hallazgos: string
  readonly correcciones?: string | null
}

/** Registra la revisión de IA de una versión. No aprueba nada: la aprobación la hace una persona. */
export const registrarRevisionIa = (db: Db, p: PedidoRevisionIa): Promise<ResultadoAdmin<null>> => {
  const tabla = OBJETO.test(p.objetoId) ? TABLA[p.objetoId.slice(0, 3) as keyof typeof TABLA] : null
  return operar(db, p.actor, {
    accion: 'revision_ia.registrar',
    tipoObjeto: tabla ?? 'evaluacion',
    hacer: async (tx) => {
      if (tabla === null || (await tx`select 1 from ${tx(`risk.${tabla}`)} where id = ${p.objetoId}`).length === 0) {
        return { ok: false, motivo: 'OBJETO_INEXISTENTE' }
      }
      const modelo = p.modelo.trim()
      const hallazgos = p.hallazgos.trim()
      const correcciones = (p.correcciones ?? '').trim()
      if (modelo === '' || hallazgos === '') return { ok: false, motivo: 'REVISION_IA_INVALIDA' }
      await tx`
        insert into risk.revision_ia ${tx({
          [`${tabla}_id`]: p.objetoId, modelo, hallazgos, correcciones: correcciones === '' ? null : correcciones, registrada_por: p.actor,
        })}`
      return { ok: true, valor: null, idObjeto: p.objetoId }
    },
  })
}

/**
 * Rechaza una evaluación que no se puede exportar, publicar ni entregar al cliente: la que no
 * existe para quien pregunta y la que está aceptada sólo como aprobación interna por operador
 * único. Para entregarla la acepta otra persona (D-0083, DA-8). Se llama antes de producir nada.
 */
export async function exigirEntregable(db: Db, evaluacionId: string): Promise<void> {
  const [f] = await db<{ interna: boolean | null }[]>`
    select (select h.aprobacion_interna from risk.revision_humana h where h.evaluacion_id = e.id order by h.id desc limit 1) as interna
    from risk.evaluacion e where e.id = ${evaluacionId}`
  if (f === undefined) throw new RechazoActualizacion(`no existe la evaluación ${evaluacionId}`)
  if (f.interna === true) {
    throw new RechazoActualizacion(`${evaluacionId} tiene sólo ${ROTULO_APROBACION_INTERNA}: no se exporta, publica ni entrega al cliente sin que la acepte otra persona (D-0083)`)
  }
}
