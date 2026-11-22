// T-0061 — Qué muestra la sección Riesgos de la ficha: las pestañas internas, los nombres de
// cada valor guardado y el código que se le sugiere a un ítem nuevo. El componente sólo dibuja.

import type { RiskList } from '@del-campo/api'

export const SUBSECCIONES = ['riesgos', 'acciones', 'transferencia', 'fuentes', 'relevamientos', 'conclusiones'] as const
export type Subseccion = (typeof SUBSECCIONES)[number]

export const esSubseccion = (valor: string | undefined): valor is Subseccion =>
  valor !== undefined && (SUBSECCIONES as readonly string[]).includes(valor)

export const LISTA_DE: Readonly<Partial<Record<Subseccion, RiskList>>> = {
  riesgos: 'RIESGO',
  acciones: 'ACCION',
  transferencia: 'TRANSFERENCIA',
  fuentes: 'FUENTE',
}

export const NOMBRE_DE_LISTA: Readonly<Record<RiskList, string>> = {
  RIESGO: 'Riesgos',
  ACCION: 'Acciones',
  TRANSFERENCIA: 'Transferencia',
  FUENTE: 'Fuentes',
}

/**
 * El código siguiente de la lista, con el formato de los que ya hay: R30 después de R29, A27
 * después de A26 (con el cero si la lista lo usa). Fuentes no se numera: queda vacío.
 */
export const codigoSiguiente = (prefijo: string, codigos: readonly string[]): string => {
  if (prefijo === '') return ''
  const patron = new RegExp(`^${prefijo}(\\d+)$`)
  const numeros = codigos.map((c) => patron.exec(c)).filter((m) => m !== null)
  const mayor = Math.max(0, ...numeros.map((m) => Number(m[1])))
  const ancho = Math.max(1, ...numeros.map((m) => m[1]?.length ?? 1))
  return `${prefijo}${String(mayor + 1).padStart(ancho, '0')}`
}

export const RESULTADO: Readonly<Record<string, string>> = {
  CUMPLE: 'Cumple',
  PARCIAL: 'Parcial',
  NO_CUMPLE: 'No cumple',
  NO_EXISTE: 'No existe',
  NO_VERIFICADO: 'No verificado',
}

export const ASPECTO: Readonly<Record<string, string>> = {
  PROTECCION: 'Protección',
  MANTENIMIENTO: 'Mantenimiento',
  PRUEBA: 'Prueba',
  HALLAZGO: 'Hallazgo',
}

export const PRIORIDAD: Readonly<Record<string, string>> = { CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' }

export const ESTADO_DE_CONDICION: Readonly<Record<string, string>> = {
  DESCONOCIDO: 'Desconocida',
  DECLARADO: 'Declarada por el cliente',
  CONFIRMADO: 'Confirmada',
  PROPUESTO: 'Propuesta por el agente',
}

export const NIVEL: Readonly<Record<number, string>> = {
  1: '1 · Orientar',
  2: '2 · Caracterizar',
  3: '3 · Cobertura',
  4: '4 · Normativa o mercado',
}

/** `zona_inundable` → «Zona inundable». */
export const atributo = (clave: string): string => {
  const texto = clave.replaceAll('_', ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
