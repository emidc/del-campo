// C4-03b: qué muestra la sección «Riesgos» de la ficha de empresa para cada resultado del
// cliente de Risk OS (docs/desarrollo/riesgos-en-la-ficha.md §3.2). El componente sólo dibuja.
// Broker OS no guarda riesgos: con cualquier resultado que no sea `vinculada`, no hay filas.

import type { ResultadoRiesgos, RiesgoEnFicha } from '@del-campo/api'

export type SeccionRiesgos =
  | { readonly forma: 'MENSAJE'; readonly texto: string }
  | {
    readonly forma: 'TABLA'
    readonly filas: readonly RiesgoEnFicha[]
    readonly resumen: string
    readonly consultado: string
    readonly enlace: string
  }

const MENSAJES: Readonly<Record<Exclude<ResultadoRiesgos['estado'], 'vinculada'>, string>> = {
  pendiente: 'La vinculación con Risk OS está pendiente de verificación.',
  sin_vinculo: 'Esta empresa no tiene una organización evaluada vinculada, o no la tenés asignada.',
  sin_acceso: 'No tenés acceso a Risk OS.',
  no_disponible: 'Risk OS no responde. No se muestran riesgos.',
  no_configurado: 'Riesgos no está configurado en este entorno.',
}

const HORA = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' })

export const describirRiesgos = (r: ResultadoRiesgos): SeccionRiesgos => {
  if (r.estado !== 'vinculada') return { forma: 'MENSAJE', texto: MENSAJES[r.estado] }
  return {
    forma: 'TABLA',
    filas: r.riesgos,
    resumen: `${String(r.noEvaluables)} no evaluables · ${String(r.enCola)} en cola de validación`,
    consultado: `Consultado en Risk OS a las ${HORA.format(new Date(r.generadoEn))}`,
    enlace: r.urlRisk,
  }
}
