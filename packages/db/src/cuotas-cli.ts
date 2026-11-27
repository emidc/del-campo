// Marca como pagadas las cuotas con fecha de pago hasta hoy (incluido) de las pólizas que
// muestra Pagos. Para la primera carga: así Pagos sólo muestra lo que falta cobrar desde ahora.
//
//   pnpm cuotas:marcar-pagadas --base <nombre> [--host <host>] --usuario <correo>            # simulacro
//   pnpm cuotas:marcar-pagadas --base <nombre> [--host <host>] --usuario <correo> --aplicar  # guarda
//
// `--base` repite el nombre de la base de DATABASE_URL y, contra un host que no es local,
// `--host` repite el host: correrlo contra otra base que la que uno cree se paga con datos
// reales. Contra producción requiere la aprobación de Emiliano. Sin --aplicar corre todo
// en una transacción que se revierte y sólo informa cuántas marcaría. Los pagos quedan a
// nombre del integrante activo del equipo de --usuario. Correrlo dos veces no marca nada nuevo.

import { parseArgs } from 'node:util'

import postgres from 'postgres'

import { markPaidUntil } from './installment.ts'
import { todayInMendoza } from './policy-edit.ts'

const morir = (mensaje: string): never => {
  process.stderr.write(`${mensaje}\n`)
  process.exit(2)
}

const { values } = parseArgs({
  options: {
    base: { type: 'string' },
    host: { type: 'string' },
    usuario: { type: 'string' },
    aplicar: { type: 'boolean', default: false },
  },
})

const url = process.env.DATABASE_URL ?? morir('Falta DATABASE_URL.')
const destino = new URL(url)
const nombreBase = destino.pathname.replace(/^\//, '')
if (values.base !== nombreBase) morir(`--base no coincide con la base de DATABASE_URL (${nombreBase}).`)
const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
if (!HOSTS_LOCALES.has(destino.hostname) && values.host !== destino.hostname)
  morir('DATABASE_URL apunta a un host remoto: repetilo con --host para confirmar (requiere la aprobación de Emiliano).')
const correo = values.usuario ?? morir('Falta --usuario <correo del integrante del equipo>.')
const hoy = todayInMendoza()

class Simulacro extends Error {}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => undefined })
try {
  await sql.begin(async (tx) => {
    const [usuario] = await tx<{ id: string }[]>`
      select id from app_user where lower(email) = lower(${correo}) and status = 'ACTIVE' and role is not null`
    if (usuario === undefined) throw new Error('--usuario no es un integrante activo del equipo.')
    await tx`select set_config('authz.usuario_id', ${usuario.id}, true)`
    const r = await markPaidUntil(tx, hoy)
    console.log(`${values.aplicar ? 'Marcadas' : 'Se marcarían'} ${String(r.installments)} cuotas de ${String(r.policies)} pólizas, con fecha de pago hasta el ${hoy}.`)
    if (!values.aplicar) throw new Simulacro()
  })
  if (values.aplicar) console.log('Listo.')
} catch (error) {
  if (error instanceof Simulacro) console.log('Simulacro: no se guardó nada. Para guardar, agregá --aplicar.')
  else morir(error instanceof Error ? error.message : String(error))
} finally {
  await sql.end()
}
