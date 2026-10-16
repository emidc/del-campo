// Las restricciones del esquema `risk` contra el Postgres local (D-0051): un caso por
// restricción, que escribe la base válida de `fixtures.ts`, cambia una sola cosa y espera que
// Postgres lo rechace con el nombre de esa restricción. Un test aparte compara la lista de casos
// con el catálogo, así que una restricción nueva sin caso hace fallar la suite.
//
// El esquema es sólo de inserción: cada caso corre en una transacción que se revierte.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Sql, TransactionSql } from './database.ts'
import { B, base, fila, insertar, valores, LOTE, nuevoId, ORG_B, PERSONA_INEXISTENTE, type Fila, type Tabla } from './fixtures.ts'
import { enTransaccionRevertida, openTestDatabase } from './testing.ts'

let sql: Sql
before(async () => {
  sql = await openTestDatabase()
})
after(async () => {
  await sql.end()
})

type Caso = readonly [restriccion: string, tabla: Tabla, cambios: Fila | ((tx: TransactionSql) => Promise<void>)]

const sesionSinAutor = { origen: 'sesion' }
const autorInexistente = { origen: 'sesion', autor_persona_id: PERSONA_INEXISTENTE }
const loteSinIdOrigen = { id_origen: 'S99-X99', lote_origen: null }
const decision = { tipo_registro: 'decision_tratamiento', factor_objetivo: null, mecanismo_causal: null, decision: 'tratar', fecha_proxima_revision: '2027-01-01' }
const reevaluacion = { risk_id: B.riesgo, riesgo_tipo: 'riesgo', tipo_evaluacion: 'reevaluacion', evaluacion_anterior_id: B.reevaluacion, motivo: 'informacion_nueva' }
const cumplida = { estado: 'cumplida', fecha_cumplida: '2026-10-05', evidencia_ejecucion: ['DOC-SINTETICO-1'] }
const enSesion = { origen: 'sesion', autor_persona_id: B.persona }
const soloPosicion = { tipo: 'posicion', risk_id_sube: null, risk_id_baja: null, risk_id: B.riesgo, posicion_profesional: 1 }

/** Inserta dos veces la misma fila: la segunda choca con la clave primaria. */
const dosVeces = (tabla: Tabla, cambios: Fila = {}) => async (tx: TransactionSql): Promise<void> => {
  const f = fila(tabla, cambios)
  await insertar(tx, tabla, f)
  await insertar(tx, tabla, f)
}
/** Inserta dos filas válidas que comparten lo que la restricción exige único. */
const dosDistintas = (tabla: Tabla, cambios: Fila) => async (tx: TransactionSql): Promise<void> => {
  await insertar(tx, tabla, fila(tabla, cambios))
  await insertar(tx, tabla, fila(tabla, cambios))
}

const factor = (f: string): Caso[] => [
  [`evaluacion_${f}_base_con_valor`, 'evaluacion', { [`${f}_estado`]: 'unknown', [`${f}_valor`]: null, [`${f}_observacion`]: 'Sin dato', [`${f}_base`]: 'observed', necesidad_validacion: 'Pedir dato' }],
  [`evaluacion_${f}_estado`, 'evaluacion', { [`${f}_estado`]: 'quizas' }],
  [`evaluacion_${f}_rango`, 'evaluacion', { [`${f}_min`]: 4, [`${f}_max`]: 5 }],
  [`evaluacion_${f}_unknown_con_nota`, 'evaluacion', { [`${f}_estado`]: 'unknown', [`${f}_valor`]: null, necesidad_validacion: 'Pedir dato' }],
  [`evaluacion_${f}_valor_si_known`, 'evaluacion', { [`${f}_valor`]: null }],
]

