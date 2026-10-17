// Historial de un riesgo (RO01 §2, «Historial»; A12): todo lo que cambió desde la importación,
// con quién, cuándo, qué había antes y qué quedó. No es una tabla aparte: el esquema es de sólo
// inserción, cada cambio es una fila con su autor y su instante, y el estado anterior es la fila
// anterior del mismo objeto. Esta función las lee y las pone en orden.
//
// `TABLAS_DEL_HISTORIAL` dice qué tabla del esquema entra al historial y cuál no, y por qué: un
// test compara esa lista con las tablas de la base, así que una tabla nueva no puede quedar
// fuera sin que alguien lo decida.

import type { DatosOrganizacion, FactorRegistrado, NombreFactor, RevisionRegistrada } from './organizacion.ts'
import { FACTORES } from './organizacion.ts'

export type TablaHistorial =
  | 'riesgo' | 'evaluacion' | 'revision_humana' | 'accion' | 'accion_estado' | 'transferencia' | 'evento_poliza'
  | 'novedad' | 'revision_pendiente' | 'cierre_revision' | 'reordenamiento' | 'orden_previo_item'

/** Cada tabla del esquema `risk`: la tabla del historial que la muestra, o por qué no entra. */
export const TABLAS_DEL_HISTORIAL: Readonly<Record<string, { readonly entra: TablaHistorial } | { readonly fuera: string }>> = {
  riesgo: { entra: 'riesgo' },
  miembro_escenario: { entra: 'riesgo' },
  evaluacion: { entra: 'evaluacion' },
  revision_humana: { entra: 'revision_humana' },
  accion: { entra: 'accion' },
  accion_estado: { entra: 'accion_estado' },
  transferencia: { entra: 'transferencia' },
  evento_poliza: { entra: 'evento_poliza' },
  novedad: { entra: 'novedad' },
  revision_pendiente: { entra: 'revision_pendiente' },
  cierre_revision: { entra: 'cierre_revision' },
  reordenamiento: { entra: 'reordenamiento' },
  reordenamiento_vigente: { entra: 'reordenamiento' },
  orden_previo: { entra: 'orden_previo_item' },
  orden_previo_item: { entra: 'orden_previo_item' },
  persona: { fuera: 'las personas con acceso no son un cambio de ningún riesgo; son el «quién» de cada entrada' },
  usuario: { fuera: 'credenciales de acceso (D-0069), no un cambio de un riesgo' },
  credencial: { fuera: 'credenciales de acceso (D-0069), no un cambio de un riesgo' },
  registro_acceso: { fuera: 'quién vio qué (A8a), no un cambio de un riesgo' },
  login_fallido: { fuera: 'intentos de login fallidos (D-0069, T-0032), no un cambio de un riesgo' },
  lote_importacion: { fuera: 'el lote de cada fila importada ya va en su entrada (`importación <lote>`)' },
  schema_migrations: { fuera: 'el ledger de migraciones del esquema, no un dato de Risk OS' },
}

export interface EntradaHistorial {
  /** Instante en que se registró en Risk OS (ISO). */
  readonly cuando: string
  /** La persona de la sesión, el revisor o evaluador del CSV, o `importación <lote>`. */
  readonly quien: string
  readonly origen: 'importacion' | 'sesion'
  readonly tabla: TablaHistorial
  readonly objetoId: string
  readonly que: string
  /** Lo que había antes en ese objeto; `null` si el cambio lo crea. */
  readonly antes: string | null
  readonly despues: string
}

const ORDEN_TABLA: readonly TablaHistorial[] = [
  'riesgo', 'accion', 'transferencia', 'accion_estado', 'novedad', 'revision_pendiente', 'evaluacion', 'revision_humana',
  'cierre_revision', 'evento_poliza', 'orden_previo_item', 'reordenamiento',
]

const nivel = (f: FactorRegistrado): string => {
  if (f.estado === 'unknown') return 'unknown'
  if (f.estado === 'no_aplica') return 'no aplica'
  const rango = f.min === null && f.max === null ? '' : ` [${String(f.min ?? '?')}–${String(f.max ?? '?')}]`
  return `${String(f.valor)}${rango}`
}

