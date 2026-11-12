// Qué puede hacer cada rol en Risk OS (T-0035). Es la matriz que el owner aprobó el 2026-11-03
// en el hilo de T-0035. La misma regla vive en la base, en las funciones `authz_puede_*` de la
// migración 0006: la aplicación decide la acción y la explica, y RLS decide las filas (D-0022).
// Una prueba compara las dos capas rol por rol.
//
// Además de la matriz, dos reglas no dependen sólo del rol y también están en las dos capas:
//   - un Revisor no ve resultados de una organización hasta registrar su orden previo ciego
//     para esa organización (RO01 §6, A8a);
//   - nadie revisa ni acepta lo que escribió. La única excepción es la aprobación interna por
//     operador único (D-0083, T-0041): un Administrador aprueba lo propio, sólo para uso
//     interno, con una revisión de IA registrada sobre esa versión y 24 horas desde su registro.
//
// Todo esto rige con AUTH_MODE=oidc, que es cuando la sesión trae un rol. En `legacy` la
// sesión no trae rol y Risk OS se comporta como hasta hoy (RO01 §8: «todas las personas con
// acceso pueden todo»).

import { RechazoActualizacion } from './actualizacion.ts'

export type RolInterno = 'ADMINISTRADOR' | 'OPERADOR' | 'REVISOR'
export const ROLES: readonly RolInterno[] = ['ADMINISTRADOR', 'OPERADOR', 'REVISOR']
export const esRol = (valor: string): valor is RolInterno => (ROLES as readonly string[]).includes(valor)

export type AccionRisk =
  | 'riesgo.consultar'
  | 'riesgo.ver_resultados'
  | 'riesgo.cargar'
  | 'riesgo.revisar'
  | 'riesgo.reordenar'
  | 'riesgo.orden_previo'

export const ACCIONES: readonly AccionRisk[] = [
  'riesgo.consultar', 'riesgo.ver_resultados', 'riesgo.cargar', 'riesgo.revisar', 'riesgo.reordenar', 'riesgo.orden_previo',
]

const PERMITIDOS: Readonly<Record<AccionRisk, readonly RolInterno[]>> = {
  // Las organizaciones y el material ciego del orden previo, sin nada calculado.
  'riesgo.consultar': ['ADMINISTRADOR', 'OPERADOR', 'REVISOR'],
  // Ranking, bandas, `C_raw`, evaluaciones y lo que las revisa. El Revisor, además, después de
  // su orden previo de esa organización.
  'riesgo.ver_resultados': ['ADMINISTRADOR', 'OPERADOR', 'REVISOR'],
  // Novedades, plan de acción, coberturas, eventos de póliza y reevaluaciones.
  'riesgo.cargar': ['ADMINISTRADOR', 'OPERADOR'],
  // Revisar evaluaciones, acciones y coberturas, y cerrar revisiones pendientes: lo ajeno.
  'riesgo.revisar': ['ADMINISTRADOR', 'OPERADOR', 'REVISOR'],
  'riesgo.reordenar': ['ADMINISTRADOR', 'OPERADOR', 'REVISOR'],
  'riesgo.orden_previo': ['REVISOR'],
}

export const puede = (rol: RolInterno, accion: AccionRisk): boolean => PERMITIDOS[accion].includes(rol)

/** Lo que se le dice a quien no puede: quién sí puede, sin datos (AM-18 del prototipo). */
export const EXPLICACION: Readonly<Record<AccionRisk, string>> = {
  'riesgo.consultar': 'Risk OS lo ven el Administrador, el Operador Del Campo y el Revisor profesional.',
  'riesgo.ver_resultados': 'Los resultados los ven el Administrador y las personas con la organización asignada.',
  'riesgo.cargar': 'Novedades, plan de acción, coberturas y reevaluaciones las cargan el Administrador y el Operador Del Campo.',
  'riesgo.revisar': 'Revisan y aceptan el Administrador, el Operador Del Campo y el Revisor profesional, siempre trabajo de otra persona.',
  'riesgo.reordenar': 'Reordenan el Administrador, el Operador Del Campo y el Revisor profesional.',
  'riesgo.orden_previo': 'El orden previo ciego lo registra el Revisor profesional.',
}

export const SIN_ORDEN_PREVIO =
  'Registrá primero tu orden previo ciego de esta organización: hasta entonces no se muestran sus resultados (A8a).'
export const TRABAJO_PROPIO = 'Nadie revisa ni acepta lo que escribió, tampoco un Administrador: lo revisa otra persona.'

// ── Aprobación interna por operador único (D-0083, T-0041) ───────────────────

/** Cómo se rotula lo que aprobó su propio autor. No se exporta, publica ni entrega al cliente. */
export const ROTULO_APROBACION_INTERNA = 'aprobación interna por operador único'
export const HORAS_DE_ESPERA = 24

const LO_PROPIO = `Lo propio sólo se aprueba como ${ROTULO_APROBACION_INTERNA}: `

/** Qué le falta a un Administrador para aprobar una versión propia, o `null` si ya puede. */
export const porQueNoApruebaLoPropio = (x: { readonly revisionIa: boolean; readonly horas: number }): string | null => {
  if (!x.revisionIa) return `${LO_PROPIO}falta la revisión de IA registrada sobre esta versión.`
  const faltan = Math.min(HORAS_DE_ESPERA, Math.ceil(HORAS_DE_ESPERA - x.horas))
  return faltan > 0 ? `${LO_PROPIO}faltan ${String(faltan)} h de las ${String(HORAS_DE_ESPERA)} desde que se registró esta versión.` : null
}

/** Si el rechazo fue por revisar lo propio, con o sin la excepción a medio cumplir. */
export const esTrabajoPropio = (motivo: string): boolean => motivo === TRABAJO_PROPIO || motivo.startsWith(LO_PROPIO)

/**
 * La acción no está permitida para quien la pide. Es un rechazo de la actualización: no escribe
 * nada y la app muestra el motivo, que sólo dice quién sí puede.
 */
export class SinPermiso extends RechazoActualizacion {
  readonly accion: AccionRisk

  constructor(accion: AccionRisk, motivo: string = EXPLICACION[accion]) {
    super(motivo)
    this.name = 'SinPermiso'
    this.accion = accion
  }
}

/** Falla con `SinPermiso` si la sesión trae un rol que no puede. Sin rol (`legacy`), pasa. */
export const exigirPermiso = (rol: RolInterno | undefined, accion: AccionRisk): void => {
  if (rol !== undefined && !puede(rol, accion)) throw new SinPermiso(accion)
}
