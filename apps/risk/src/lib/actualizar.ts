// Los POST de la actualización (T-0031), sin Next.js, como `handlers.ts`: cada `route.ts` es un
// envoltorio de una línea detrás de `withSesion`, que ya comprobó la sesión y el origen.
//
// Cada formulario llama a un caso de uso de `@del-campo/risk` con la sesión de la persona, que es
// el autor de lo que se registra. Vuelve a la página con `?ok=` o `?error=`: una regla que no se
// cumple trae su motivo; cualquier otra falla, un mensaje fijo. En los dos casos el caso de uso
// revirtió su transacción y no quedó nada escrito.

import {
  altaAccion, altaCobertura, cambiarEstadoAccion, cargarReevaluacion, cerrarConReevaluacion, cerrarSinCambio, FACTORES, RechazoActualizacion,
  registrarEficacia, registrarEventoPoliza, registrarNovedad, registrarOrdenPrevio, reordenar, revisar, VERSION_METODOLOGIA,
  type FactorPedido, type NombreFactor, type ObjetoRevisado, type Sesion,
} from '@del-campo/risk'

import { NOT_FOUND, type Db } from './guard.ts'
import { parseOrganizacion, parseRiesgo } from './handlers.ts'

/** Los campos de un formulario, como texto. Un campo que falta es `''`. */
interface Campos {
  readonly texto: (nombre: string) => string
  readonly todos: (nombre: string) => string[]
  readonly nombres: () => string[]
}

const leerCampos = async (request: Request): Promise<Campos | null> => {
  try {
    const form = await request.formData()
    return {
      texto: (n) => { const v = form.get(n); return typeof v === 'string' ? v : '' },
      todos: (n) => form.getAll(n).filter((v): v is string => typeof v === 'string'),
      nombres: () => [...new Set([...form.keys()])],
    }
  } catch {
    return null
  }
}

/** La página a la que vuelve un formulario: una ruta propia de la app, nunca otra URL. */
export const volverA = (raw: string, defecto: string): string =>
  /^\/(r|o)\/[A-Za-z0-9_%.\-/]+$/.test(raw) && !raw.includes('//') && !raw.includes('..') ? raw : defecto

const volver = (request: Request, ruta: string, aviso: { ok: string } | { error: string }): Response => {
  const url = new URL(ruta, request.url)
  if ('ok' in aviso) url.searchParams.set('ok', aviso.ok)
  else url.searchParams.set('error', aviso.error)
  return new Response(null, { status: 303, headers: { location: url.toString(), 'cache-control': 'no-store' } })
}

const FALLA = 'la operación falló y se revirtió entera'

/** Corre la operación y vuelve a la página con su resultado. */
const responder = async (request: Request, ruta: string, op: () => Promise<string>): Promise<Response> => {
  try {
    return volver(request, ruta, { ok: await op() })
  } catch (e) {
    if (e instanceof RechazoActualizacion) return volver(request, ruta, { error: e.message })
    console.error('risk: actualización fallida', e instanceof Error ? e.name : typeof e)
    return volver(request, ruta, { error: FALLA })
  }
}

const opcional = (v: string): string | null => (v.trim() === '' ? null : v)
const numero = (v: string): number | null => (v.trim() === '' ? null : Number(v))

function factores(c: Campos): Record<NombreFactor, FactorPedido> {
  return Object.fromEntries(FACTORES.map((f) => [f, {
    estado: c.texto(`${f}_estado`), valor: numero(c.texto(`${f}_valor`)), min: numero(c.texto(`${f}_min`)), max: numero(c.texto(`${f}_max`)),
    observacion: opcional(c.texto(`${f}_observacion`)),
  }])) as Record<NombreFactor, FactorPedido>
}

const OBJETO: Readonly<Record<string, (id: string) => ObjetoRevisado>> = {
  evaluacion: (id) => ({ evaluacionId: id }),
  accion: (id) => ({ accionId: id }),
  transferencia: (id) => ({ transferenciaId: id }),
}

