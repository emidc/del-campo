// CLI de administración de accesos de Broker OS (T-0035). Hasta que exista la interfaz
// web, es la única forma de invitar, cambiar roles, dar de baja y asignar clientes.
//
//   pnpm acceso invitar    --base <nombre> --email <x> --rol <ROL> [--actor <id>] [--dias <n>]
//   pnpm acceso rol        --base <nombre> --actor <id> --usuario <id> --rol <ROL>
//   pnpm acceso baja       --base <nombre> --actor <id> --usuario <id>
//   pnpm acceso asignar    --base <nombre> --actor <id> --usuario <id> --cliente <party id>
//   pnpm acceso desasignar --base <nombre> --actor <id> --asignacion <id>
//
// `--base` repite el nombre de la base de DATABASE_URL: correr esto contra otra base que
// la que uno cree es un error que se paga con accesos reales. Usarla contra producción
// requiere la aprobación del owner (fase 2 del plan de migración); invitar no avisa a
// nadie, y avisarle a la persona lo hace un humano.
//
// La salida son identificadores y motivos, nunca emails: lo que se imprime en una
// terminal termina en un log.

import { parseArgs } from 'node:util'

import postgres from 'postgres'

import type { ResultadoAdmin } from './admin.ts'
import { asignarCliente, cambiarRol, cerrarAsignacion, darDeBaja, esRol, invitar } from './admin.ts'
import type { Rol } from './base.ts'

const USO = 'uso: pnpm acceso <invitar|rol|baja|asignar|desasignar> --base <nombre> [opciones]; ver packages/api/src/acceso/cli.ts'

const fallar = (mensaje: string): never => {
  process.stderr.write(`${mensaje}\n`)
  process.exit(2)
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    base: { type: 'string' },
    actor: { type: 'string' },
    email: { type: 'string' },
    rol: { type: 'string' },
    dias: { type: 'string' },
    usuario: { type: 'string' },
    cliente: { type: 'string' },
    asignacion: { type: 'string' },
  },
})

const requerido = (nombre: keyof typeof values): string => {
  const valor = values[nombre]
  if (valor === undefined || valor.trim() === '') return fallar(`falta --${nombre}. ${USO}`)
  return valor.trim()
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Un id que no es un uuid se rechaza acá, antes de llegar a la base como un error crudo. */
const id = (nombre: 'actor' | 'usuario' | 'cliente' | 'asignacion'): string => {
  const valor = requerido(nombre)
  return UUID.test(valor) ? valor : fallar(`--${nombre} debe ser un uuid`)
}

/** `--actor` sólo se omite para invitar al primer Administrador; vacío no es omitirlo. */
const actorOpcional = (): string | null => (values.actor === undefined ? null : id('actor'))

const rolDe = (valor: string): Rol => (esRol(valor) ? valor : fallar(`--rol debe ser ADMINISTRADOR, OPERADOR o REVISOR`))

const url = process.env.DATABASE_URL ?? fallar('falta DATABASE_URL')
const nombreBase = new URL(url).pathname.replace(/^\//, '')
if (requerido('base') !== nombreBase) fallar(`--base no coincide con la base de DATABASE_URL (${nombreBase})`)

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => undefined })

const correr = async (): Promise<ResultadoAdmin<unknown>> => {
  const [comando] = positionals
  switch (comando) {
    case 'invitar': {
      const dias = values.dias === undefined ? undefined : Number(values.dias)
      return invitar(sql, {
        actor: actorOpcional(),
        email: requerido('email'),
        rol: rolDe(requerido('rol')),
        ...(dias === undefined ? {} : { dias }),
      })
    }
    case 'rol':
      return cambiarRol(sql, { actor: id('actor'), usuarioId: id('usuario'), rol: rolDe(requerido('rol')) })
    case 'baja':
      return darDeBaja(sql, { actor: id('actor'), usuarioId: id('usuario') })
    case 'asignar':
      return asignarCliente(sql, { actor: id('actor'), usuarioId: id('usuario'), clientePartyId: id('cliente') })
    case 'desasignar':
      return cerrarAsignacion(sql, { actor: id('actor'), asignacionId: id('asignacion') })
    default:
      return fallar(USO)
  }
}

try {
  const resultado = await correr()
  process.stdout.write(`${JSON.stringify(resultado)}\n`)
  process.exitCode = resultado.ok ? 0 : 1
} finally {
  await sql.end()
}
