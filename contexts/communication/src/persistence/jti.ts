// Registro persistente de los `jti` del token entre contextos (D-0077, T-0035; migración
// 0006). Copia de `contexts/risk/src/persistence/jti.ts`: D-0063 no crea un núcleo compartido.
//
// Cumple el contrato `RegistroJti` de `@del-campo/identidad` por forma, sin importarlo: el
// contexto no depende del paquete de identidad. Es atómico y compartido por todas las
// instancias de Communication OS: el `insert … on conflict do nothing` sobre la clave
// (emisor, jti) deja pasar a uno solo aunque dos instancias reciban el mismo token a la vez,
// y la otra espera a que la primera confirme o revierta para decidir.
//
// Se construye con la conexión del pool, nunca con la transacción del pedido, y lanza si se
// le pasa una: así el `jti` queda registrado en cuanto se acepta el token, aunque después la
// acción falle y su transacción se revierta, y otra instancia con el mismo token no queda
// esperando el lock mientras dura la acción. Con una transacción, una acción que falla
// liberaría el `jti` y el mismo token se podría volver a usar mientras no venza.

import type { Sql, TransactionSql } from './database.ts'

/** Lo que `verificarToken` pasa a `registrar`, igual que `UsoJti` de `@del-campo/identidad`. */
export interface UsoJti {
  readonly emisor: string
  readonly jti: string
  /** El `exp` del token, en segundos desde la época. */
  readonly venceEn: number
  readonly ahora: number
}

export interface RegistroJtiPostgres {
  registrar(uso: UsoJti): Promise<boolean>
}

/**
 * La sentencia del registro, sobre cualquier conexión. La usa `registroJtiPostgres` con el pool;
 * las pruebas de permisos, dentro de una transacción con otro rol. `true` si el `jti` de ese
 * emisor no estaba y quedó registrado; `false` si se reutiliza.
 */
export const registrarJti = async (db: Sql | TransactionSql, { emisor, jti, venceEn }: UsoJti): Promise<boolean> => {
  // Sin columnas en `on conflict`: con columnas, Postgres exige además que la fila nueva pase
  // una política SELECT, y la conexión de la app no tendría ninguna cuando se retire la
  // política amplia de legado. La clave primaria es la única restricción única de la tabla.
  const r = await db`
    insert into communication.jti_aceptado (emisor, jti, vence_en)
    values (${emisor}, ${jti}, ${new Date(venceEn * 1000)})
    on conflict do nothing`
  return r.count === 1
}

/** El registro que la app pasa a `verificarToken`. Sólo con el pool: con una transacción, lanza. */
export const registroJtiPostgres = (db: Sql): RegistroJtiPostgres => {
  // postgres.js no distingue una transacción por tipo: la de `begin` tiene `savepoint`.
  if ('savepoint' in db) throw new Error('el registro de jti se construye con el pool, no con una transacción')
  return { registrar: (uso) => registrarJti(db, uso) }
}
