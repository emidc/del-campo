// Matriz de autorización: principal × recurso × acción × instante → resultado esperado.
// Es la precondición de la prueba, no su conclusión (T-0002, Risks). Cada caso nombra de
// dónde sale: un rol de D-0072, una prueba de la v25 o una regla del dominio.
// SPIKES/T-0002-enforcement-autorizacion.md §2 la explica en prosa.
import type { Recurso } from './mecanismos.ts'
import { AHORA, E, I, P, T1, T2, U } from './seed.ts'

const antes = (iso: string): string => new Date(new Date(iso).getTime() - 1).toISOString()

export interface CasoLectura {
  readonly id: string
  readonly principal: string | undefined
  readonly instante: string
  readonly recurso: Recurso
  readonly esperado: readonly string[]
  readonly origen: string
}

export interface CasoEscritura {
  readonly id: string
  readonly principal: string | undefined
  readonly instante: string
  readonly accion: 'escribir_nota' | 'aprobar_informe'
  readonly objetivo: string
  readonly autor?: string
  readonly esperado: boolean
  readonly origen: string
}

const s = (...ids: string[]): string[] => [...ids].sort()

export const LECTURAS: readonly CasoLectura[] = [
  // Persona del equipo con empresas asignadas (D-0072; semántica de D-0027).
  { id: 'L-ADM-empresa', principal: U.ADM, instante: AHORA, recurso: 'empresa', esperado: s(E.E1, E.E2), origen: 'D-0072 Administrador' },
  { id: 'L-OP1-empresa', principal: U.OP1, instante: AHORA, recurso: 'empresa', esperado: s(E.E1), origen: 'D-0072 Operador, empresas asignadas' },
  { id: 'L-OP2-empresa-antes-de-reasignar', principal: U.OP2, instante: antes(T1), recurso: 'empresa', esperado: s(E.E1), origen: 'reasignación: el último instante de la asignación vieja' },
  { id: 'L-OP2-empresa-al-reasignar', principal: U.OP2, instante: T1, recurso: 'empresa', esperado: s(E.E2), origen: 'reasignación: [desde, hasta) semiabierto' },
  { id: 'L-OP3-empresa-antes-de-vencer', principal: U.OP3, instante: antes(T2), recurso: 'empresa', esperado: s(E.E1), origen: 'expiración' },
  { id: 'L-OP3-empresa-vencida', principal: U.OP3, instante: T2, recurso: 'empresa', esperado: [], origen: 'expiración en el límite' },
  { id: 'L-OP4-empresa', principal: U.OP4, instante: AHORA, recurso: 'empresa', esperado: [], origen: 'ausencia de asignación: deny-by-default' },
  { id: 'L-REV-empresa', principal: U.REV, instante: AHORA, recurso: 'empresa', esperado: s(E.E1), origen: 'aislamiento.js AM-18.r1: el revisor no ve empresas no asignadas' },
  { id: 'L-OP1-poliza', principal: U.OP1, instante: AHORA, recurso: 'poliza', esperado: s(P.P1), origen: 'D-0072 Operador' },
  { id: 'L-OP2-poliza', principal: U.OP2, instante: AHORA, recurso: 'poliza', esperado: s(P.P2), origen: 'reasignación: pierde E1, gana E2' },
  { id: 'L-ADM-poliza', principal: U.ADM, instante: AHORA, recurso: 'poliza', esperado: s(P.P1, P.P2), origen: 'D-0072 Administrador' },
  { id: 'L-REV-poliza', principal: U.REV, instante: AHORA, recurso: 'poliza', esperado: [], origen: 'D-0072 Revisor: consulta evaluaciones, no pólizas (supuesto a confirmar en T-0035)' },
  { id: 'L-OP1-nota', principal: U.OP1, instante: AHORA, recurso: 'nota_interna', esperado: s(E.E1), origen: 'fichas con notas internas (C4)' },
  { id: 'L-REV-nota', principal: U.REV, instante: AHORA, recurso: 'nota_interna', esperado: [], origen: 'aislamiento.js: perfil externo' },
  { id: 'L-OP1-informe', principal: U.OP1, instante: AHORA, recurso: 'informe', esperado: s(I.I1C, I.I1B, I.I1B_OP1), origen: 'V25-11: el equipo ve el borrador' },
  // Contacto de empresa en el portal (C12; semántica de PortalGrant).
  { id: 'L-CT1-empresa', principal: U.CT1, instante: AHORA, recurso: 'empresa', esperado: s(E.E1), origen: 'permisos.js AM-18.portal: sólo su empresa' },
  { id: 'L-CT2-empresa', principal: U.CT2, instante: AHORA, recurso: 'empresa', esperado: s(E.E2), origen: 'permisos.js AM-18.portal' },
  { id: 'L-CT1-informe', principal: U.CT1, instante: AHORA, recurso: 'informe', esperado: s(I.I1C), origen: 'V25-12: el portal ofrece sólo el informe compartido' },
  { id: 'L-CT1-poliza', principal: U.CT1, instante: AHORA, recurso: 'poliza', esperado: [], origen: 'el portal v25 no muestra pólizas (resumen, riesgos, preguntas, solicitudes, informe)' },
  { id: 'L-CT1-nota', principal: U.CT1, instante: AHORA, recurso: 'nota_interna', esperado: [], origen: 'nota interna: nunca al portal' },
  { id: 'L-CT3-empresa-antes-de-vencer', principal: U.CT3, instante: antes(T2), recurso: 'empresa', esperado: s(E.E1), origen: 'acceso de portal vigente' },
  { id: 'L-CT3-empresa-vencida', principal: U.CT3, instante: T2, recurso: 'empresa', esperado: [], origen: 'acceso de portal revocado en el límite' },
  { id: 'L-CT3-informe-vencida', principal: U.CT3, instante: T2, recurso: 'informe', esperado: [], origen: 'acceso de portal revocado en el límite' },
  // Sin principal.
  { id: 'L-ANON-empresa', principal: undefined, instante: AHORA, recurso: 'empresa', esperado: [], origen: 'deny-by-default' },
  { id: 'L-ANON-informe', principal: undefined, instante: AHORA, recurso: 'informe', esperado: [], origen: 'deny-by-default' },
]

