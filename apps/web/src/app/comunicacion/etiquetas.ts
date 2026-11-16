import type { ConversacionResumen, DeliveryHealth } from '@del-campo/api'

/** Cómo se nombra a quien escribe: su nombre de perfil de WhatsApp y el final del teléfono, nunca el número entero. */
export const contacto = (c: Pick<ConversacionResumen, 'profileName' | 'waIdLast4' | 'bsuid'>): string => {
  const numero = c.waIdLast4 === null ? null : `teléfono terminado en ${c.waIdLast4}`
  return [c.profileName, numero].filter((parte) => parte !== null).join(' · ') || 'Contacto sin teléfono'
}

/** Los avisos de que lo recibido de WhatsApp no está al día. Vacío si todo está procesado. */
export const avisosDeEntregas = (e: DeliveryHealth): string[] => [
  ...(e.failed + e.stalled > 0
    ? [`Hay ${String(e.failed + e.stalled)} entregas de WhatsApp recibidas sin procesar: puede faltar algún mensaje. Se reintentan solas una vez por día.`]
    : []),
  ...(e.ignored > 0
    ? [`En las últimas 24 h llegaron ${String(e.ignored)} entregas de otro número de WhatsApp que no se guardaron. Si no entran mensajes, avisale a Emiliano.`]
    : []),
]
