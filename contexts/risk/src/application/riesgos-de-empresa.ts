// Los riesgos de una empresa de Broker OS, para su ficha (C4-03a; D-0071, diseño en
// docs/desarrollo/riesgos-en-la-ficha.md §2). Corre como la persona del token: RLS decide qué
// ve, y una organización que no tiene asignada responde igual que una empresa sin vínculo.
//
// Es una proyección de la lista (`vistaLista`), con sus mismas reglas: el orden previo del
// Revisor y el registro de acceso a resultados. No lleva `C_raw`, el vector ni evaluaciones:
// eso sólo se ve en el detalle de Risk OS (H6).

import type { Banda } from '../domain/metodologia.ts'
import type { TipoObjeto, VersionFunciones } from '../domain/modelo.ts'
import { exigirPermiso } from '../domain/permisos.ts'
import type { Sql, TransactionSql } from '../persistence/database.ts'
import type { Sesion } from './acceso.ts'
import { vinculoDeEmpresa, type FichaOrganizacion } from './organizacion-evaluada.ts'
import { vistaLista } from './vistas.ts'

type Db = Sql | TransactionSql

export interface RiesgoDeEmpresa {
  readonly riskId: string
  readonly titulo: string
  readonly tipoObjeto: TipoObjeto
  readonly unidad: string | null
  readonly posicion: number
  readonly empate: boolean
  readonly provisional: boolean
  readonly banda: Banda | null
}

export type RiesgosDeEmpresa =
  | { readonly estado: 'sin_vinculo' }
  | { readonly estado: 'pendiente' }
  | {
    readonly estado: 'vinculada'
    readonly organizacion: { readonly id: string } & FichaOrganizacion
    readonly version: VersionFunciones
    readonly generadoEn: string
    /** En el orden del ranking. */
    readonly riesgos: readonly RiesgoDeEmpresa[]
    readonly noEvaluables: number
    readonly enCola: number
  }

const fichaVigente = async (db: Db, organizacionId: string): Promise<FichaOrganizacion> => {
  const [f] = await db<{ sector: string | null; tamano: string | null; zonas: string[] }[]>`
    select sector, tamano, zonas from risk.organizacion_ficha where organizacion_id = ${organizacionId} order by id desc limit 1`
  return { sector: f?.sector ?? null, tamano: f?.tamano ?? null, zonas: f?.zonas ?? [] }
}

export const riesgosDeEmpresa = async (
  db: Db, sesion: Sesion, version: VersionFunciones, empresaId: string, ahora: Date = new Date(),
): Promise<RiesgosDeEmpresa> => {
  exigirPermiso(sesion.rol, 'riesgo.ver_resultados')
  const vinculo = await vinculoDeEmpresa(db, empresaId)
  if (vinculo === null) return { estado: 'sin_vinculo' }
  if (vinculo.estado === 'pendiente') return { estado: 'pendiente' }
  const lista = await vistaLista(db, sesion, version, vinculo.organizacionId)
  // Vinculada y visible, pero sin riesgos que leer: lo mismo que sin vínculo.
  if (lista === null) return { estado: 'sin_vinculo' }
  return {
    estado: 'vinculada',
    organizacion: { id: vinculo.organizacionId, ...(await fichaVigente(db, vinculo.organizacionId)) },
    version: lista.version,
    generadoEn: ahora.toISOString(),
    riesgos: lista.ranking.map((r) => ({
      riskId: r.riskId, titulo: r.titulo, tipoObjeto: r.tipoObjeto, unidad: r.unidadId,
      posicion: r.posicion, empate: r.empate, provisional: r.provisional, banda: r.lectura.banda,
    })),
    noEvaluables: lista.noEvaluables.length,
    enCola: lista.cola.length,
  }
}
