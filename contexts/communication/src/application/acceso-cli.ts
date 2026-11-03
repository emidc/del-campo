// CLI de administración de accesos de Communication OS (T-0035). Hasta que exista la
// interfaz, es la única forma de invitar, cambiar roles y dar de baja.
//
//   pnpm --filter @del-campo/communication acceso invitar --base <nombre> --email <x> --rol <ROL> [--actor <id>] [--dias <n>]
//   pnpm --filter @del-campo/communication acceso rol     --base <nombre> --actor <id> --usuario <id> --rol <ROL>
//   pnpm --filter @del-campo/communication acceso baja    --base <nombre> --actor <id> --usuario <id>
//
// **Es una herramienta restringida de administración, no un mecanismo de autenticación.**
// Quien la corre ya tiene la credencial de la base con privilegios de dueño: ese es el
// control real. `--actor` no autentica a nadie: es la atribución que queda en la
// auditoría. La CLI comprueba que nombre a un Administrador ACTIVE para que no sea
// arbitraria, pero cualquiera con la credencial podría escribir otro uuid.
//
// `--base` repite el nombre de la base de COMMUNICATION_DATABASE_URL, y contra un host
// que no es local hay que repetirlo también con `--host`. Usarla contra producción
// requiere la aprobación del owner (fase 3 del plan de migración); invitar no avisa a
// nadie, y avisarle a la persona lo hace un humano.
//
// La salida son identificadores y motivos, nunca emails: lo que se imprime en una
// terminal termina en un log.

import { parseArgs } from 'node:util'

import { connect } from '../persistence/database.ts'
import { cambiarRol, darDeBaja, esRol, invitar, type ResultadoAdmin } from './acceso.ts'
import type { Rol } from '../persistence/acceso.ts'

const USO =
  'uso: acceso <invitar|rol|baja> --base <nombre> [--host <host>] [opciones]; ver contexts/communication/src/application/acceso-cli.ts'

const fallar = (mensaje: string): never => {
  process.stderr.write(`${mensaje}\n`)
  process.exit(2)
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    base: { type: 'string' },
    host: { type: 'string' },
    actor: { type: 'string' },
    email: { type: 'string' },
    rol: { type: 'string' },
    dias: { type: 'string' },
    usuario: { type: 'string' },
  },
})

const requerido = (nombre: keyof typeof values): string => {
  const valor = values[nombre]
  if (valor === undefined || valor.trim() === '') return fallar(`falta --${nombre}. ${USO}`)
  return valor.trim()
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const id = (nombre: 'actor' | 'usuario'): string => {
  const valor = requerido(nombre)
  return UUID.test(valor) ? valor : fallar(`--${nombre} debe ser un uuid`)
}

/** `--actor` sólo se omite para invitar al primer Administrador; vacío no es omitirlo. */
const actorOpcional = (): string | null => (values.actor === undefined ? null : id('actor'))

const rolDe = (valor: string): Rol => (esRol(valor) ? valor : fallar('--rol debe ser ADMINISTRADOR, OPERADOR o REVISOR'))

const url = process.env.COMMUNICATION_DATABASE_URL ?? fallar('falta COMMUNICATION_DATABASE_URL')
const nombreBase = new URL(url).pathname.replace(/^\//, '')
if (requerido('base') !== nombreBase) fallar(`--base no coincide con la base de COMMUNICATION_DATABASE_URL (${nombreBase})`)

const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const host = new URL(url).hostname
if (!HOSTS_LOCALES.has(host) && values.host !== host) {
  fallar('COMMUNICATION_DATABASE_URL apunta a un host remoto: repetilo con --host para confirmar (requiere aprobación del owner)')
}

const sql = connect(url)

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
