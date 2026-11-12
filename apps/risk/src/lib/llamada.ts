// Envoltorio de los endpoints que llama otro contexto con el token de D-0077 (C4-03a). Es el
// único que usa `admitirLlamada`, y sólo lo usan las rutas bajo `api/entre-contextos/` (lo exige
// `deny.test.ts`). Existe sólo con AUTH_MODE=oidc: en `legacy` no hay identidad común.
//
// Orden: modo, configuración, el header `Authorization` y una verificación del token sin el
// registro de `jti` (firma, `iss`, `aud`, vencimiento), todo sin tocar la base, como una cookie
// inválida. Recién entonces `admitirLlamada`, que vuelve a verificar con el registro compartido
// (un `jti` repetido se rechaza y queda auditado) y corre el handler como la persona del token,
// con la admisión, la matriz y el alcance de Risk OS.

import { jwksDe, verificarToken, type Jwks, type RegistroJti, type Verificacion } from '@del-campo/identidad'
import { registroJtiPostgres, type Sesion, type Sql, type TransactionSql } from '@del-campo/risk'

import { AUDIENCIA_RISK, admitirLlamada } from './entre-contextos.ts'
import { FORBIDDEN, NOT_CONFIGURED, NOT_FOUND, UNAUTHORIZED, type Deps } from './guard.ts'
import { modoAcceso } from './modo.ts'
import type { Env } from './sesion.ts'

/** Quién llama, tal como firma en `iss`. Por ahora, sólo Broker OS. */
export const EMISOR_BROKER = 'broker-os'

/** El JWKS público de Broker OS, como JSON en `RISK_JWKS_BROKER`; `null` si falta o no sirve. */
export const jwksBroker = (env: Env): Jwks | null => {
  const crudo = env.RISK_JWKS_BROKER ?? ''
  if (crudo === '') return null
  try {
    const { keys } = JSON.parse(crudo) as { keys?: unknown }
    if (!Array.isArray(keys) || keys.length === 0) return null
    return jwksDe(keys as Parameters<typeof jwksDe>[0])
  } catch {
    return null
  }
}

const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/

/** El registro de `jti` compartido por todas las instancias: el de la base, sobre el pool. */
const registroDeLaBase = (db: Sql | TransactionSql): RegistroJti => registroJtiPostgres(db as Sql)

export const withLlamada =
  <C>(
    handler: (request: Request, sesion: Sesion, db: TransactionSql, context: C) => Promise<Response>,
    deps: () => Deps,
    /** Sólo para pruebas dentro de una transacción; en la app, siempre el de la base. */
    registro: (db: Sql | TransactionSql) => RegistroJti = registroDeLaBase,
  ) =>
  async (request: Request, context: C): Promise<Response> => {
    const d = deps()
    if (modoAcceso(d.env.AUTH_MODE) !== 'oidc') return NOT_FOUND()
    const jwks = jwksBroker(d.env)
    if (jwks === null || (d.env.RISK_OIDC_DATABASE_URL ?? '') === '') return NOT_CONFIGURED()
    const token = BEARER.exec(request.headers.get('authorization') ?? '')?.[1]
    if (token === undefined) return UNAUTHORIZED()
    const sinRegistro: Verificacion = { jwks, emisor: EMISOR_BROKER, audiencia: AUDIENCIA_RISK, registroJti: null }
    if (!(await verificarToken(token, sinRegistro)).ok) return UNAUTHORIZED()

    const db = d.db()
    const r = await admitirLlamada(db, token, { ...sinRegistro, registroJti: registro(db) }, (tx, sesion) =>
      handler(request, sesion, tx, context))
    if (r.ok) return r.valor
    return 'sinPermiso' in r ? FORBIDDEN(r.sinPermiso.message) : UNAUTHORIZED()
  }
