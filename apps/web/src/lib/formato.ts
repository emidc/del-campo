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
