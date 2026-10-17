// Lo que lee el script de aceptación (T-0032) de una base de Risk OS: una foto consistente, en
// una transacción de sólo lectura. No migra, no escribe y no registra accesos: lee lo registrado
// de las organizaciones del manifiesto con la misma lectura de las vistas, sin pasar por los
// casos de uso que registran el acceso, para no tocar A8a.
//
// Lo que lee tiene títulos, textos y valores de las históricas; nada de eso sale de acá más que
// a `medicion.ts`, que sólo devuelve códigos, conteos, fechas e ids opacos.

import type { RevisionParaContar } from '../domain/ciclos.ts'
import type { TablaHistorial } from '../domain/historial.ts'
import type { DatosOrganizacion } from '../domain/organizacion.ts'
import { revisionesParaContar } from '../persistence/actualizacion.ts'
import type { Sql } from '../persistence/database.ts'
import { leerOrganizacion } from '../persistence/vistas.ts'
import type { Manifiesto } from './manifiesto.ts'

export interface LoteLeido {
  readonly id: number
  readonly huella: string
  readonly importadoEn: string
  readonly filas: { readonly risks: number; readonly actionPlan: number; readonly riskTransfer: number }
  readonly avisos: number
  readonly escritas: Readonly<Record<string, number>>
  /** Las organizaciones de las filas que escribió (las filas de un lote llevan su misma hora). */
  readonly organizaciones: readonly string[]
}

export interface AccesoLeido {
  readonly personaId: string
  readonly organizacionId: string
  readonly ocurridoEn: string
}

export interface RevisionHumanaLeida {
  readonly evaluacionId: string
  /** `null` si vino de los CSV. */
  readonly personaId: string | null
  readonly estado: string
  readonly registradaEn: string
}

export interface ReordenamientoLeido {
  readonly id: string
  readonly organizacionId: string
  readonly autorPersonaId: string
  readonly causa: string
  readonly patron: string
  readonly conFundamento: boolean
  readonly registradoEn: string
}

export interface LecturaAceptacion {
  readonly medidoEn: string
  /** Todas las organizaciones con riesgos en la base. */
  readonly organizaciones: readonly string[]
  readonly lotes: readonly LoteLeido[]
  /** Lo registrado de cada organización del manifiesto que existe en la base. */
  readonly datos: ReadonlyMap<string, DatosOrganizacion>
  readonly revisiones: readonly RevisionParaContar[]
  readonly accesos: readonly AccesoLeido[]
  readonly revisionesHumanas: readonly RevisionHumanaLeida[]
  readonly reordenamientos: readonly ReordenamientoLeido[]
  /** Filas de la base por riesgo y por tabla del historial, para A12. */
  readonly filasPorRiesgo: ReadonlyMap<string, Readonly<Record<TablaHistorial, number>>>
  /** Sólo para comparar el revisor con el evaluador original; ningún nombre sale de `medicion.ts`. */
  readonly personas: readonly { readonly id: string; readonly nombre: string }[]
}

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : new Date(v).toISOString())

