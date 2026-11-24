// Filtros de Renovaciones: el mes de fin de vigencia, los desplegables, los conjuntos de
// filtros y la paginación. Todo vive en la dirección de la página, así un filtro se puede
// compartir con un enlace. Sin dependencias de React ni de la base: se prueba solo.

import type { RenewalItem, RenewalMode, RenewalState } from '@del-campo/api'

export const POR_PAGINA = 100
/** El selector de mes va desde dos meses atrás (las vencidas recientes) hasta seis meses adelante. */
const MESES_ATRAS = 2
const MESES_ADELANTE = 6
export const TODOS = 'todos'

const NOMBRES_DE_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const

const ESTADOS: readonly RenewalState[] = ['PENDIENTE', 'CON_GESTION', 'RENOVADA']

/** Sin mayúsculas ni tildes, para comparar «Motovehículo» con «Motovehiculo». */
export const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

const MES = /^(\d{4})-(\d{2})$/

/** `YYYY-MM` desplazado `n` meses. */
const sumarMeses = (mes: string, n: number): string => {
  const [, a, m] = MES.exec(mes) ?? []
  const total = Number(a) * 12 + Number(m) - 1 + n
  return `${String(Math.floor(total / 12))}-${String((total % 12) + 1).padStart(2, '0')}`
}

const ultimoDia = (mes: string): string => {
  const [a, m] = mes.split('-').map(Number)
  const dia = new Date(Date.UTC(a ?? 0, m ?? 0, 0)).getUTCDate()
  return `${mes}-${String(dia).padStart(2, '0')}`
}

/** El mes que se muestra al entrar: el siguiente al de hoy (en diciembre, enero del año próximo). */
export const mesPorDefecto = (hoy: string): string => sumarMeses(hoy.slice(0, 7), 1)

export const etiquetaDeMes = (mes: string): string => {
  if (mes === TODOS) return 'Todos los meses'
  const [a, m] = mes.split('-')
  return `${NOMBRES_DE_MES[Number(m) - 1] ?? mes} ${a ?? ''}`
}

/** Los meses del selector, del más viejo al más nuevo. */
export const mesesDelSelector = (hoy: string): string[] => {
  const actual = hoy.slice(0, 7)
  return Array.from({ length: MESES_ATRAS + MESES_ADELANTE + 1 }, (_, i) => sumarMeses(actual, i - MESES_ATRAS))
}

/** Primer y último día de fin de vigencia que cubre el mes elegido; «Todos» cubre todo el selector. */
export const rangoDelMes = (mes: string, hoy: string): { readonly desde: string; readonly hasta: string } => {
  if (mes !== TODOS) return { desde: `${mes}-01`, hasta: ultimoDia(mes) }
  const meses = mesesDelSelector(hoy)
  return { desde: `${meses[0] ?? ''}-01`, hasta: ultimoDia(meses.at(-1) ?? '') }
}

export interface Filtros {
  readonly mes: string
  readonly modo?: RenewalMode | undefined
  readonly estado?: RenewalState | undefined
  readonly compania?: string | undefined
  readonly productor?: string | undefined
  readonly riesgos: readonly string[]
  readonly pago?: string | undefined
  readonly pagina: number
}

type Parametros = Record<string, string | string[] | undefined>

const uno = (valor: string | string[] | undefined): string | undefined => {
  const v = Array.isArray(valor) ? valor[0] : valor
  return v === undefined || v.trim() === '' ? undefined : v.trim()
}

const varios = (valor: string | string[] | undefined): string[] => {
  const lista = Array.isArray(valor) ? valor : valor === undefined ? [] : [valor]
  return [...new Set(lista.map((v) => v.trim().slice(0, 120)).filter((v) => v !== ''))].slice(0, 30)
}

export const leerFiltros = (parametros: Parametros, hoy: string): Filtros => {
  const mesPedido = uno(parametros.mes)
  const meses = mesesDelSelector(hoy)
  const mes = mesPedido === TODOS || (mesPedido !== undefined && meses.includes(mesPedido)) ? mesPedido : mesPorDefecto(hoy)
  const estadoPedido = uno(parametros.estado)
  const modoPedido = uno(parametros.modo)
  const pagina = Number(uno(parametros.pagina) ?? '1')
  return {
    mes,
    modo: modoPedido === 'MANUAL' || modoPedido === 'AUTOMATIC' ? modoPedido : undefined,
    estado: ESTADOS.find((e) => e === estadoPedido),
    compania: uno(parametros.compania)?.slice(0, 40),
    productor: uno(parametros.productor)?.slice(0, 120),
    riesgos: varios(parametros.riesgo),
    pago: uno(parametros.pago)?.slice(0, 60),
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  }
}

/**
 * La dirección con los filtros cambiados. Cambiar cualquier filtro vuelve a la página 1;
 * el mes por defecto y la página 1 no se escriben.
 */
export const enlace = (filtros: Filtros, cambios: Partial<Filtros>, hoy: string): string => {
  const f: Filtros = { ...filtros, pagina: 1, ...cambios }
  const q = new URLSearchParams()
  if (f.mes !== mesPorDefecto(hoy)) q.set('mes', f.mes)
  if (f.modo !== undefined) q.set('modo', f.modo)
  if (f.estado !== undefined) q.set('estado', f.estado)
  if (f.compania !== undefined) q.set('compania', f.compania)
  if (f.productor !== undefined) q.set('productor', f.productor)
  for (const r of f.riesgos) q.append('riesgo', r)
  if (f.pago !== undefined) q.set('pago', f.pago)
  if (f.pagina > 1) q.set('pagina', String(f.pagina))
  const s = q.toString()
  return s === '' ? '/renovaciones' : `/renovaciones?${s}`
}