const CASOS: Caso[] = [
  // Tipos (dominios).
  ['actor_enum', 'accion', { actor: 'robot' }],
  ['base_enum', 'accion', { base: 'intuido' }],
  ['id_accion_formato', 'accion', { id: 'ACC-1' }],
  ['id_evaluacion_formato', 'evaluacion', { id: 'EVA-01HZZZZZZZZZZZZZZZZZZZZZZU' }],
  ['id_evento_formato', 'evento_poliza', { id: 'EVENTO-1' }],
  ['id_novedad_formato', 'novedad', { id: 'nov-00000000000000000000000001' }],
  ['id_orden_previo_formato', 'orden_previo', { id: 'OPR-' }],
  ['id_persona_formato', 'persona', { id: 'emiliano' }],
  ['id_reordenamiento_formato', 'reordenamiento', { id: 'ROR-0000000000000000000000000L' }],
  ['id_revision_formato', 'revision_pendiente', { id: 'REV-000000000000000000000000001' }],
  ['id_riesgo_formato', 'riesgo', { id: 'RSK-0000000000000000000000000I' }],
  ['id_transferencia_formato', 'transferencia', { id: 'RSK-00000000000000000000000001' }],
  ['moneda_iso_4217', 'evaluacion', { i_econ_monto_bruto: 10, moneda: 'ars' }],
  ['monto_no_negativo', 'evaluacion', { i_econ_monto_bruto: -1, moneda: 'ARS' }],
  ['nivel_1_a_5', 'evaluacion', { p_valor: 6 }],
  ['origen_enum', 'riesgo', { origen: 'planilla' }],
  ['referencias_validas', 'accion', { evidencia: ['DOC-SINTETICO-1', 'sin_evidencia'] }],
  ['texto_no_vacio', 'riesgo', { titulo: '   ' }],

  // persona y registro_acceso.
  ['persona_pkey', 'persona', dosVeces('persona')],
  ['registro_acceso_persona_id_fkey', 'registro_acceso', { persona_id: PERSONA_INEXISTENTE }],
  ['registro_acceso_tipo', 'registro_acceso', { tipo: 'cierre_sesion' }],
  ['registro_acceso_vista_de_una_organizacion', 'registro_acceso', { tipo: 'vista_resultados', vista: 'ranking' }],

  // riesgo.
  ['riesgo_pkey', 'riesgo', dosVeces('riesgo')],
  ['riesgo_autor_de_sesion', 'riesgo', sesionSinAutor],
  ['riesgo_autor_persona_id_fkey', 'riesgo', autorInexistente],
  ['riesgo_consecuencia_comun_solo_en_padre', 'riesgo', { consecuencia_comun: 'Sólo el padre la tiene' }],
  ['riesgo_lote_con_id_origen', 'riesgo', loteSinIdOrigen],
  ['riesgo_origen_unico', 'riesgo', { lote_origen: LOTE, id_origen: 'S99-R01' }],
  ['riesgo_padre_es_padre_de_la_organizacion', 'riesgo', { tipo_objeto: 'sub_riesgo', riesgo_padre_id: B.padre, organizacion_id: ORG_B }],
  ['riesgo_padre_solo_en_sub_riesgo', 'riesgo', { tipo_objeto: 'sub_riesgo' }],
  ['riesgo_tipo_objeto', 'riesgo', { tipo_objeto: 'grupo' }],

  // miembro_escenario.
  ['miembro_escenario_pkey', 'miembro_escenario', dosVeces('miembro_escenario')],
  ['miembro_escenario_distinto', 'miembro_escenario', { miembro_id: B.escenario }],
  ['miembro_escenario_escenario', 'miembro_escenario', { escenario_id: B.otroRiesgo }],
  ['miembro_escenario_escenario_tipo', 'miembro_escenario', { escenario_tipo: 'riesgo' }],
  ['miembro_escenario_miembro', 'miembro_escenario', { miembro_id: B.riesgoOrgB }],
  ['miembro_escenario_miembro_tipo', 'miembro_escenario', { miembro_id: B.padre, miembro_tipo: 'padre' }],

  // accion.
  ['accion_pkey', 'accion', dosVeces('accion')],
  ['accion_autor_de_sesion', 'accion', sesionSinAutor],
  ['accion_autor_persona_id_fkey', 'accion', autorInexistente],
  ['accion_cambio_esperado_solo_en_accion', 'accion', { ...decision, cambio_esperado: 'Baja P' }],
  ['accion_decision', 'accion', { ...decision, decision: 'ignorar' }],
  ['accion_decision_completa', 'accion', { ...decision, fecha_proxima_revision: null }],
  ['accion_factor_objetivo', 'accion', { factor_objetivo: ['c_raw'] }],
  ['accion_lote_con_id_origen', 'accion', loteSinIdOrigen],
  ['accion_mecanismo_causal', 'accion', { mecanismo_causal: ' ' }],
  ['accion_origen_unico', 'accion', { lote_origen: LOTE, id_origen: 'S99-A01' }],
  ['accion_riesgo', 'accion', { risk_id: B.subRiesgo, riesgo_tipo: 'riesgo' }],
  ['accion_riesgo_no_padre', 'accion', { risk_id: B.padre, riesgo_tipo: 'padre' }],
  ['accion_tipo_registro', 'accion', { ...decision, tipo_registro: 'tarea', decision: null }],

  // evaluacion.
  ['evaluacion_pkey', 'evaluacion', dosVeces('evaluacion')],
  ['evaluacion_una_inicial', 'evaluacion', { risk_id: B.riesgo, riesgo_tipo: 'riesgo' }],
  ['evaluacion_anterior_registrada', 'evaluacion', (tx) => {
    const id = nuevoId('EVA')
    return insertar(tx, 'evaluacion', fila('evaluacion', { ...reevaluacion, id, evaluacion_anterior_id: id }))
  }],
  ['evaluacion_accion_con_motivo', 'evaluacion', { ...reevaluacion, motivo: 'accion_ejecutada' }],
  ['evaluacion_accion_del_mismo_riesgo', 'evaluacion', { ...reevaluacion, motivo: 'accion_ejecutada', accion_id: B.accionOrgB }],
  ['evaluacion_evaluador', 'evaluacion', { origen: 'sesion', autor_persona_id: B.persona }],
  ['evaluacion_anterior_del_mismo_riesgo', 'evaluacion', { ...reevaluacion, risk_id: B.subRiesgo, riesgo_tipo: 'sub_riesgo' }],
  ['evaluacion_autor_de_sesion', 'evaluacion', sesionSinAutor],
  ['evaluacion_autor_persona_id_fkey', 'evaluacion', { ...autorInexistente, evaluador: null }],
  ...['p', 'i_econ', 'i_pers', 'i_cont', 'i_legal', 'v_cont', 'v_rec'].flatMap(factor),
  ['evaluacion_v_rec_no_aplica_sin_rango', 'evaluacion', { v_rec_estado: 'no_aplica', v_rec_valor: null, v_rec_min: 1 }],
  ['evaluacion_inicial_o_reevaluacion', 'evaluacion', { motivo: 'informacion_nueva' }],
  ['evaluacion_lote_con_id_origen', 'evaluacion', loteSinIdOrigen],
  ['evaluacion_monto_con_moneda', 'evaluacion', { i_econ_monto_bruto: 10 }],
  ['evaluacion_motivo', 'evaluacion', { ...reevaluacion, motivo: 'porque_si' }],
  ['evaluacion_necesidad_validacion', 'evaluacion', { p_estado: 'unknown', p_valor: null, p_observacion: 'Sin dato' }],
  ['evaluacion_origen_unico', 'evaluacion', { lote_origen: LOTE, id_origen: 'S99-E01' }],
  ['evaluacion_riesgo', 'evaluacion', { riesgo_tipo: 'riesgo' }],
  ['evaluacion_riesgo_no_padre', 'evaluacion', { risk_id: B.padre, riesgo_tipo: 'padre' }],
  ['evaluacion_sin_ramas', 'evaluacion', { ...reevaluacion, evaluacion_anterior_id: B.inicial }],
  ['evaluacion_tipo', 'evaluacion', { ...reevaluacion, tipo_evaluacion: 'auditoria' }],
  ['evaluacion_uncertainty', 'evaluacion', { uncertainty: 'nula' }],
  ['evaluacion_uncertainty_con_nota', 'evaluacion', { uncertainty: 'high' }],
  ['evaluacion_version_metodologia', 'evaluacion', { version_metodologia: 'metodologia v2' }],

  // accion_estado.
  ['accion_estado_accion', 'accion_estado', { accion_id: B.decision }],
  ['accion_estado_autor_de_sesion', 'accion_estado', sesionSinAutor],
  ['accion_estado_autor_persona_id_fkey', 'accion_estado', autorInexistente],
  ['accion_estado_cumplida_con_evidencia', 'accion_estado', { ...cumplida, evidencia_ejecucion: ['sin_evidencia'] }],
  ['accion_estado_efecto', 'accion_estado', { ...cumplida, efecto: 'mucho', evaluacion_efecto_id: B.reevaluacion }],
  ['accion_estado_efecto_con_nota', 'accion_estado', { ...cumplida, efecto: 'efecto_parcial', evaluacion_efecto_id: B.reevaluacion }],
  ['accion_estado_efecto_con_reevaluacion', 'accion_estado', { ...cumplida, efecto: 'efecto_total' }],
  ['accion_estado_efecto_solo_cumplida', 'accion_estado', { estado: 'en_curso', efecto: 'efecto_total', evaluacion_efecto_id: B.reevaluacion }],
  ['accion_estado_estado', 'accion_estado', { estado: 'archivada' }],
  ['accion_estado_reevaluacion_de_esta_accion', 'accion_estado', { ...cumplida, efecto: 'efecto_total', evaluacion_efecto_id: B.inicial }],
  ['accion_estado_solo_acciones', 'accion_estado', { accion_id: B.decision, accion_tipo: 'decision_tratamiento' }],

  // transferencia.
  ['transferencia_pkey', 'transferencia', dosVeces('transferencia')],
  ['transferencia_autor_de_sesion', 'transferencia', sesionSinAutor],
  ['transferencia_autor_persona_id_fkey', 'transferencia', autorInexistente],
  ['transferencia_lote_con_id_origen', 'transferencia', loteSinIdOrigen],
  ['transferencia_montos_con_moneda', 'transferencia', { limite_monto: 1000 }],
  ['transferencia_origen_unico', 'transferencia', { lote_origen: LOTE, id_origen: 'S99-T01' }],
  ['transferencia_riesgo', 'transferencia', { risk_id: B.subRiesgo, riesgo_tipo: 'riesgo' }],
  ['transferencia_riesgo_no_padre', 'transferencia', { risk_id: B.padre, riesgo_tipo: 'padre' }],
  ['transferencia_suficiencia', 'transferencia', { suficiencia: 'sobrada' }],
  ['transferencia_uncertainty', 'transferencia', { uncertainty: 'nula' }],
  ['transferencia_uncertainty_con_nota', 'transferencia', { uncertainty: 'medium' }],
  ['transferencia_vigencia', 'transferencia', { vigencia_desde: '2027-01-01' }],

  // evento_poliza.
  ['evento_poliza_pkey', 'evento_poliza', dosVeces('evento_poliza')],
  ['evento_poliza_autor_de_sesion', 'evento_poliza', sesionSinAutor],
  ['evento_poliza_autor_persona_id_fkey', 'evento_poliza', autorInexistente],
  ['evento_poliza_de_una_cobertura_del_riesgo', 'evento_poliza', { risk_id: B.riesgoOrgB }],
  ['evento_poliza_lote_con_id_origen', 'evento_poliza', loteSinIdOrigen],
  ['evento_poliza_monto', 'evento_poliza', { tipo_evento: 'consumo_limite' }],
  ['evento_poliza_monto_con_moneda', 'evento_poliza', { tipo_evento: 'consumo_limite', monto_evento: 500 }],
  ['evento_poliza_origen_unico', 'evento_poliza', { lote_origen: LOTE, id_origen: 'S99-EV01' }],
  ['evento_poliza_tipo', 'evento_poliza', { tipo_evento: 'siniestro' }],

  // revision_humana.
  ['revision_humana_accepted_solo_humano', 'revision_humana', { revisado_por_actor: 'ai' }],
  ['revision_humana_accion_id_fkey', 'revision_humana', { evaluacion_id: null, accion_id: 'ACC-00000000000000000000000999' }],
  ['revision_humana_actor', 'revision_humana', { estado: 'needs_revision', revisado_por_actor: 'import' }],
  ['revision_humana_estado', 'revision_humana', { estado: 'pending' }],
  ['revision_humana_evaluacion_id_fkey', 'revision_humana', { evaluacion_id: 'EVA-00000000000000000000000999' }],
  ['revision_humana_revisor', 'revision_humana', { origen: 'sesion' }],
  ['revision_humana_revisor_persona_id_fkey', 'revision_humana', { origen: 'sesion', revisor_persona_id: PERSONA_INEXISTENTE, revisado_por_origen: null }],
  ['revision_humana_transferencia_id_fkey', 'revision_humana', { evaluacion_id: null, transferencia_id: 'TRF-00000000000000000000000999' }],
  ['revision_humana_un_objeto', 'revision_humana', { accion_id: B.accion }],

  // novedad.
  ['novedad_pkey', 'novedad', dosVeces('novedad')],
  ['novedad_accion_del_riesgo', 'novedad', { accion_id: B.accionOrgB }],
  ['novedad_autor_persona_id_fkey', 'novedad', { autor_persona_id: PERSONA_INEXISTENTE }],
  ['novedad_risk_id_fkey', 'novedad', { risk_id: 'RSK-00000000000000000000000999' }],
  ['novedad_tipo', 'novedad', { tipo: 'queja' }],
  ['novedad_transferencia_del_riesgo', 'novedad', { transferencia_id: B.transferenciaOrgB }],
  ['novedad_un_destino', 'novedad', { accion_id: B.accion, transferencia_id: B.transferencia }],

  // revision_pendiente.
  ['revision_pendiente_pkey', 'revision_pendiente', dosVeces('revision_pendiente')],
  ['revision_pendiente_accion_del_riesgo', 'revision_pendiente', { disparador: 'accion_ejecutada', accion_id: B.accionOrgB, version_metodologia: null }],
  ['revision_pendiente_autor_de_sesion', 'revision_pendiente', sesionSinAutor],
  ['revision_pendiente_autor_persona_id_fkey', 'revision_pendiente', autorInexistente],
  ['revision_pendiente_disparador', 'revision_pendiente', { disparador: 'comentario', version_metodologia: null }],
  ['revision_pendiente_novedad_del_riesgo', 'revision_pendiente', { disparador: 'informacion_nueva', novedad_id: B.comentario, version_metodologia: null }],
  ['revision_pendiente_referencia', 'revision_pendiente', { disparador: 'accion_ejecutada' }],
  ['revision_pendiente_riesgo', 'revision_pendiente', { risk_id: B.subRiesgo }],
  ['revision_pendiente_riesgo_no_padre', 'revision_pendiente', { risk_id: B.padre, riesgo_tipo: 'padre' }],
  ['revision_pendiente_una_por_accion', 'revision_pendiente', { disparador: 'accion_ejecutada', accion_id: B.accionCumplida, version_metodologia: null }],
  ['revision_pendiente_una_por_novedad', 'revision_pendiente', { disparador: 'informacion_nueva', novedad_id: B.novedad, version_metodologia: null }],
  ['revision_pendiente_una_por_version', 'revision_pendiente', dosDistintas('revision_pendiente', {})],

  // cierre_revision.
  ['cierre_revision_pkey', 'cierre_revision', dosVeces('cierre_revision')],
  ['cierre_revision_cerrada_por_fkey', 'cierre_revision', { cerrada_por: PERSONA_INEXISTENTE }],
  ['cierre_revision_de_la_revision', 'cierre_revision', { risk_id: B.otroRiesgo }],
  ['cierre_revision_evaluacion_del_riesgo', 'cierre_revision', { resultado: 'reevaluacion_aceptada', evaluacion_id: B.inicialOrgB, fundamento: null }],
  ['cierre_revision_resultado', 'cierre_revision', { resultado: 'reabierta' }],
  ['cierre_revision_resultado_completo', 'cierre_revision', { fundamento: null }],

  // orden_previo y orden_previo_item.
  ['orden_previo_pkey', 'orden_previo', dosVeces('orden_previo')],
  ['orden_previo_revisor_persona_id_fkey', 'orden_previo', { revisor_persona_id: PERSONA_INEXISTENTE }],
  ['orden_previo_uno_por_revisor_y_empresa', 'orden_previo', { revisor_persona_id: B.persona }],
  ['orden_previo_item_pkey', 'orden_previo_item', dosVeces('orden_previo_item')],
  ['orden_previo_item_banda', 'orden_previo_item', { banda: 'Altísima' }],
  ['orden_previo_item_orden', 'orden_previo_item', { orden_previo_id: B.ordenPrevio, organizacion_id: ORG_B, risk_id: B.riesgoOrgB }],
  ['orden_previo_item_posicion', 'orden_previo_item', { posicion: 0 }],
  ['orden_previo_item_riesgo_de_la_empresa', 'orden_previo_item', { risk_id: B.riesgoOrgB }],

  // reordenamiento y reordenamiento_vigente.
  ['reordenamiento_pkey', 'reordenamiento', dosVeces('reordenamiento')],
  ['reordenamiento_autor_persona_id_fkey', 'reordenamiento', { autor_persona_id: PERSONA_INEXISTENTE }],
  ['reordenamiento_baja_de_la_organizacion', 'reordenamiento', { risk_id_baja: B.riesgoOrgB }],
  ['reordenamiento_banda', 'reordenamiento', { ...soloPosicion, tipo: 'banda', posicion_profesional: null, banda_profesional: 'Altísima' }],
  ['reordenamiento_causa', 'reordenamiento', { causa: 'capricho' }],
  ['reordenamiento_orden_previo_de_la_organizacion', 'reordenamiento', { orden_previo_id: B.ordenPrevioOrgB }],
  ['reordenamiento_patron', 'reordenamiento', { patron: 'familia_s99' }],
  ['reordenamiento_posicion', 'reordenamiento', { ...soloPosicion, posicion_profesional: 0 }],
  ['reordenamiento_riesgo_de_la_organizacion', 'reordenamiento', { ...soloPosicion, risk_id: B.riesgoOrgB }],
  ['reordenamiento_sube_de_la_organizacion', 'reordenamiento', { risk_id_sube: B.riesgoOrgB }],
  ['reordenamiento_tipo', 'reordenamiento', { tipo: 'libre' }],
  ['reordenamiento_tipo_completo', 'reordenamiento', { risk_id_baja: B.riesgo }],
  ['reordenamiento_version_funciones', 'reordenamiento', { version_funciones: 'metodologia v1 candidate' }],
  ['reordenamiento_vigente_pkey', 'reordenamiento_vigente', dosVeces('reordenamiento_vigente')],
  ['reordenamiento_vigente_reordenamiento', 'reordenamiento_vigente', { organizacion_id: ORG_B, risk_id: B.riesgoOrgB, evaluacion_id: B.inicialOrgB }],
  ['reordenamiento_vigente_riesgo_de_la_organizacion', 'reordenamiento_vigente', { risk_id: B.riesgoOrgB, evaluacion_id: B.inicialOrgB }],
  ['reordenamiento_vigente_evaluacion_del_riesgo', 'reordenamiento_vigente', { evaluacion_id: B.inicialOrgB }],

  // Actualización (T-0031, migración 0004). Los casos de cada regla de los triggers están en
  // `src/application/actualizacion.integration.test.ts`; acá, uno por nombre.
  ['evaluacion_sesion_humana', 'evaluacion', { ...enSesion, evaluador: null, actor: 'ai' }],
  ['accion_sesion_humana', 'accion', { ...enSesion, actor: 'ai' }],
  ['transferencia_sesion_humana', 'transferencia', { ...enSesion, actor: 'import' }],
  ['evento_poliza_sesion_humana', 'evento_poliza', { ...enSesion, actor: 'ai' }],
  ['accion_estado_transicion', 'accion_estado', async (tx) => {
    await insertar(tx, 'accion_estado', fila('accion_estado', { estado: 'cancelada' }))
    await insertar(tx, 'accion_estado', fila('accion_estado', { estado: 'en_curso' }))
  }],
  ['evaluacion_accion_cumplida', 'evaluacion', { ...reevaluacion, ...enSesion, evaluador: null, motivo: 'accion_ejecutada', accion_id: B.accion }],
  ['revision_pendiente_accion_cumplida', 'revision_pendiente', { disparador: 'accion_ejecutada', accion_id: B.accion, version_metodologia: null }],
  ['cierre_revision_reevaluacion_valida', 'cierre_revision', { resultado: 'reevaluacion_aceptada', evaluacion_id: B.inicial, fundamento: null }],
  ['cierre_revision_una_por_evaluacion', 'cierre_revision', async (tx) => {
    // Una reevaluación aceptada cierra la revisión de la novedad; no puede cerrar otra.
    const x = nuevoId('EVA')
    await insertar(tx, 'evaluacion', fila('evaluacion', { ...reevaluacion, id: x }))
    await insertar(tx, 'revision_humana', fila('revision_humana', { evaluacion_id: x }))
    await insertar(tx, 'cierre_revision', fila('cierre_revision', { resultado: 'reevaluacion_aceptada', evaluacion_id: x, fundamento: null }))
    const otraNovedad = nuevoId('NOV')
    const otraRevision = nuevoId('REV')
    await insertar(tx, 'novedad', fila('novedad', { id: otraNovedad }))
    await insertar(tx, 'revision_pendiente', fila('revision_pendiente', { id: otraRevision, disparador: 'informacion_nueva', novedad_id: otraNovedad, version_metodologia: null }))
    await insertar(tx, 'cierre_revision', fila('cierre_revision', { revision_id: otraRevision, resultado: 'reevaluacion_aceptada', evaluacion_id: x, fundamento: null }))
  }],
  ['orden_previo_antes_de_resultados', 'orden_previo', async (tx) => {
    await insertar(tx, 'registro_acceso', fila('registro_acceso', { persona_id: B.otraPersona, tipo: 'vista_resultados', organizacion_id: ORG_B, vista: 'lista' }))
    await insertar(tx, 'orden_previo', fila('orden_previo'))
  }],
  ['orden_previo_item_en_su_registro', 'orden_previo_item', async (tx) => {
    // Un orden previo registrado en otra transacción (antes): sus posiciones ya no entran.
    const id = nuevoId('OPR')
    await insertar(tx, 'orden_previo', fila('orden_previo', { id, registrado_en: '2026-10-01T00:00:00Z' }))
    await insertar(tx, 'orden_previo_item', fila('orden_previo_item', { orden_previo_id: id, organizacion_id: ORG_B, risk_id: B.riesgoOrgB }))
  }],

  // lote_importacion (T-0029).
  ['lote_importacion_huella_unica', 'lote_importacion', dosDistintas('lote_importacion', { huella: 'a'.repeat(64) })],
  ['lote_importacion_huellas_sha256', 'lote_importacion', { huella_action_plan: 'A'.repeat(64) }],
  ['lote_importacion_conteos_no_negativos', 'lote_importacion', { avisos: -1 }],

  // usuario y credencial (T-0030, D-0069).
  ['usuario_pkey', 'usuario', { usuario: 'persona-de-la-base' }],
  ['usuario_formato', 'usuario', { usuario: 'Con Mayúsculas' }],
  ['usuario_una_por_persona', 'usuario', { persona_id: B.persona }],
  ['usuario_persona_id_fkey', 'usuario', { persona_id: PERSONA_INEXISTENTE }],
  ['credencial_de_un_usuario', 'credencial', { persona_id: B.otraPersona }],
  ['credencial_hash_scrypt', 'credencial', { password_hash: 'contraseña-en-claro' }],
]

