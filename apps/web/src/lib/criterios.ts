import type { PolicySearchCriteria } from '@del-campo/api'

/** Los siete candidatos de `DOMAIN.md` §65. Ni uno más: la búsqueda está acotada a eso. */
export const CAMPOS = [
  { nombre: 'nombre', etiqueta: 'Nombre' },
  { nombre: 'apellido', etiqueta: 'Apellido' },
  { nombre: 'dni', etiqueta: 'DNI' },
  { nombre: 'cuit', etiqueta: 'CUIT' },
  { nombre: 'empresa', etiqueta: 'Empresa' },
  { nombre: 'poliza', etiqueta: 'Número de póliza' },
  { nombre: 'aseguradora', etiqueta: 'Aseguradora' },
] as const

export type ValorDeParametro = string | string[] | undefined

const texto = (valor: ValorDeParametro): string => {
  const crudo = Array.isArray(valor) ? valor[0] : valor
  return crudo === undefined ? '' : crudo.trim()
}

export const fechaDeHoy = (): string => new Date().toISOString().slice(0, 10)

export interface Valores {
  readonly nombre: string
  readonly apellido: string
  readonly dni: string
  readonly cuit: string
  readonly empresa: string
  readonly poliza: string
  readonly aseguradora: string
}

export interface CriteriosLeidos {
  readonly valores: Valores
  /** `null` cuando no se cargó ningún criterio: sin eso no hay búsqueda que hacer. */
  readonly criterios: PolicySearchCriteria | null
}

export const valorDe = (valores: Valores, nombre: (typeof CAMPOS)[number]['nombre']): string =>
  valores[nombre]

export const leerCriterios = (
  params: Record<string, ValorDeParametro>,
  asOf: string,
): CriteriosLeidos => {
  const valores: Valores = {
    nombre: texto(params.nombre),
    apellido: texto(params.apellido),
    dni: texto(params.dni),
    cuit: texto(params.cuit),
    empresa: texto(params.empresa),
    poliza: texto(params.poliza),
    aseguradora: texto(params.aseguradora),
  }

  if (CAMPOS.every((campo) => valores[campo.nombre] === '')) {
    return { valores, criterios: null }
  }

  // `exactOptionalPropertyTypes` obliga a omitir la clave en vez de pasarla como
  // `undefined`; por eso el spread condicional en lugar de asignar y limpiar después.
  const criterios: PolicySearchCriteria = {
    asOf,
    ...(valores.nombre === '' ? {} : { firstName: valores.nombre }),
    ...(valores.apellido === '' ? {} : { lastName: valores.apellido }),
    ...(valores.dni === '' ? {} : { dni: valores.dni }),
    ...(valores.cuit === '' ? {} : { cuit: valores.cuit }),
    ...(valores.empresa === '' ? {} : { company: valores.empresa }),
    ...(valores.poliza === '' ? {} : { policyNumber: valores.poliza }),
    ...(valores.aseguradora === '' ? {} : { insurer: valores.aseguradora }),
  }

  return { valores, criterios }
}
