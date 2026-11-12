// La organización evaluada y su vínculo con la empresa de Broker OS (T-0036), contra la base de
// RISK_DATABASE_URL o, con `--hosteada`, contra la de RISK_HOSTED_DATABASE_URL (como `cli-acceso.ts`).
//
//   pnpm --filter @del-campo/risk run organizacion listar
//   pnpm --filter @del-campo/risk run organizacion ficha --actor <PER-…> --org <organización> [--sector <x>] [--tamano <x>] [--zonas "a,b"]
//   pnpm --filter @del-campo/risk run organizacion vincular --actor <PER-…> --org <organización> --empresa <id de Broker OS>
//   pnpm --filter @del-campo/risk run organizacion verificar --actor <PER-…> --org <organización>
//   pnpm --filter @del-campo/risk run organizacion desvincular --actor <PER-…> --org <organización>
//
// El id de la empresa se copia de su ficha en Broker OS: no hay emparejamiento automático
// (D-0071). `--actor` es la atribución en la auditoría y tiene que ser un Administrador activo.
// La salida son identificadores y estados, nunca nombres.

import { parseArgs } from 'node:util'

import { conectar, destinoDe, errorSinDatos, HOSTED_FLAG, type Destino } from '../persistence/database.ts'
import { migrate, pendientesSinCrear } from '../persistence/migrations.ts'
import type { ResultadoAdmin } from './accesos.ts'
import { organizacionesEvaluadas, registrarFicha, verificarVinculo, vincular } from './organizacion-evaluada.ts'

const DEFAULT_URL = 'postgres://localhost:5432/delcampo_risk_dev'
const USO = `uso: organizacion <listar|ficha|vincular|verificar|desvincular> [opciones] [${HOSTED_FLAG}]; ver contexts/risk/src/application/cli-organizacion.ts`
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
    org: { type: 'string' },
    empresa: { type: 'string' },
    sector: { type: 'string' },
    tamano: { type: 'string' },
    zonas: { type: 'string' },
  },
})

const requerido = (nombre: keyof typeof values): string => {
  const valor = values[nombre]
  if (valor === undefined || valor.trim() === '') return fallar(`falta --${nombre}. ${USO}`)
  return valor.trim()
}
const actor = (): string => {
  const valor = requerido('actor')
  return PERSONA.test(valor) ? valor : fallar('--actor debe ser un id de persona (PER-…)')
}
const opcional = (nombre: 'sector' | 'tamano'): string | null => {
  const valor = values[nombre]?.trim() ?? ''
  return valor === '' ? null : valor
}

const correr = async (sql: ReturnType<typeof conectar>): Promise<ResultadoAdmin<null> | 'listado'> => {
  const [comando] = positionals
  switch (comando) {
    case 'listar': {
      for (const o of await organizacionesEvaluadas(sql)) {
        process.stdout.write(`${o.organizacionId}\t${o.vinculo}\t${o.empresaId ?? '-'}\t${o.sector ?? '-'}\t${o.tamano ?? '-'}\t${o.zonas.join(',') || '-'}\n`)
      }
      return 'listado'
    }
    case 'ficha':
      return registrarFicha(sql, {
        actor: actor(), organizacionId: requerido('org'), sector: opcional('sector'), tamano: opcional('tamano'),
        zonas: (values.zonas ?? '').split(',').map((z) => z.trim()).filter((z) => z !== ''),
      })
    case 'vincular':
      return vincular(sql, { actor: actor(), organizacionId: requerido('org'), empresaId: requerido('empresa').toLowerCase() })
    case 'verificar':
      return verificarVinculo(sql, { actor: actor(), organizacionId: requerido('org') })
    case 'desvincular':
      return vincular(sql, { actor: actor(), organizacionId: requerido('org'), empresaId: null })
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
  if (r === 'listado') {
    // Ya se imprimió.
  } else if (r.ok) {
    process.stdout.write(`✓ ${positionals[0] ?? ''}\n`)
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