/** POST /api/r/:id/actualizar — toda operación sobre un riesgo, sus acciones, coberturas y revisiones. */
export const actualizarRiesgoResponse = async (request: Request, sesion: Sesion, db: Db, rawId: string): Promise<Response> => {
  const riskId = parseRiesgo(rawId)
  if (riskId === null) return NOT_FOUND()
  const c = await leerCampos(request)
  const ruta = volverA(c?.texto('volver') ?? '', `/r/${riskId}`)
  if (c === null) return volver(request, ruta, { error: 'el formulario no se pudo leer' })
  const t = c.texto
  switch (t('op')) {
    case 'novedad': {
      const destino = t('destino')
      return responder(request, ruta, async () => {
        const r = await registrarNovedad(db, sesion, {
          riskId, tipo: t('tipo'), texto: t('texto'), evidencia: t('evidencia'),
          accionId: destino.startsWith('ACC-') ? destino : null, transferenciaId: destino.startsWith('TRF-') ? destino : null,
        })
        return r.revisionId === null ? 'Novedad registrada.' : 'Novedad registrada; se abrió una revisión pendiente.'
      })
    }
    case 'alta_accion':
      return responder(request, ruta, async () => {
        await altaAccion(db, sesion, {
          riskId, tipoRegistro: t('tipo_registro'), descripcion: t('descripcion'), factorObjetivo: c.todos('factor_objetivo'),
          mecanismoCausal: t('mecanismo_causal'), cambioEsperado: t('cambio_esperado'), decision: opcional(t('decision')), fundamento: t('fundamento'),
          fechaProximaRevision: t('fecha_proxima_revision'), fechaAlta: t('fecha_alta'), base: t('base'), evidencia: t('evidencia'), estado: t('estado'),
        })
        return 'Alta registrada.'
      })
    case 'estado':
      return responder(request, ruta, async () => {
        const r = await cambiarEstadoAccion(db, sesion, {
          accionId: t('accion'), estado: t('estado'), comentario: t('comentario'), evidencia: t('evidencia'), fechaCumplida: t('fecha_cumplida'),
        })
        return r.revisionId === null ? 'Estado registrado.' : 'Acción cumplida; se abrió una revisión pendiente.'
      })
    case 'eficacia':
      return responder(request, ruta, async () => {
        await registrarEficacia(db, sesion, { accionId: t('accion'), efecto: t('efecto'), nota: t('nota'), evaluacionId: t('evaluacion') })
        return 'Eficacia registrada.'
      })
    case 'reevaluacion':
      return responder(request, ruta, async () => {
        await cargarReevaluacion(db, sesion, {
          riskId, motivo: t('motivo'), accionId: opcional(t('accion')), fecha: t('fecha'), factores: factores(c), base: t('base'), evidencia: t('evidencia'),
          uncertainty: t('uncertainty'), uncertaintyNota: t('uncertainty_nota'), necesidadValidacion: t('necesidad_validacion'),
          riesgoCausa: t('riesgo_causa'), riesgoEvento: t('riesgo_evento'), riesgoConsecuencia: t('riesgo_consecuencia'),
          justificacion: t('justificacion'), montoBruto: t('monto_bruto'), moneda: t('moneda'),
        })
        return 'Reevaluación cargada: queda pendiente de revisión hasta que alguien la acepte.'
      })
    case 'revisar': {
      const objeto = OBJETO[t('objeto')]
      if (objeto === undefined) return volver(request, ruta, { error: 'no se sabe qué revisar' })
      return responder(request, ruta, async () => {
        await revisar(db, sesion, objeto(t('id')), t('estado'))
        return 'Revisión registrada.'
      })
    }
    case 'cerrar':
      return responder(request, ruta, async () => {
        const r = await cerrarConReevaluacion(db, sesion, { revisionId: t('revision'), evaluacionId: t('evaluacion') })
        return r.aceptada ? 'Reevaluación aceptada y revisión cerrada.' : 'Revisión cerrada.'
      })
    case 'sin_cambio':
      return responder(request, ruta, async () => {
        await cerrarSinCambio(db, sesion, { revisionId: t('revision'), fundamento: t('fundamento') })
        return 'Revisión cerrada sin cambio.'
      })
    case 'alta_cobertura':
      return responder(request, ruta, async () => {
        await altaCobertura(db, sesion, {
          riskId, polizaRef: t('poliza_ref'), cobertura: t('cobertura'), vigenciaDesde: t('vigencia_desde'), vigenciaHasta: t('vigencia_hasta'),
          limite: t('limite'), sublimite: t('sublimite'), sublimitesTexto: t('sublimites_texto'), deducible: t('deducible'),
          deducibleTexto: t('deducible_texto'), exclusiones: t('exclusiones'), exposicionRetenida: t('exposicion_retenida'),
          exposicionRetenidaNota: t('exposicion_retenida_nota'), suficiencia: t('suficiencia'), suficienciaNota: t('suficiencia_nota'),
          moneda: t('moneda'), base: t('base'), evidencia: t('evidencia'), uncertainty: t('uncertainty'), uncertaintyNota: t('uncertainty_nota'),
        })
        return 'Cobertura registrada.'
      })
    case 'evento':
      return responder(request, ruta, async () => {
        await registrarEventoPoliza(db, sesion, {
          transferenciaId: t('transferencia'), tipo: t('tipo'), fecha: t('fecha'), monto: t('monto'), moneda: t('moneda'), nota: t('nota'),
          base: t('base'), evidencia: t('evidencia'),
        })
        return 'Evento de póliza registrado como observación local.'
      })
    default:
      return volver(request, ruta, { error: 'operación desconocida' })
  }
}