/** El vector de una evaluación en una línea: `p 3 [2–4] · i_econ 4 · …`. */
export const vectorEnTexto = (factores: Readonly<Record<NombreFactor, FactorRegistrado>>): string =>
  FACTORES.map((f) => `${f} ${nivel(factores[f])}`).join(' · ')

const deImportacion = (lote: string | null): string => `importación ${lote ?? ''}`.trim()

/** Todo lo que cambió de un riesgo, del primer registro al último. */
export function reconstruirHistorial(d: DatosOrganizacion, riskId: string): EntradaHistorial[] {
  const r = d.riesgos.find((x) => x.id === riskId)
  if (r === undefined) throw new Error(`${riskId} no está en ${d.organizacionId}`)
  const h: EntradaHistorial[] = []
  const add = (e: EntradaHistorial): void => { h.push(e) }

  add({
    cuando: r.registradoEn, quien: r.autor ?? deImportacion(r.loteOrigen), origen: r.origen, tabla: 'riesgo', objetoId: r.id,
    que: `Alta del ${r.tipoObjeto.replace('_', '-')}`, antes: null,
    despues: r.miembros.length > 0 ? `${r.titulo} (miembros: ${r.miembros.join(', ')})` : r.titulo,
  })

  const revisiones = (objetoId: string, que: string, rs: readonly RevisionRegistrada[]): void => {
    rs.forEach((x, i) => {
      add({
        cuando: x.registradaEn, quien: x.revisor, origen: x.origen, tabla: 'revision_humana', objetoId,
        que: `Revisión humana de ${que} (${x.actor}, ${x.fecha})`, antes: rs[i - 1]?.estado ?? 'pending', despues: x.estado,
      })
    })
  }

  const evaluaciones = d.evaluaciones.filter((e) => e.riskId === riskId)
  for (const e of evaluaciones) {
    const anterior = e.anteriorId === null ? undefined : evaluaciones.find((x) => x.id === e.anteriorId)
    add({
      cuando: e.registradaEn, quien: e.origen === 'sesion' ? e.evaluador : `${e.evaluador} (${deImportacion(e.loteOrigen)})`, origen: e.origen,
      tabla: 'evaluacion', objetoId: e.id,
      que: e.tipo === 'inicial' ? `Evaluación inicial (${e.fecha})` : `Reevaluación por ${e.motivo ?? '—'} (${e.fecha}), sobre ${e.anteriorId ?? '—'}`,
      antes: anterior === undefined ? null : vectorEnTexto(anterior.factores),
      despues: vectorEnTexto(e.factores),
    })
    revisiones(e.id, 'la evaluación', e.revisiones)
  }

  for (const a of d.acciones.filter((x) => x.riskId === riskId)) {
    add({
      cuando: a.registradaEn, quien: a.autor ?? deImportacion(a.loteOrigen), origen: a.origen, tabla: 'accion', objetoId: a.id,
      que: a.tipoRegistro === 'accion' ? 'Alta de la acción' : `Alta de la decisión de tratamiento (${a.decision ?? '—'})`,
      antes: null, despues: a.descripcion,
    })
    a.estados.forEach((s, i) => {
      const previo = a.estados[i - 1]
      const efecto = s.efecto === null ? '' : `, eficacia ${s.efecto}${s.evaluacionEfectoId === null ? '' : ` (${s.evaluacionEfectoId})`}`
      add({
        cuando: s.registradoEn, quien: s.autor ?? deImportacion(a.loteOrigen), origen: s.origen, tabla: 'accion_estado', objetoId: a.id,
        que: s.efecto !== null && previo?.estado === 'cumplida' ? 'Eficacia de la acción' : 'Estado de la acción',
        antes: previo === undefined ? null : previo.estado,
        despues: `${s.estado}${s.fechaCumplida === null ? '' : ` el ${s.fechaCumplida}`}${efecto}`,
      })
    })
    revisiones(a.id, a.tipoRegistro === 'accion' ? 'la acción' : 'la decisión de tratamiento', a.revisiones)
  }

  for (const c of d.coberturas.filter((x) => x.riskId === riskId)) {
    add({
      cuando: c.registradaEn, quien: c.autor ?? deImportacion(c.loteOrigen), origen: c.origen, tabla: 'transferencia', objetoId: c.id,
      que: `Alta de la cobertura ${c.polizaRef}`, antes: null, despues: `${c.cobertura} (${c.suficiencia})`,
    })
    for (const v of c.eventos) {
      add({
        cuando: v.registradoEn, quien: v.autor ?? deImportacion(v.loteOrigen), origen: v.origen, tabla: 'evento_poliza', objetoId: v.id,
        que: `Evento de póliza ${c.polizaRef} (${v.fecha}), observación local`, antes: null,
        despues: `${v.tipo}${v.monto === null ? '' : ` ${v.monto} ${v.moneda ?? ''}`.trimEnd()}`,
      })
    }
    revisiones(c.id, 'la cobertura', c.revisiones)
  }

  for (const n of d.novedades.filter((x) => x.riskId === riskId)) {
    add({
      cuando: n.registradaEn, quien: n.autor, origen: 'sesion', tabla: 'novedad', objetoId: n.id,
      que: `Novedad (${n.tipo}) sobre ${n.accionId ?? n.transferenciaId ?? 'el riesgo'}`, antes: null, despues: n.texto,
    })
  }

  for (const p of d.revisionesPendientes.filter((x) => x.riskId === riskId)) {
    add({
      cuando: p.abiertaEn, quien: p.autor ?? deImportacion(null), origen: p.origen, tabla: 'revision_pendiente', objetoId: p.id,
      que: `Revisión pendiente abierta por ${p.disparador}`, antes: null,
      despues: `abierta (${p.accionId ?? p.novedadId ?? p.versionMetodologia ?? '—'})`,
    })
    if (p.cierre !== null) {
      add({
        cuando: p.cierre.cerradaEn, quien: p.cierre.cerradaPor, origen: 'sesion', tabla: 'cierre_revision', objetoId: p.id,
        que: 'Cierre de la revisión pendiente', antes: 'abierta',
        despues: p.cierre.resultado === 'sin_cambio'
          ? `sin cambio: ${p.cierre.fundamento ?? ''}`
          : `reevaluación aceptada ${p.cierre.evaluacionId ?? ''}`.trimEnd(),
      })
    }
  }

  for (const o of d.ordenesPrevios) {
    for (const i of o.items.filter((x) => x.riskId === riskId)) {
      add({
        cuando: o.registradoEn, quien: o.revisor, origen: 'sesion', tabla: 'orden_previo_item', objetoId: o.id,
        que: `Orden previo del revisor (material ${o.materialRef})`, antes: null,
        despues: `posición ${String(i.posicion)}${i.banda === null ? '' : `, banda ${i.banda}`}`,
      })
    }
  }

  for (const x of d.reordenamientos) {
    const sube = x.riskIdSube === riskId
    const baja = x.riskIdBaja === riskId
    if (!sube && !baja && x.riskId !== riskId) continue
    const calc = x.ordenCalculado.find((f) => f.riskId === riskId)
    const despues = x.tipo === 'par'
      ? (sube ? `sube sobre ${x.riskIdBaja ?? ''}` : `baja bajo ${x.riskIdSube ?? ''}`)
      : x.tipo === 'posicion' ? `posición profesional ${String(x.posicionProfesional)}` : `banda profesional ${x.bandaProfesional ?? ''}`
    add({
      cuando: x.registradoEn, quien: x.autor, origen: 'sesion', tabla: 'reordenamiento', objetoId: x.id,
      que: `Reordenamiento profesional (${x.causa}): ${x.fundamento}`,
      antes: calc === undefined ? 'fuera del orden calculado' : `posición calculada ${String(calc.posicion)}${calc.banda === null ? '' : `, ${calc.banda}`}`,
      despues,
    })
  }

  return h.sort((a, b) =>
    a.cuando.localeCompare(b.cuando) || ORDEN_TABLA.indexOf(a.tabla) - ORDEN_TABLA.indexOf(b.tabla) || a.objetoId.localeCompare(b.objetoId))
}
