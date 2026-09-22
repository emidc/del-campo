// T-0013, paso 2 — la taxonomía de clases de fallo se fija por escrito ANTES de mirar
// una sola fila del lote real. Una clasificación derivada de lo que salió es una
// clasificación que siempre confirma lo que ya pasó: el orden importa tanto como el
// contenido. → instrucción del owner, 2026-09-22
//
// `erasableSyntaxOnly` (tsconfig.json) prohíbe `enum`: son uniones de string literal.
//
// MISSING_POLICY_NUMBER se agregó el 2026-09-22 por una revisión de código posterior a
// la corrida real (la fila 183 original de policies.ts inventaba un policy_number con
// fila.source_record_id cuando el campo venía ausente), no por haber mirado el lote:
// "taxonomía antes que datos" sigue intacto — esta clase nace de leer el código del
// importador, nunca de una fila real. → ops/evidence/T-0013.md, revisión ciega R-33

export const CLASES_DE_FALLO = [
  'NOT_IN_SCOPE',
  'MISSING_INSURER',
  'UNKNOWN_INSURER_STRING',
  'MISSING_POLICY_NUMBER',
  'DUPLICATE_INSURER_NUMBER',
  'MISSING_HOLDER',
  'UNPARSEABLE_TERM_DATES',
  'OVERLAPPING_VERSION',
  'RENEWAL_UNRESOLVED',
] as const

export type ClaseDeFallo = (typeof CLASES_DE_FALLO)[number]

/**
 * Motivo y decisión/invariante detrás de cada clase. Vive en código (no sólo en el plan)
 * para que el reporte final (`report.ts`) pueda citarla junto a cada conteo.
 */
export const MOTIVO_POR_CLASE: Record<ClaseDeFallo, string> = {
  NOT_IN_SCOPE:
    "Policy no cumple Estado = 'VIGENTE' OR Vigencia Fin ∈ [2026-01-01, 2026-09-16]. " +
    'Regla exacta de D-0031/T-0004; no se reinterpreta acá.',
  MISSING_INSURER:
    'Compañía.id vacío o no resuelve a ninguna fila de Compañía. D-0038: una Policy sin ' +
    'aseguradora no puede formar el par (insurerId, policyNumber) y no entra al dominio.',
  UNKNOWN_INSURER_STRING:
    'La aseguradora no matchea el catálogo curado ni sus alias (catalog-curation-approved). ' +
    'D-0021: se reporta para resolución humana; nunca crea un Insurer nuevo.',
  MISSING_POLICY_NUMBER:
    '"Número de póliza" ausente o vacío. Igual que D-0038 trata a una Policy sin ' +
    'aseguradora: sin número no puede formar el par (insurerId, policyNumber), y no se ' +
    'completa con el "ID de registro" de Zoho ni con ningún otro valor que sólo aparente ' +
    'ser un número de póliza — T-0016/§65 busca por ese campo, y un valor inventado con ' +
    'apariencia contractual sería peor que la ausencia visible.',
  DUPLICATE_INSURER_NUMBER:
    'Dos o más filas fuente comparten (insurerId, policyNumber). D-0038/§27: es una ' +
    'anomalía, no un caso válido del dominio; todas las filas del grupo quedan fuera y ' +
    'reportadas, ninguna se descarta en silencio ni se elige arbitrariamente cuál vale.',
  MISSING_HOLDER:
    'Ni Contacto.id ni Cuenta.id resuelven a una Party dentro del lote. D-0036: ' +
    'holderPartyId es obligatorio y único; sin tomador resuelto no hay PolicyVersion.',
  UNPARSEABLE_TERM_DATES:
    'Vigencia Inicio/Fin ausente o no parseable. policy_version.term_start_date/' +
    'term_end_date son NOT NULL (0001_vs01_core_schema.sql); no se completa con un ' +
    'valor por defecto que implique una fecha que el origen no dio.',
  OVERLAPPING_VERSION:
    'El intervalo efectivo de la versión candidata solapa con una versión ya cargada de ' +
    'la misma Policy. El EXCLUDE de policy_version (INV-PV-003) la rechazaría; se ' +
    'detecta antes de intentar el INSERT para clasificarla, no para silenciar el error.',
  RENEWAL_UNRESOLVED:
    'Las señales de §33 (holder + aseguradora + fechas adyacentes + producto) no alcanzan ' +
    'para fijar renewedFromPolicyId con confianza. Se cuenta como UNRESOLVED; no se ' +
    'inventa una cadena. → D-0034',
}

export interface Excepcion {
  readonly modulo: 'Polizas' | 'Endosos' | 'Contactos' | 'Cuentas'
  readonly sourceRecordId: string
  readonly clase: ClaseDeFallo
  readonly detailCode: string
}