const TABLAS: Tabla[] = [
  'persona', 'registro_acceso', 'riesgo', 'miembro_escenario', 'accion', 'evaluacion', 'accion_estado',
  'transferencia', 'evento_poliza', 'revision_humana', 'novedad', 'revision_pendiente', 'cierre_revision',
  'orden_previo', 'orden_previo_item', 'reordenamiento', 'reordenamiento_vigente', 'lote_importacion',
  'usuario', 'credencial',
]

/** El nombre de la restricción que rechazó `accion`, o `null` si no la rechazó ninguna. */
const rechazo = async (accion: () => Promise<unknown>): Promise<string | null> => {
  try {
    await accion()
    return null
  } catch (error) {
    const nombre = (error as { constraint_name?: string }).constraint_name
    if (nombre === undefined) throw error
    return nombre
  }
}

describe('la base válida', () => {
  it('se escribe entera sin rechazos, y cada tabla acepta una fila válida más', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      await base(tx)
      for (const t of TABLAS) await insertar(tx, t, fila(t))
    })
  })
})

describe('cada restricción rechaza su caso', () => {
  for (const [restriccion, tabla, cambios] of CASOS) {
    it(`${restriccion} (${tabla})`, async () => {
      await enTransaccionRevertida(sql, async (tx) => {
        await base(tx)
        const obtenida = await rechazo(() => typeof cambios === 'function' ? cambios(tx) : insertar(tx, tabla, fila(tabla, cambios)))
        assert.equal(obtenida, restriccion)
      })
    })
  }

  it('los casos cubren todas las restricciones del esquema', async () => {
    const filas = await sql<{ nombre: string }[]>`
      select c.conname as nombre
      from pg_constraint c join pg_namespace n on n.oid = c.connamespace
      where n.nspname = 'risk' and c.conrelid <> 'risk.schema_migrations'::regclass
        and not exists (select 1 from pg_constraint p where p.contype = 'p' and p.conrelid = c.conrelid
                        and c.contype = 'u' and p.conkey <@ c.conkey)
        and not (c.contype = 'p' and exists (select 1 from pg_attribute a where a.attrelid = c.conrelid
                        and a.attnum = any (c.conkey) and a.attidentity <> ''))
      union all
      select i.indexrelid::regclass::text
      from pg_index i join pg_class k on k.oid = i.indexrelid join pg_namespace n on n.oid = k.relnamespace
      where n.nspname = 'risk' and i.indisunique and not exists (select 1 from pg_constraint where conindid = i.indexrelid)
      union all
      select t.tgname from pg_trigger t join pg_class k on k.oid = t.tgrelid join pg_namespace n on n.oid = k.relnamespace
      where n.nspname = 'risk' and not t.tgisinternal and t.tgname not like 'solo_insercion%'`
    const catalogo = filas.map((f) => f.nombre.replace(/^risk\./, '')).sort()
    assert.deepEqual([...new Set(CASOS.map(([r]) => r))].sort(), catalogo)
    assert.equal(new Set(CASOS.map(([r]) => r)).size, CASOS.length, 'un caso por restricción')
  })
})

