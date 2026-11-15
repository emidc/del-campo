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
