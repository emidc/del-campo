// Dónde vive cada módulo dentro de un lote exportado de Zoho.
//
// El directorio de `raw/` es el `file_id` del manifiesto de T-0004: identifica al
// archivo por contenido, así que nombrar el hash es nombrar el CSV exacto que el
// manifiesto verifica, no "el que esté primero". Vivía en el CLI de T-0013; T-0022 lo
// necesita para los mismos tres módulos y lo comparte acá en vez de copiarlo (R-01).

import { resolve } from 'node:path'

export const DIRECTORIO_LOTE_VS01 = 'data/zoho-export-2026-09-16'

export const DIRECTORIOS_MODULO = {
  polizas: '025738fc637310e0d368afd49868375c1cce73c263cadf9821055d59dd47bc80',
  endosos: '8ca87d205690ef89676c3a21d365d507335fcfe52ccd78206efeba28d971ca2c',
  contactos: 'fef574c156c24cd58a242fe77322b69386977b3c59522969397941732dae5501',
  cuentas: 'e2c4246d5b98ca59ecc01dac6375f73212a0c308d00b8c7c8e5920054993011e',
} as const

export type Modulo = keyof typeof DIRECTORIOS_MODULO

/** Ruta del CSV de un módulo dentro de la raíz de un lote. */
export const rutaDeModulo = (raizDelLote: string, modulo: Modulo): string =>
  resolve(raizDelLote, 'raw', DIRECTORIOS_MODULO[modulo], '0001.csv')