describe('historia de evaluaciones', () => {
  it('una sucesora por evaluación: la cadena admite seguir desde la última y no una rama', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      await base(tx)
      const siguiente = fila('evaluacion', reevaluacion)
      await insertar(tx, 'evaluacion', siguiente)
      const rama = await rechazo(() => insertar(tx, 'evaluacion', fila('evaluacion', reevaluacion)))
      assert.equal(rama, 'evaluacion_sin_ramas')
    })
  })

  it('un INSERT de varias filas no puede cerrar un ciclo', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      await base(tx)
      const a = nuevoId('EVA')
      const b = nuevoId('EVA')
      const ciclo = [
        fila('evaluacion', { ...reevaluacion, id: a, evaluacion_anterior_id: b }),
        fila('evaluacion', { ...reevaluacion, id: b, evaluacion_anterior_id: a }),
      ]
      const obtenida = await rechazo(() => tx`insert into risk.evaluacion ${tx(ciclo.map((f) => valores(tx, f)))}`)
      assert.equal(obtenida, 'evaluacion_anterior_registrada')
    })
  })

  it('un padre no tiene evaluación aunque se declare con el tipo de un riesgo', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      await base(tx)
      const obtenida = await rechazo(() => insertar(tx, 'evaluacion', fila('evaluacion', { risk_id: B.padre, riesgo_tipo: 'riesgo' })))
      assert.equal(obtenida, 'evaluacion_riesgo')
    })
  })

  it('el padre de un sub-riesgo tiene que ser un padre', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      await base(tx)
      const obtenida = await rechazo(() => insertar(tx, 'riesgo', fila('riesgo', { tipo_objeto: 'sub_riesgo', riesgo_padre_id: B.riesgo })))
      assert.equal(obtenida, 'riesgo_padre_es_padre_de_la_organizacion')
    })
  })

  it('el evaluador es texto en una importación y la persona en una sesión', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      await base(tx)
      await insertar(tx, 'evaluacion', fila('evaluacion', { origen: 'sesion', autor_persona_id: B.persona, evaluador: null }))
      const obtenida = await rechazo(() => insertar(tx, 'evaluacion', fila('evaluacion', { risk_id: B.escenario, riesgo_tipo: 'escenario', evaluador: null })))
      assert.equal(obtenida, 'evaluacion_evaluador')
    })
  })

  it('la evidencia no admite una lista vacía', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      await base(tx)
      const obtenida = await rechazo(() => insertar(tx, 'accion', fila('accion', { evidencia: [] })))
      assert.equal(obtenida, 'referencias_validas')
    })
  })

  it('una IA puede dejar needs_revision, y sólo una persona accepted', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      await base(tx)
      await insertar(tx, 'revision_humana', fila('revision_humana', { estado: 'needs_revision', revisado_por_actor: 'ai' }))
      await insertar(tx, 'revision_humana', fila('revision_humana', { origen: 'sesion', revisor_persona_id: B.persona, revisado_por_origen: null }))
    })
  })
})

