// Marca como pagadas las cuotas de las pólizas en efectivo con fecha de pago hasta hoy
// (incluido). Para la primera carga: así Pagos sólo muestra lo que falta cobrar desde ahora.
//
//   DATABASE_URL=... pnpm cuotas:marcar-pagadas --usuario persona@delcampo.com.ar
//   DATABASE_URL=... pnpm cuotas:marcar-pagadas --usuario persona@delcampo.com.ar --aplicar
//
// Sin --aplicar corre todo en una transacción que se revierte y sólo informa cuántas
// marcaría. Los pagos quedan a nombre de la persona de --usuario (integrante activo del
// equipo). Correrlo dos veces no marca nada nuevo.

import postgres from 'postgres'

import { markPaidUntil } from './installment.ts'
import { todayInMendoza } from './policy-edit.ts'

const morir = (mensaje: string): never => {
  console.error(mensaje)
  process.exit(1)
}

const args = process.argv.slice(2)
const valor = (nombre: string): string | undefined => {
  const i = args.indexOf(nombre)
  return i === -1 ? undefined : args[i + 1]
}
const correo = valor('--usuario') ?? morir('Falta --usuario <correo del integrante del equipo>.')
const hoy = valor('--hoy') ?? todayInMendoza()
if (!/^\d{4}-\d{2}-\d{2}$/.test(hoy)) morir('--hoy va como AAAA-MM-DD.')
const aplicar = args.includes('--aplicar')
const url = process.env.DATABASE_URL ?? morir('Falta DATABASE_URL.')

class Simulacro extends Error {}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => undefined })
try {
  await sql.begin(async (tx) => {
    const [usuario] = await tx<{ id: string }[]>`
      select id from app_user where lower(email) = lower(${correo}) and status = 'ACTIVE' and role is not null`
    if (usuario === undefined) throw new Error(`No hay un integrante activo con el correo ${correo}.`)
    await tx`select set_config('authz.usuario_id', ${usuario.id}, true)`
    const r = await markPaidUntil(tx, hoy)
    console.log(`${aplicar ? 'Marcadas' : 'Se marcarían'} ${String(r.installments)} cuotas de ${String(r.policies)} pólizas, con fecha de pago hasta el ${hoy}.`)
    if (!aplicar) throw new Simulacro()
  })
  if (aplicar) console.log('Listo.')
} catch (error) {
  if (error instanceof Simulacro) console.log('Simulacro: no se guardó nada. Para guardar, agregá --aplicar.')
  else morir(error instanceof Error ? error.message : String(error))
} finally {
  await sql.end()
}
