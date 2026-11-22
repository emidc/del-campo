// T-0072 — A quién le llega el aviso de un mensaje de WhatsApp (pedido de Emiliano,
// 22/11/2026):
//   1. Si la conversación es de un cliente con responsable, a ese responsable.
//   2. Si es de un cliente sin responsable, a Victoria.
//   3. Si no se asocia a ningún cliente, a Matías.
// Todo el equipo ve y responde todas las conversaciones: el aviso sólo dice a quién le toca.

/** Las cuentas por defecto, por correo: las de la página del equipo (0028). */
export const AVISO_SIN_RESPONSABLE = 'victoria@delcamposeguros.com'
export const AVISO_SIN_CLIENTE = 'matias@delcamposeguros.com'

export interface IntegranteAvisable {
  readonly userId: string
  readonly email: string
}

/**
 * El integrante que recibe el aviso, entre los activos del equipo. Si la conversación
 * coincide con varios clientes, vale el primero que tenga responsable activo. Un
 * responsable dado de baja cuenta como sin responsable. `null` si la cuenta que
 * corresponde no está en el equipo.
 */
export const destinatarioDelAviso = <I extends IntegranteAvisable>(
  responsables: readonly (string | null)[],
  equipo: readonly I[],
): I | null => {
  const porCorreo = (correo: string): I | null => equipo.find((i) => i.email.toLowerCase() === correo) ?? null
  if (responsables.length === 0) return porCorreo(AVISO_SIN_CLIENTE)
  for (const id of responsables) {
    const responsable = id === null ? undefined : equipo.find((i) => i.userId === id)
    if (responsable !== undefined) return responsable
  }
  return porCorreo(AVISO_SIN_RESPONSABLE)
}