export const ESCRITURAS: readonly CasoEscritura[] = [
  { id: 'W-OP1-nota-E1', principal: U.OP1, instante: AHORA, accion: 'escribir_nota', objetivo: E.E1, autor: U.OP1, esperado: true, origen: 'Operador asignado' },
  { id: 'W-OP1-nota-E2', principal: U.OP1, instante: AHORA, accion: 'escribir_nota', objetivo: E.E2, autor: U.OP1, esperado: false, origen: 'empresa no asignada' },
  { id: 'W-OP1-nota-suplanta', principal: U.OP1, instante: AHORA, accion: 'escribir_nota', objetivo: E.E1, autor: U.ADM, esperado: false, origen: 'el autor sale de la sesión, no del formulario' },
  { id: 'W-REV-nota-E1', principal: U.REV, instante: AHORA, accion: 'escribir_nota', objetivo: E.E1, autor: U.REV, esperado: false, origen: 'D-0072 Revisor: no escribe información comercial' },
  { id: 'W-CT1-nota-E1', principal: U.CT1, instante: AHORA, accion: 'escribir_nota', objetivo: E.E1, autor: U.CT1, esperado: false, origen: 'portal' },
  { id: 'W-OP1-aprueba-ajeno', principal: U.OP1, instante: AHORA, accion: 'aprobar_informe', objetivo: I.I1B, esperado: true, origen: 'V25-11: aprueba otra persona' },
  { id: 'W-OP1-aprueba-propio', principal: U.OP1, instante: AHORA, accion: 'aprobar_informe', objetivo: I.I1B_OP1, esperado: false, origen: 'V25-11 y permisos.js AD-16: quien escribe no aprueba' },
  { id: 'W-ADM-aprueba-propio', principal: U.ADM, instante: AHORA, accion: 'aprobar_informe', objetivo: I.I1B, esperado: false, origen: 'la regla de autor vale también para el Administrador' },
  { id: 'W-ADM-aprueba-ajeno', principal: U.ADM, instante: AHORA, accion: 'aprobar_informe', objetivo: I.I1B_OP1, esperado: true, origen: 'D-0072 Administrador' },
  { id: 'W-OP2-aprueba-no-asignada', principal: U.OP2, instante: AHORA, accion: 'aprobar_informe', objetivo: I.I1B, esperado: false, origen: 'reasignado fuera de E1' },
  { id: 'W-CT1-aprueba', principal: U.CT1, instante: AHORA, accion: 'aprobar_informe', objetivo: I.I1B, esperado: false, origen: 'portal' },
  { id: 'W-ANON-aprueba', principal: undefined, instante: AHORA, accion: 'aprobar_informe', objetivo: I.I1B, esperado: false, origen: 'deny-by-default' },
]
