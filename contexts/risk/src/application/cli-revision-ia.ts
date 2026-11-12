// La revisión de IA que habilita la aprobación interna por operador único (D-0083, T-0041), contra
// la base de RISK_DATABASE_URL o, con `--hosteada`, contra la de RISK_HOSTED_DATABASE_URL (como
// `cli-organizacion.ts`).
//
//   pnpm --filter @del-campo/risk run revision-ia registrar --actor <PER-…> --objeto <EVA-…|ACC-…|TRF-…> \
//     --modelo <modelo> --hallazgos <texto> [--correcciones <texto>]
//
// `--objeto` es la versión exacta que se revisó: una reevaluación posterior necesita la suya.
// `--actor` es la atribución en la auditoría y tiene que ser un Administrador activo. Registrar
// la revisión no aprueba nada: la aprobación la hace la persona en la app, 24 horas después del
// registro de esa versión. La salida es el id, nunca el texto.

import { parseArgs } from 'node:util'

import { conectar, destinoDe, errorSinDatos, HOSTED_FLAG, type Destino } from '../persistence/database.ts'
import { migrate, pendientesSinCrear } from '../persistence/migrations.ts'
import { registrarRevisionIa } from './operador-unico.ts'

const DEFAULT_URL = 'postgres://localhost:5432/delcampo_risk_dev'
const USO = `uso: revision-ia registrar --actor <PER-…> --objeto <EVA-…|ACC-…|TRF-…> --modelo <x> --hallazgos <x> [--correcciones <x>] [${HOSTED_FLAG}]`

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
    objeto: { type: 'string' },
    modelo: { type: 'string' },
    hallazgos: { type: 'string' },
    correcciones: { type: 'string' },
  },
})

const requerido = (nombre: keyof typeof values): string => {
  const valor = values[nombre]
  if (valor === undefined || valor.trim() === '') return fallar(`falta --${nombre}. ${USO}`)
  return valor.trim()
}

if (positionals[0] !== 'registrar') fallar(USO)
const pedido = {
  actor: requerido('actor'), objetoId: requerido('objeto'), modelo: requerido('modelo'), hallazgos: requerido('hallazgos'),
  correcciones: values.correcciones ?? null,
}

const sql = conectar(destino)
try {
  if (destino.hosteada) {
    const pendientes = await pendientesSinCrear(sql)
    if (pendientes.length > 0) throw new Error(`${destino.nombre} no tiene aplicadas ${pendientes.join(', ')}`)
  } else {
    await migrate(sql)
  }
  const r = await registrarRevisionIa(sql, pedido)
  if (r.ok) {
    process.stdout.write(`✓ revisión de IA registrada sobre ${pedido.objetoId}\n`)
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
