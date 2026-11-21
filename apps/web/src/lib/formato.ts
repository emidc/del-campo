/**
 * Una fecha `AAAA-MM-DD` como se lee en Argentina, `DD/MM/AAAA`. Sin fecha, una raya.
 * Lo que no tenga esa forma se muestra tal cual: no se adivina.
 */
export const fecha = (valor: string | null | undefined): string => {
  if (valor === null || valor === undefined || valor === '') return '—'
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor)
  return partes === null ? valor : `${partes[3] ?? ''}/${partes[2] ?? ''}/${partes[1] ?? ''}`
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** `AAAA-MM-DD` como «Domingo 15 de noviembre». */
export const fechaLarga = (valor: string): string => {
  const d = new Date(`${valor.slice(0, 10)}T12:00:00Z`)
  return `${DIAS[d.getUTCDay()] ?? ''} ${String(d.getUTCDate())} de ${MESES[d.getUTCMonth()] ?? ''}`
}

const ESTADOS_DE_POLIZA: Readonly<Record<string, string>> = {
  ACTIVE: 'Vigente',
  INACTIVE: 'No vigente',
  EXPIRED: 'Vencida',
  RENEWED: 'Renovada',
  CANCELLED: 'Anulada',
  CANCELED: 'Anulada',
}

/** El estado de una versión de póliza viene del origen como texto libre: se traduce lo conocido y el resto se muestra tal cual. */
export const estadoDePoliza = (valor: string | null | undefined): string => {
  if (valor === null || valor === undefined || valor === '') return '—'
  return ESTADOS_DE_POLIZA[valor.trim().toUpperCase()] ?? valor
}

const CONCILIACION: Readonly<Record<string, string>> = {
  VERIFIED: 'Verificado',
  ZOHO_UNVERIFIED: 'Sin verificar (viene de Zoho)',
  PENDING: 'Pendiente',
  UNRESOLVED: 'Sin resolver',
  RESOLVED: 'Resuelta',
}

/** Estados de conciliación y de resolución documental, en español; lo desconocido se muestra tal cual. */
export const estadoDocumental = (valor: string): string => CONCILIACION[valor] ?? valor

/** Una marca de tiempo ISO como `DD/MM/AAAA HH:MM`, con la hora tal como viene guardada. */
export const fechaHora = (marca: string): string => `${fecha(marca)} ${marca.slice(11, 16)}`.trim()

const HORA_ARGENTINA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** Un instante como `DD/MM/AAAA HH:MM`, en hora de Argentina. Para lo que llega con hora propia, como un mensaje. */
export const instante = (momento: Date): string => HORA_ARGENTINA.format(momento).replace(',', '')

const IMPORTE = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

/** Un importe guardado («12345.5») como se lee en Argentina («12.345,5»), con su moneda. */
export const importe = (valor: string | null | undefined, moneda?: string | null): string => {
  if (valor === null || valor === undefined || valor === '') return '—'
  const n = Number(valor)
  const texto = Number.isFinite(n) ? IMPORTE.format(n) : valor
  return moneda === null || moneda === undefined || moneda === '' ? texto : `${texto} ${moneda}`
}

/** El importe para precargar en un campo editable: sin moneda, en formato argentino. */
export const importeEditable = (valor: string | null | undefined): string => (valor === null || valor === undefined ? '' : importe(valor))

const TIPOS_DE_ENDOSO: Readonly<Record<string, string>> = {
  REFACTURACION: 'Refacturación',
  ANULACION: 'Anulación',
  CAMBIODECOBERTURA: 'Cambio de cobertura',
  CAMBIO_COBERTURA: 'Cambio de cobertura',
  CAMBIO_DE_COBERTURA: 'Cambio de cobertura',
}

/**
 * El tipo de un endoso: Refacturación, Anulación o Cambio de cobertura, sin importar cómo
 * lo haya escrito el origen. Lo desconocido se muestra tal cual; sin endoso, una raya.
 */
export const tipoDeEndoso = (kind: string | null | undefined): string => {
  if (kind === null || kind === undefined || kind.trim() === '' || kind === 'DESCONOCIDO') return '—'
  const clave = kind.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, '_')
  return TIPOS_DE_ENDOSO[clave] ?? TIPOS_DE_ENDOSO[clave.replace(/_/g, '')] ?? kind
}
