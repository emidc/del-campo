// Cuándo una entrega de webhook necesita reproceso (T-0026). Meta no reintenta después de
// un 200 (D-0065), así que una entrega guardada que no terminó de procesarse solo se
// recupera desde acá: las `failed` y las `pending` que ya no están en curso.

/**
 * Una entrega `pending` de más de esto no está en curso: el procesamiento corre justo
 * después de responder y una función de Vercel no vive tanto. Es el mismo umbral con el
 * que la UI la muestra como atascada.
 */
export const STALLED_PENDING_AFTER_MS = 15 * 60 * 1000

/** Las `pending` recibidas estrictamente antes de este instante están atascadas. */
export const stalledBefore = (now: Date): Date => new Date(now.getTime() - STALLED_PENDING_AFTER_MS)