/** La foto de la base para medir RO01 §6. */
export const leerParaAceptacion = async (sql: Sql, m: Manifiesto): Promise<LecturaAceptacion> =>
  sql.begin('isolation level repeatable read read only', async (tx) => {
    await tx`set local statement_timeout = '60s'`
    const [ahora] = await tx<{ t: Date }[]>`select now() as t`
    const orgs = await tx<{ o: string }[]>`select distinct organizacion_id as o from risk.riesgo order by 1`
    const delManifiesto = Object.values(m.empresas).map((e) => e.organizacionId)

    // Las organizaciones de cada lote, en text[]: un arreglo del dominio de ids llega del driver
    // como texto, no como arreglo.
    const lotes = await tx<{
      id: string; huella: string; importado_en: Date; filas_risks: number; filas_action_plan: number; filas_risk_transfer: number
      avisos: number; escritas: Record<string, number>; organizaciones: string[] | null
    }[]>`
      select l.id::text, l.huella, l.importado_en, l.filas_risks, l.filas_action_plan, l.filas_risk_transfer, l.avisos, l.escritas,
             (select array_agg(distinct o::text order by o::text) from (
                select r.organizacion_id as o from risk.riesgo r where r.origen = 'importacion' and r.registrado_en = l.importado_en
                union select r.organizacion_id from risk.evaluacion e join risk.riesgo r on r.id = e.risk_id
                  where e.origen = 'importacion' and e.registrada_en = l.importado_en
                union select r.organizacion_id from risk.accion a join risk.riesgo r on r.id = a.risk_id
                  where a.origen = 'importacion' and a.registrada_en = l.importado_en
                union select r.organizacion_id from risk.transferencia t join risk.riesgo r on r.id = t.risk_id
                  where t.origen = 'importacion' and t.registrada_en = l.importado_en) x) as organizaciones
      from risk.lote_importacion l order by l.id`

    const datos = new Map<string, DatosOrganizacion>()
    for (const o of delManifiesto) {
      const d = await leerOrganizacion(tx, o)
      if (d !== null) datos.set(o, d)
    }
    const riesgos = [...datos.values()].flatMap((d) => d.riesgos.map((r) => r.id))

    const accesos = await tx<{ persona_id: string; organizacion_id: string; ocurrido_en: Date }[]>`
      select persona_id, organizacion_id, ocurrido_en from risk.registro_acceso
      where tipo = 'vista_resultados' order by ocurrido_en, id`
    const revisionesHumanas = await tx<{ evaluacion_id: string; revisor_persona_id: string | null; estado: string; registrada_en: Date }[]>`
      select evaluacion_id, revisor_persona_id, estado, registrada_en from risk.revision_humana
      where evaluacion_id is not null order by id`
    const reordenamientos = await tx<{
      id: string; organizacion_id: string; autor_persona_id: string; causa: string; patron: string; con_fundamento: boolean; registrado_en: Date
    }[]>`
      select id, organizacion_id, autor_persona_id, causa, patron, btrim(fundamento) <> '' as con_fundamento, registrado_en
      from risk.reordenamiento order by registrado_en, id`
    const personas = await tx<{ id: string; nombre: string }[]>`select id, nombre from risk.persona order by id`

    const filas = riesgos.length === 0 ? [] : await tx<({ risk_id: string } & Record<TablaHistorial, number>)[]>`
      select g.id as risk_id,
        (select count(*)::int from risk.riesgo where id = g.id) as riesgo,
        (select count(*)::int from risk.evaluacion where risk_id = g.id) as evaluacion,
        (select count(*)::int from risk.revision_humana h
           left join risk.evaluacion e on e.id = h.evaluacion_id left join risk.accion a on a.id = h.accion_id
           left join risk.transferencia t on t.id = h.transferencia_id
         where coalesce(e.risk_id, a.risk_id, t.risk_id) = g.id) as revision_humana,
        (select count(*)::int from risk.accion where risk_id = g.id) as accion,
        (select count(*)::int from risk.accion_estado s join risk.accion a on a.id = s.accion_id where a.risk_id = g.id) as accion_estado,
        (select count(*)::int from risk.transferencia where risk_id = g.id) as transferencia,
        (select count(*)::int from risk.evento_poliza where risk_id = g.id) as evento_poliza,
        (select count(*)::int from risk.novedad where risk_id = g.id) as novedad,
        (select count(*)::int from risk.revision_pendiente where risk_id = g.id) as revision_pendiente,
        (select count(*)::int from risk.cierre_revision where risk_id = g.id) as cierre_revision,
        (select count(*)::int from risk.reordenamiento where g.id in (risk_id, risk_id_sube, risk_id_baja)) as reordenamiento,
        (select count(*)::int from risk.orden_previo_item where risk_id = g.id) as orden_previo_item
      from risk.riesgo g where g.id in ${tx(riesgos)}`

    return {
      medidoEn: iso(ahora?.t ?? new Date()),
      organizaciones: orgs.map((x) => x.o),
      lotes: lotes.map((l): LoteLeido => ({
        id: Number(l.id), huella: l.huella, importadoEn: iso(l.importado_en),
        filas: { risks: l.filas_risks, actionPlan: l.filas_action_plan, riskTransfer: l.filas_risk_transfer },
        avisos: l.avisos, escritas: l.escritas, organizaciones: l.organizaciones ?? [],
      })),
      datos,
      revisiones: await revisionesParaContar(tx),
      accesos: accesos.map((a) => ({ personaId: a.persona_id, organizacionId: a.organizacion_id, ocurridoEn: iso(a.ocurrido_en) })),
      revisionesHumanas: revisionesHumanas.map((h) => ({
        evaluacionId: h.evaluacion_id, personaId: h.revisor_persona_id, estado: h.estado, registradaEn: iso(h.registrada_en),
      })),
      reordenamientos: reordenamientos.map((x) => ({
        id: x.id, organizacionId: x.organizacion_id, autorPersonaId: x.autor_persona_id, causa: x.causa, patron: x.patron,
        conFundamento: x.con_fundamento, registradoEn: iso(x.registrado_en),
      })),
      filasPorRiesgo: new Map(filas.map((f) => {
        const { risk_id: id, ...n } = f
        return [id, n]
      })),
      personas,
    }
  })
