// Conexiones del spike. Se niega a usar cualquier base que no sea la suya.
import postgres from 'postgres'

export const SPIKE_DB = 'delcampo_spike_t0002'
export type Sql = postgres.Sql
export type Tx = postgres.TransactionSql

export const ROLES = {
  owner: 'spike_t0002_owner',
  app: 'spike_t0002_app',
  plain: 'spike_t0002_plain',
  worker: 'spike_t0002_worker',
  mcp: 'spike_t0002_mcp',
  service: 'spike_t0002_service',
  riskapp: 'spike_t0002_riskapp',
} as const
export type Perfil = keyof typeof ROLES

const host = process.env.PGHOST ?? 'localhost'
const port = Number(process.env.PGPORT ?? '5432')

/** Conexión como un perfil, a la base del spike. Autenticación local (trust o .pgpass). */
export function conectar(perfil: Perfil | 'superuser', opciones: { max?: number } = {}): Sql {
  const username = perfil === 'superuser' ? (process.env.PGUSER ?? 'postgres') : ROLES[perfil]
  return postgres({ host, port, database: SPIKE_DB, username, max: opciones.max ?? 2, onnotice: () => undefined })
}

/** Conexión de administración a la base `postgres`, sólo para crear la del spike. */
export function conectarCluster(): Sql {
  return postgres({ host, port, database: 'postgres', username: process.env.PGUSER ?? 'postgres', max: 1, onnotice: () => undefined })
}

export interface Contexto {
  readonly usuario?: string | undefined
  /** Instante de la consulta. Sólo surte efecto si el owner habilitó el reloj de prueba. */
  readonly instante?: string | undefined
  /** Claims al estilo PostgREST/Supabase, en lugar de authz.usuario_id. */
  readonly claims?: Record<string, unknown> | undefined
}

/**
 * Corre `fn` en una transacción con el principal y el reloj como GUC LOCALES
 * (set_config(..., true)): mueren con la transacción, que es lo único seguro con un
 * pooler en modo transacción.
 */
export async function enContexto<T>(sql: Sql, ctx: Contexto, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await sql.begin(async (tx) => {
    await tx`select set_config('authz.usuario_id', ${ctx.usuario ?? ''}, true),
                    set_config('authz.reloj_prueba', ${ctx.instante ?? ''}, true),
                    set_config('request.jwt.claims', ${ctx.claims === undefined ? '' : JSON.stringify(ctx.claims)}, true)`
    return fn(tx)
  })) as T
}

/** Como enContexto, pero deshace todo al final: para probar escrituras sin ensuciar. */
export async function probarYDeshacer<T>(sql: Sql, ctx: Contexto, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const DESHACER = Symbol('deshacer')
  let resultado: T | undefined
  try {
    await enContexto(sql, ctx, async (tx) => {
      resultado = await fn(tx)
      throw DESHACER
    })
  } catch (error) {
    if (error !== DESHACER) throw error
  }
  return resultado as T
}
