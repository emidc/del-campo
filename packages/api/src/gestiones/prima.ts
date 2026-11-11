// T-0051 — La prima que se escribe en el formulario de una cotización, como se escribe acá:
// «120.000,50», «120000,5», «120000.50» o «1.234.567». Devuelve el decimal con punto que
// guarda la base, o null si no es un monto positivo con hasta dos decimales.

const MONTO = /^\d{1,12}(\.\d{1,2})?$/

export const leerPrima = (escrita: string): string | null => {
  let valor = escrita.replace(/[\s$]/g, '').replace(/^US/i, '')
  if (valor.includes(',')) valor = valor.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(valor)) valor = valor.replace(/\./g, '')
  if (!MONTO.test(valor) || Number(valor) <= 0) return null
  return valor
}