describe('sólo inserción (R-22, R-23)', () => {
  it('ninguna tabla admite UPDATE, DELETE ni TRUNCATE', async () => {
    for (const t of TABLAS) {
      const columna = Object.keys(fila(t))[0] ?? ''
      for (const sentencia of [`update risk.${t} set ${columna} = ${columna}`, `delete from risk.${t}`, `truncate risk.${t} cascade`]) {
        await enTransaccionRevertida(sql, async (tx) => {
          await base(tx)
          await insertar(tx, t, fila(t))
          await assert.rejects(tx.unsafe(sentencia), (e: { code?: string; message?: string }) => {
            assert.equal(e.code, '23001', `${sentencia}: ${String(e.message)}`)
            assert.match(e.message ?? '', /sólo inserción/)
            return true
          })
        })
      }
    }
  })

  it('un UPDATE sobre una evaluación escrita falla', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      await base(tx)
      await assert.rejects(tx`update risk.evaluacion set p_valor = 5 where id = ${B.inicial}`, /risk\.evaluacion: sólo inserción; un update no se permite/)
    })
  })

  it('todas las tablas del esquema tienen los dos triggers', async () => {
    const filas = await sql<{ tabla: string; n: number }[]>`
      select k.relname as tabla, count(t.tgname)::int as n
      from pg_class k join pg_namespace s on s.oid = k.relnamespace
      left join pg_trigger t on t.tgrelid = k.oid and t.tgname like 'solo_insercion%'
      where s.nspname = 'risk' and k.relkind = 'r' and k.relname <> 'schema_migrations'
      group by k.relname order by k.relname`
    assert.deepEqual(filas.map((f) => f.tabla), [...TABLAS].sort())
    assert.ok(filas.every((f) => f.n === 2), JSON.stringify(filas))
  })
})

