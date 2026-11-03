// Qué puede hacer cada rol en Communication OS (T-0035, matriz de `permisos.js` del
// prototipo v25, sección Comunicación, con la decisión del owner del 2026-11-03: el
// Administrador también responde). La misma regla vive en la base, en
// `authz_puede_leer()` y `authz_puede_responder()` (migración 0005): la aplicación decide
// la acción y la explica; RLS decide las filas (D-0022). Una prueba compara las dos capas.

export type RolInterno = 'ADMINISTRADOR' | 'OPERADOR' | 'REVISOR'

export type AccionCommunication = 'conversacion.consultar' | 'conversacion.responder'

const PERMITIDOS: Readonly<Record<AccionCommunication, readonly RolInterno[]>> = {
  'conversacion.consultar': ['ADMINISTRADOR', 'OPERADOR'],
  'conversacion.responder': ['ADMINISTRADOR', 'OPERADOR'],
}

export const puede = (rol: RolInterno, accion: AccionCommunication): boolean => PERMITIDOS[accion].includes(rol)

/** Lo que se le dice a quien no puede: quién sí puede, sin datos (AM-18 del prototipo). */
export const EXPLICACION: Readonly<Record<AccionCommunication, string>> = {
  'conversacion.consultar': 'Comunicación la ven el Administrador y el Operador Del Campo.',
  'conversacion.responder': 'Responden conversaciones el Administrador y el Operador Del Campo.',
}
