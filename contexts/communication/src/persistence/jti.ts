// Registro persistente de los `jti` del token entre contextos (D-0077, T-0035; migración
// 0006). Copia de `contexts/risk/src/persistence/jti.ts`: D-0063 no crea un núcleo compartido.
//
// Cumple el contrato `RegistroJti` de `@del-campo/identidad` por forma, sin importarlo: el
// contexto no depende del paquete de identidad. Es atómico y compartido por todas las
// instancias de Communication OS: el `insert … on conflict do nothing` sobre la clave
// (emisor, jti) deja pasar a uno solo aunque dos instancias reciban el mismo token a la vez,
// y la otra espera a que la primera confirme o revierta para decidir.
//
// Se construye con la conexión del pool, no con la transacción del pedido: así el `jti`
// queda registrado en cuanto se acepta el token, aunque después la acción falle y su
// transacción se revierta. Con una transacción, una acción que falla liberaría el `jti` y el
// mismo token se podría volver a usar mientras no venza.

import type { Conexion } from './database.ts'

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

/** `true` si el `jti` de ese emisor no estaba y quedó registrado; `false` si se reutiliza. */
export const registroJtiPostgres = (db: Conexion): RegistroJtiPostgres => ({
  async registrar({ emisor, jti, venceEn }) {
    const r = await db`
      insert into communication.jti_aceptado (emisor, jti, vence_en)
      values (${emisor}, ${jti}, ${new Date(venceEn * 1000)})
      on conflict (emisor, jti) do nothing`
    return r.count === 1
  },
})