describe('trazabilidad y derivados', () => {
  it('cada tabla nombra en su comentario la superficie de RO01 §2 que la usa', async () => {
    const filas = await sql<{ tabla: string; comentario: string | null }[]>`
      select k.relname as tabla, obj_description(k.oid, 'pg_class') as comentario
      from pg_class k join pg_namespace s on s.oid = k.relnamespace
      where s.nspname = 'risk' and k.relkind = 'r' and k.relname <> 'schema_migrations'`
    for (const f of filas) assert.match(f.comentario ?? '', /^RO01 §2, /, f.tabla)
  })

  it('no hay columnas de derivados (decisión 6a), salvo la foto versionada del reordenamiento', async () => {
    const filas = await sql<{ tabla: string; columna: string }[]>`
      select table_name as tabla, column_name as columna from information_schema.columns
      where table_schema = 'risk' and column_name ~ '(c_raw|^c_|banda|techo|efectivo|safety|extrema|(^|_)posicion|ranking|orden_calculado)'`
    const vistas = filas.map((f) => `${f.tabla}.${f.columna}`).sort()
    assert.deepEqual(vistas, [
      // Lo que declara una persona, no lo que calculan las funciones.
      'orden_previo_item.banda',
      'orden_previo_item.posicion',
      'reordenamiento.banda_profesional',
      'reordenamiento.orden_calculado',
      'reordenamiento.posicion_profesional',
    ])
    const [version] = await sql<{ n: number }[]>`
      select count(*)::int as n from information_schema.columns
      where table_schema = 'risk' and table_name = 'reordenamiento' and column_name = 'version_funciones' and is_nullable = 'NO'`
    assert.equal(version?.n, 1)
  })

  it('nada referencia a Party, Policy ni a otro esquema (D-0063, D-0067)', async () => {
    const filas = await sql<{ n: number }[]>`
      select count(*)::int as n from pg_constraint c
      join pg_class k on k.oid = c.confrelid join pg_namespace s on s.oid = k.relnamespace
      join pg_namespace o on o.oid = c.connamespace
      where o.nspname = 'risk' and c.contype = 'f' and s.nspname <> 'risk'`
    assert.equal(filas[0]?.n, 0)
    const columnas = await sql<{ n: number }[]>`
      select count(*)::int as n from information_schema.columns
      where table_schema = 'risk' and column_name ~* '(party|policy_id|cliente)'`
    assert.equal(columnas[0]?.n, 0)
  })

  it('un reordenamiento es de una sola organización: riesgos y evaluaciones vigentes', async () => {
    const casos: [string, Tabla, Fila][] = [
      ['reordenamiento_sube_de_la_organizacion', 'reordenamiento', { risk_id_sube: B.riesgoOrgB }],
      ['reordenamiento_baja_de_la_organizacion', 'reordenamiento', { risk_id_baja: B.riesgoOrgB }],
      ['reordenamiento_riesgo_de_la_organizacion', 'reordenamiento', { ...soloPosicion, risk_id: B.riesgoOrgB }],
      // La evaluación de otra organización, se declare con su riesgo o con uno de la propia.
      ['reordenamiento_vigente_riesgo_de_la_organizacion', 'reordenamiento_vigente', { risk_id: B.riesgoOrgB, evaluacion_id: B.inicialOrgB }],
      ['reordenamiento_vigente_evaluacion_del_riesgo', 'reordenamiento_vigente', { evaluacion_id: B.inicialOrgB }],
    ]
    for (const [restriccion, tabla, cambios] of casos) {
      await enTransaccionRevertida(sql, async (tx) => {
        await base(tx)
        assert.equal(await rechazo(() => insertar(tx, tabla, fila(tabla, cambios))), restriccion)
      })
    }
  })

  it('una reevaluación por acción ejecutada y una revisión pendiente no nombran una decisión de tratamiento', async () => {
    await enTransaccionRevertida(sql, async (tx) => {
      await base(tx)
      const ev = await rechazo(() => insertar(tx, 'evaluacion', fila('evaluacion', { ...reevaluacion, motivo: 'accion_ejecutada', accion_id: B.decision })))
      assert.equal(ev, 'evaluacion_accion_del_mismo_riesgo')
    })
    await enTransaccionRevertida(sql, async (tx) => {
      await base(tx)
      const rp = await rechazo(() => insertar(tx, 'revision_pendiente', fila('revision_pendiente', { disparador: 'accion_ejecutada', accion_id: B.decision, version_metodologia: null })))
      assert.equal(rp, 'revision_pendiente_accion_del_riesgo')
    })
  })
})
