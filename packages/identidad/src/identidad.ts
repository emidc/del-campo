// La identidad común de D-0077: el par (proveedor, sujeto). Es lo único que los tres
// contextos comparten. Cada uno lo vincula a su propio usuario interno, en su base.

/** C1 sólo usa `google`. El enlace por correo, cuando llegue, será otro proveedor. */
export type Proveedor = 'google'

export const PROVEEDORES: readonly Proveedor[] = ['google']

export const esProveedor = (valor: unknown): valor is Proveedor =>
  typeof valor === 'string' && (PROVEEDORES as readonly string[]).includes(valor)

/** Quién es, según el proveedor. No dice si puede entrar: eso es la admisión. */
export interface Identidad {
  readonly proveedor: Proveedor
  /** Estable por proveedor: el `sub` de Google. Es la clave, no el email. */
  readonly sujeto: string
  /** Se guarda para mostrar e invitar. Una cuenta puede cambiarlo. */
  readonly email: string
  readonly emailVerificado: boolean
  readonly nombre: string | null
}

export const normalizarEmail = (valor: string): string => valor.trim().toLowerCase()

/** Una identidad sin sujeto o sin email no identifica a nadie. */
export const identidadUtilizable = (identidad: Identidad): boolean =>
  identidad.sujeto.trim() !== '' && identidad.email.trim() !== ''