/** Las renovaciones que pasan los filtros, por fin de vigencia ascendente. El mes lo aplica la consulta. */
export const filtrar = (items: readonly RenewalItem[], f: Filtros): RenewalItem[] => {
  const riesgos = new Set(f.riesgos.map(normalizar))
  const pago = f.pago === undefined ? undefined : normalizar(f.pago)
  return items
    .filter(
      (r) =>
        (f.modo === undefined || r.renewalMode === f.modo) &&
        (f.estado === undefined || r.state === f.estado) &&
        (f.compania === undefined || r.insurerId === f.compania) &&
        (f.productor === undefined || r.producer === f.productor) &&
        (riesgos.size === 0 || (r.productReference !== null && riesgos.has(normalizar(r.productReference)))) &&
        (pago === undefined || (r.paymentMethod !== null && normalizar(r.paymentMethod) === pago)),
    )
    .sort(
      (a, b) =>
        a.termEndDate.localeCompare(b.termEndDate) ||
        a.insurerName.localeCompare(b.insurerName, 'es') ||
        a.policyNumber.localeCompare(b.policyNumber, 'es'),
    )
}

export interface Pagina<T> {
  readonly filas: readonly T[]
  readonly pagina: number
  readonly paginas: number
  readonly desde: number
  readonly hasta: number
}

/** Una página de 100. Si piden una página que no existe, se muestra la última. */
export const paginar = <T>(items: readonly T[], pagina: number): Pagina<T> => {
  const paginas = Math.max(1, Math.ceil(items.length / POR_PAGINA))
  const actual = Math.min(pagina, paginas)
  const inicio = (actual - 1) * POR_PAGINA
  const filas = items.slice(inicio, inicio + POR_PAGINA)
  return { filas, pagina: actual, paginas, desde: filas.length === 0 ? 0 : inicio + 1, hasta: inicio + filas.length }
}

/** Los valores distintos de un campo, con cuántas renovaciones quedan al elegir cada uno. */
export const opcionesDe = (items: readonly RenewalItem[], campo: (r: RenewalItem) => string | null): { valor: string; cuenta: number }[] => {
  const cuentas = new Map<string, number>()
  for (const r of items) {
    const v = campo(r)
    if (v !== null && v.trim() !== '') cuentas.set(v, (cuentas.get(v) ?? 0) + 1)
  }
  return [...cuentas.entries()].map(([valor, cuenta]) => ({ valor, cuenta })).sort((a, b) => a.valor.localeCompare(b.valor, 'es'))
}

// ── Conjuntos de filtros ──────────────────────────────────────────────────────

export interface Compania {
  readonly id: string
  readonly name: string
}

export interface Conjunto {
  readonly nombre: string
  readonly filtros: Filtros
}

const VACIOS: Omit<Filtros, 'mes'> = { riesgos: [], pagina: 1 }

/**
 * Los conjuntos que se aplican con una pill. Reemplazan todos los filtros. La compañía se
 * busca por nombre entre las activas; si no está, el conjunto no se ofrece.
 */
export const conjuntos = (hoy: string, companias: readonly Compania[]): Conjunto[] => {
  const laSegunda = companias.find((c) => normalizar(c.name) === 'la segunda') ?? companias.find((c) => normalizar(c.name).includes('la segunda'))
  const lista: Conjunto[] = []
  if (laSegunda !== undefined)
    lista.push({
      nombre: 'La Segunda Autos',
      filtros: {
        ...VACIOS,
        mes: mesPorDefecto(hoy),
        compania: laSegunda.id,
        riesgos: ['Automotor', 'Motovehiculo', 'TRAILER', 'Flota automotor'],
      },
    })
  lista.push({ nombre: 'Pago en efectivo', filtros: { ...VACIOS, mes: TODOS, pago: 'Efectivo' } })
  return lista
}

const mismos = (a: readonly string[], b: readonly string[]): boolean => {
  const x = new Set(a.map(normalizar))
  const y = new Set(b.map(normalizar))
  return x.size === y.size && [...x].every((v) => y.has(v))
}

/** Si los filtros de la pantalla son exactamente los del conjunto (sin contar la página). */
export const esConjuntoActivo = (f: Filtros, c: Conjunto): boolean =>
  f.mes === c.filtros.mes &&
  f.modo === c.filtros.modo &&
  f.estado === c.filtros.estado &&
  f.compania === c.filtros.compania &&
  f.productor === c.filtros.productor &&
  mismos(f.riesgos, c.filtros.riesgos) &&
  (f.pago === undefined ? c.filtros.pago === undefined : c.filtros.pago !== undefined && normalizar(f.pago) === normalizar(c.filtros.pago))

/** Si hay algún filtro distinto de los de entrada (mes siguiente y nada más). */
export const hayFiltros = (f: Filtros, hoy: string): boolean =>
  f.mes !== mesPorDefecto(hoy) ||
  f.modo !== undefined ||
  f.estado !== undefined ||
  f.compania !== undefined ||
  f.productor !== undefined ||
  f.riesgos.length > 0 ||
  f.pago !== undefined
