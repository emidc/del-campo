// Accesos de Risk OS con AUTH_MODE=oidc (T-0035): invitar, cambiar rol, dar de baja y asignar
// organizaciones, contra la base de RISK_DATABASE_URL o, con `--hosteada`, contra la de
// RISK_HOSTED_DATABASE_URL (como `cli-persona.ts`).
//
//   pnpm --filter @del-campo/risk run acceso invitar --email <x> --rol <ROL> (--persona <PER-…> | --nombre "<nombre>") [--actor <PER-…>] [--dias <n>]
//   pnpm --filter @del-campo/risk run acceso rol --actor <PER-…> --persona <PER-…> --rol <ROL>
//   pnpm --filter @del-campo/risk run acceso baja --actor <PER-…> --persona <PER-…>
//   pnpm --filter @del-campo/risk run acceso asignar --actor <PER-…> --persona <PER-…> --org <organización>
//   pnpm --filter @del-campo/risk run acceso desasignar --actor <PER-…> --persona <PER-…> --org <organización>
//
// **Es una herramienta restringida de administración, no un mecanismo de autenticación.** Quien
// la corre ya tiene la credencial de la base: ése es el control real. `--actor` no autentica a
// nadie, es la atribución que queda en la auditoría; la CLI comprueba que nombre a un
// Administrador activo para que no sea arbitraria.
//
// Para una persona que ya usa Risk OS con contraseña, `--persona` con su id: su primer login con
// Google se vincula a ella y conserva su autoría (plan de migración, fase 4). Usarla contra la
// base hosteada requiere la aprobación del owner; invitar no avisa a nadie.
//
// La salida son identificadores y motivos, nunca emails ni nombres: lo que se imprime en una
// terminal termina en un log.

import { parseArgs } from 'node:util'

import { conectar, destinoDe, errorSinDatos, HOSTED_FLAG, type Destino } from '../persistence/database.ts'
import { migrate, pendientesSinCrear } from '../persistence/migrations.ts'
import { asignar, cambiarRol, darDeBaja, esRol, invitar, type ResultadoAdmin } from './accesos.ts'
import type { RolInterno } from '../domain/permisos.ts'

const DEFAULT_URL = 'postgres://localhost:5432/delcampo_risk_dev'
const USO = `uso: acceso <invitar|rol|baja|asignar|desasignar> [opciones] [${HOSTED_FLAG}]; ver contexts/risk/src/application/cli-acceso.ts`
const PERSONA = /^PER-[0-9A-HJKMNP-TV-Z]{26}$/

const fallar = (mensaje: string): never => {
  process.stderr.write(`✗ ${mensaje}\n`)
  process.exit(2)
}

const d = destinoDe(process.argv.slice(2), process.env, DEFAULT_URL)
if ('error' in d) fallar(d.error)
const { destino, args } = d as { destino: Destino; args: string[] }

const { positionals, values } = parseArgs({
  args,
  allowPositionals: true,
  options: {
    actor: { type: 'string' },
    persona: { type: 'string' },
    nombre: { type: 'string' },
    email: { type: 'string' },
    rol: { type: 'string' },
    dias: { type: 'string' },
    org: { type: 'string' },
  },
})

const requerido = (nombre: keyof typeof values): string => {
  const valor = values[nombre]
  if (valor === undefined || valor.trim() === '') return fallar(`falta --${nombre}. ${USO}`)
  return valor.trim()
}
const persona = (nombre: 'actor' | 'persona'): string => {
  const valor = requerido(nombre)
  return PERSONA.test(valor) ? valor : fallar(`--${nombre} debe ser un id de persona (PER-…)`)
}
const rolDe = (valor: string): RolInterno => (esRol(valor) ? valor : fallar('--rol debe ser ADMINISTRADOR, OPERADOR o REVISOR'))

const correr = async (sql: ReturnType<typeof conectar>): Promise<ResultadoAdmin<unknown>> => {
  const [comando] = positionals
  switch (comando) {
    case 'invitar': {
      if ((values.persona === undefined) === (values.nombre === undefined)) fallar(`invitar lleva --persona o --nombre, uno de los dos. ${USO}`)
      const dias = values.dias === undefined ? undefined : Number(values.dias)
      return invitar(sql, {
        actor: values.actor === undefined ? null : persona('actor'),
        email: requerido('email'),
        rol: rolDe(requerido('rol')),
        ...(values.persona === undefined ? { nombre: requerido('nombre') } : { personaId: persona('persona') }),
        ...(dias === undefined ? {} : { dias }),
      })
    }
    case 'rol':
      return cambiarRol(sql, { actor: persona('actor'), personaId: persona('persona'), rol: rolDe(requerido('rol')) })
    case 'baja':
      return darDeBaja(sql, { actor: persona('actor'), personaId: persona('persona') })
    case 'asignar':
    case 'desasignar':
      return asignar(sql, { actor: persona('actor'), personaId: persona('persona'), organizacionId: requerido('org'), vigente: comando === 'asignar' })
    default:
      return fallar(USO)
  }
}

const sql = conectar(destino)
try {
  if (destino.hosteada) {
    const pendientes = await pendientesSinCrear(sql)
    if (pendientes.length > 0) throw new Error(`${destino.nombre} no tiene aplicadas ${pendientes.join(', ')}`)
  } else {
    await migrate(sql)
  }
  const r = await correr(sql)
  if (r.ok) {
    const valor = r.valor as { personaId?: string; invitacionId?: string; venceEn?: Date } | null
    const detalle = valor?.personaId === undefined ? '' : ` persona ${valor.personaId}, invitación ${String(valor.invitacionId)}, vence ${String(valor.venceEn?.toISOString())}`
    process.stdout.write(`✓ ${positionals[0] ?? ''}${detalle}\n`)
  } else {
    process.stderr.write(`✗ rechazado: ${r.motivo}\n`)
    process.exitCode = 1
  }
} catch (e) {
  process.stderr.write(`✗ ${destino.hosteada ? errorSinDatos(e) : e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
} finally {
  await sql.end()
}