/** POST /api/o/:org/reordenar — un reordenamiento profesional. */
export const reordenarResponse = async (request: Request, sesion: Sesion, db: Db, rawOrg: string): Promise<Response> => {
  const org = parseOrganizacion(rawOrg)
  if (org === null) return NOT_FOUND()
  const c = await leerCampos(request)
  const ruta = volverA(c?.texto('volver') ?? '', `/o/${encodeURIComponent(org)}`)
  if (c === null) return volver(request, ruta, { error: 'el formulario no se pudo leer' })
  const t = c.texto
  return responder(request, ruta, async () => {
    await reordenar(db, sesion, VERSION_METODOLOGIA, org, {
      tipo: t('tipo'), riskIdSube: opcional(t('sube')), riskIdBaja: opcional(t('baja')), riskId: opcional(t('riesgo')),
      posicion: numero(t('posicion')), banda: opcional(t('banda')), causa: t('causa'), fundamento: t('fundamento'), patron: t('patron'),
    })
    return 'Reordenamiento registrado. El orden calculado no cambió.'
  })
}

/** POST /api/o/:org/orden-previo — el orden previo del revisor, desde el material ciego. */
export const ordenPrevioResponse = async (request: Request, sesion: Sesion, db: Db, rawOrg: string): Promise<Response> => {
  const org = parseOrganizacion(rawOrg)
  if (org === null) return NOT_FOUND()
  const ruta = `/o/${encodeURIComponent(org)}/orden-previo`
  const c = await leerCampos(request)
  if (c === null) return volver(request, ruta, { error: 'el formulario no se pudo leer' })
  const items = c.nombres().filter((n) => n.startsWith('pos_')).map((n) => {
    const riskId = n.slice(4)
    return { riskId, posicion: numero(c.texto(n)) ?? 0, banda: opcional(c.texto(`banda_${riskId}`)) }
  })
  return responder(request, ruta, async () => {
    await registrarOrdenPrevio(db, sesion, org, { materialRef: c.texto('material'), items })
    return 'Orden previo registrado.'
  })
}
