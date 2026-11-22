// Los datos de póliza de Zoho que la ficha muestra además de la prima: estado, productor,
// premio, suma asegurada y forma de pago. Un solo lugar para el importador y para el
// script que completa las pólizas ya cargadas (`polizas-zoho-cli.ts`).

import { parseAmount, statusFromZoho } from '../policy-edit.ts'
import { CAMPOS_POLIZA } from './zoho-fields.ts'

export interface DatosDePoliza {
  readonly status: string | null
  readonly producer: string | null
  readonly totalPremium: string | null
  readonly sumInsured: string | null
  readonly paymentMethod: string | null
}

const texto = (valor: string | undefined): string | null => {
  const limpio = valor?.trim() ?? ''
  return limpio === '' ? null : limpio.slice(0, 120)
}

const importe = (valor: string | undefined): string | null => parseAmount(valor ?? '') ?? null

export const datosDePoliza = (raw: Readonly<Record<string, string | undefined>>): DatosDePoliza => ({
  status: statusFromZoho(raw[CAMPOS_POLIZA.estado]),
  producer: texto(raw[CAMPOS_POLIZA.productor]),
  totalPremium: importe(raw[CAMPOS_POLIZA.premio]),
  sumInsured: importe(raw[CAMPOS_POLIZA.sumaAsegurada]),
  paymentMethod: texto(raw[CAMPOS_POLIZA.formaDePago]),
})
