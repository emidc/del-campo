import type { Principal, RiskItem, RiskList, RiesgosDeEmpresa } from '@del-campo/api'
import { RISK_LIST_COLUMNS, RISK_LIST_PREFIX, listasDeRiesgos } from '@del-campo/api'
import Link from 'next/link'

import { fecha, instante } from '@/lib/formato'
import { consultar } from '@/lib/sesion'

import { BajaDeItem, ComentarItem, EditarItem, NuevoItem } from './ItemDeRiesgo'
import type { Subseccion } from './riesgos'
import { ASPECTO, ESTADO_DE_CONDICION, LISTA_DE, NIVEL, NOMBRE_DE_LISTA, PRIORIDAD, RESULTADO, SUBSECCIONES, atributo, codigoSiguiente } from './riesgos'

const cuando = (iso: string): string => instante(new Date(iso))

/**
 * La sección Riesgos de una empresa (T-0061): las listas de la planilla de inspección y lo que
 * guardó el modelo de riesgos, todo de la base de Broker OS. Sólo la ve el equipo.
 */
export async function SeccionRiesgos({
  principal,
  partyId,
  sub,
  itemId,
}: {
  readonly principal: Principal
  readonly partyId: string
  readonly sub: Subseccion
  readonly itemId: string | null
}) {
  const datos = await consultar(listasDeRiesgos(principal, partyId))
  const activos = (lista: RiskList) => datos.items.filter((i) => i.list === lista && !i.retired).length
  const titulos: Readonly<Record<Subseccion, string>> = {
    riesgos: `Riesgos (${String(activos('RIESGO'))})`,
    acciones: `Acciones (${String(activos('ACCION'))})`,
    transferencia: `Transferencia (${String(activos('TRANSFERENCIA'))})`,
    fuentes: `Fuentes (${String(activos('FUENTE'))})`,
    relevamientos: `Ubicaciones y relevamientos (${String(datos.relevamientos.length)})`,
    conclusiones: `Conclusiones del agente (${String(datos.conclusiones.length)})`,
  }
  const enlace = (s: Subseccion, item?: string) =>
    `/parte/${partyId}?seccion=riesgos&lista=${s}${item === undefined ? '' : `&item=${item}`}`
  const lista = LISTA_DE[sub]

  return (
    <>
      <nav className="chips chips--riesgos" aria-label="Listas de riesgos">
        {SUBSECCIONES.map((s) => (
          <Link key={s} href={enlace(s)} className={s === sub ? 'chip chip--activo' : 'chip'} aria-current={s === sub ? 'page' : undefined}>
            {titulos[s]}
          </Link>
        ))}
      </nav>
      {lista === undefined ? null : (
        <Lista partyId={partyId} lista={lista} items={datos.items.filter((i) => i.list === lista)} itemId={itemId} enlace={(id) => enlace(sub, id)} />
      )}
      {sub === 'relevamientos' ? <Relevamientos datos={datos} /> : null}
      {sub === 'conclusiones' ? <Conclusiones datos={datos} /> : null}
    </>
  )
}

function Lista({
  partyId,
  lista,
  items,
  itemId,
  enlace,
}: {
  readonly partyId: string
  readonly lista: RiskList
  readonly items: readonly RiskItem[]
  readonly itemId: string | null
  readonly enlace: (id?: string) => string
}) {
  const columnas = RISK_LIST_COLUMNS[lista]
  const resumen = columnas.filter((c) => c.summary === true)
  const vigentes = items.filter((i) => !i.retired)
  const bajas = items.filter((i) => i.retired)
  const elegido = items.find((i) => i.id === itemId) ?? null
  const filas = (lista: readonly RiskItem[]) =>
    lista.map((i) => (
      <tr key={i.id} className={i.id === itemId ? 'fila--elegida' : undefined}>
        <td className="nombre">
          <Link href={i.id === itemId ? enlace() : enlace(i.id)} scroll={false}>
            {i.code}
          </Link>
        </td>
        {resumen.map((c) => (
          <td key={c.key}>{i.fields[c.key] ?? '—'}</td>
        ))}
        <td>{i.comments.length === 0 ? '' : String(i.comments.length)}</td>
      </tr>
    ))

  return (
    <>
      {elegido === null ? null : <Detalle partyId={partyId} item={elegido} cerrar={enlace()} />}
      <div className="encabezado-tarjeta">
        <p className="meta">Tocá el código para ver el ítem completo, editarlo o comentarlo.</p>
        <NuevoItem
          parte={partyId}
          lista={lista}
          nombre={NOMBRE_DE_LISTA[lista]}
          codigoSugerido={codigoSiguiente(RISK_LIST_PREFIX[lista], items.map((i) => i.code))}
          columnas={columnas}
        />
      </div>
      {vigentes.length === 0 ? (
        <p className="meta">Todavía no hay ítems en {NOMBRE_DE_LISTA[lista]}.</p>
      ) : (
        <div className="desborde">
          <table className="tabla-riesgos">
            <thead>
              <tr>
                <th>ID</th>
                {resumen.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th aria-label="Comentarios">💬</th>
              </tr>
            </thead>
            <tbody>{filas(vigentes)}</tbody>
          </table>
        </div>
      )}
      {bajas.length === 0 ? null : (
        <details className="bajas">
          <summary>Dados de baja ({bajas.length})</summary>
          <div className="desborde">
            <table className="tabla-riesgos">
              <tbody>{filas(bajas)}</tbody>
            </table>
          </div>
        </details>
      )}
    </>
  )
}

function Detalle({ partyId, item, cerrar }: { readonly partyId: string; readonly item: RiskItem; readonly cerrar: string }) {
  const columnas = RISK_LIST_COLUMNS[item.list]
  return (
    <article className="tarjeta detalle-riesgo" id="item">
      <div className="encabezado-tarjeta">
        <h3>
          {item.code}
          {item.retired ? ' · dado de baja' : ''}
        </h3>
        <div className="fila">
          <EditarItem parte={partyId} lista={item.list} item={item.id} columnas={columnas} valores={item.fields} />
          <BajaDeItem parte={partyId} item={item.id} dadoDeBaja={item.retired} />
          <Link className="boton boton--secundario boton--chico" href={cerrar} scroll={false}>
            Cerrar
          </Link>
        </div>
      </div>
      <dl className="kv">
        {columnas.map((c) => (
          <div key={c.key} style={{ display: 'contents' }}>
            <dt>{c.label}</dt>
            <dd className="texto-largo">
              {c.key === 'enlace' && item.fields[c.key]?.startsWith('https://') === true ? (
                <a href={item.fields[c.key]} target="_blank" rel="noreferrer">
                  Abrir
                </a>
              ) : (
                (item.fields[c.key] ?? '—')
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="meta">
        Cargado por {item.createdByName ?? 'alguien del equipo'} el {cuando(item.createdAt)}
        {item.versions > 1 ? ` · Último cambio de ${item.updatedByName ?? 'alguien del equipo'} el ${cuando(item.updatedAt)}` : ''}
        {item.updatedByAgent === null ? '' : ` (agente ${item.updatedByAgent})`}
      </p>
      <h4>Comentarios</h4>
      {item.comments.length === 0 ? (
        <p className="meta">Sin comentarios.</p>
      ) : (
        <ul className="lista">
          {item.comments.map((m) => (
            <li key={m.id}>
              <p className="texto-largo">{m.body}</p>
              <p className="meta">
                {m.authorName ?? 'Alguien del equipo'}
                {m.agent === null ? '' : ` (agente ${m.agent})`} · {cuando(m.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <ComentarItem parte={partyId} item={item.id} />
    </article>
  )
}

function Relevamientos({ datos }: { readonly datos: RiesgosDeEmpresa }) {
  return (
    <>
      <h3>Ubicaciones</h3>
      {datos.ubicaciones.length === 0 ? (
        <p className="meta">Sin ubicaciones cargadas.</p>
      ) : (
        <ul className="lista">
          {datos.ubicaciones.map((u) => {
            const condiciones = datos.condiciones.filter((c) => c.locationId === u.id)
            return (
              <li key={u.id}>
                <p className="nombre">{u.name}</p>
                <p className="meta">{[u.address, u.locality, u.province].filter((d) => d !== null).join(', ')}</p>
                {condiciones.length === 0 ? null : (
                  <ul className="condiciones">
                    {condiciones.map((c) => (
                      <li key={c.id}>
                        {atributo(c.attribute)}: {c.value ?? '—'}{' '}
                        <span className="meta">
                          · {ESTADO_DE_CONDICION[c.status] ?? c.status}
                          {c.sourceReference === null ? '' : ` · ${c.sourceReference}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {datos.condiciones.some((c) => c.locationId === null) ? (
        <>
          <h3>Condiciones de toda la empresa</h3>
          <ul className="condiciones">
            {datos.condiciones
              .filter((c) => c.locationId === null)
              .map((c) => (
                <li key={c.id}>
                  {atributo(c.attribute)}: {c.value ?? '—'} <span className="meta">· {ESTADO_DE_CONDICION[c.status] ?? c.status}</span>
                </li>
              ))}
          </ul>
        </>
      ) : null}
      <h3>Relevamientos</h3>
      {datos.relevamientos.length === 0 ? <p className="meta">Sin relevamientos cargados.</p> : null}
      {datos.relevamientos.map((s) => (
        <details key={s.id} className="relevamiento">
          <summary>
            <span className="nombre">{fecha(s.visitedOn)}</span> · {s.performedBy}
            {s.locationName === null ? '' : ` · ${s.locationName}`} · {s.findings.length} hallazgos
          </summary>
          {s.summary === null ? null : <p className="texto-largo">{s.summary}</p>}
          {s.sourceDocument === null ? null : <p className="meta">Fuente: {s.sourceDocument}</p>}
          <div className="desborde">
            <table className="tabla-riesgos">
              <thead>
                <tr>
                  <th>Prioridad</th>
                  <th>Sector</th>
                  <th>Aspecto</th>
                  <th>Resultado</th>
                  <th>Hallazgo</th>
                  <th>Recomendación</th>
                </tr>
              </thead>
              <tbody>
                {s.findings.map((h) => (
                  <tr key={h.id}>
                    <td>{h.priority === null ? '—' : (PRIORIDAD[h.priority] ?? h.priority)}</td>
                    <td>{h.area ?? '—'}</td>
                    <td>{ASPECTO[h.aspect] ?? h.aspect}</td>
                    <td>{RESULTADO[h.result] ?? h.result}</td>
                    <td>{h.description}</td>
                    <td>{h.recommendation ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </>
  )
}

function Conclusiones({ datos }: { readonly datos: RiesgosDeEmpresa }) {
  if (datos.conclusiones.length === 0) return <p className="meta">El agente todavía no guardó conclusiones para esta empresa.</p>
  const ubicacion = (id: string | null) => (id === null ? null : (datos.ubicaciones.find((u) => u.id === id)?.name ?? null))
  return (
    <div className="desborde">
      <table className="tabla-riesgos">
        <thead>
          <tr>
            <th>Nivel</th>
            <th>Conclusión</th>
            <th>Nota</th>
            <th>Estado</th>
            <th>Revisión</th>
          </tr>
        </thead>
        <tbody>
          {datos.conclusiones.map((c) => (
            <tr key={c.id}>
              <td>{NIVEL[c.level] ?? String(c.level)}</td>
              <td>
                {c.statement}
                {ubicacion(c.locationId) === null ? null : <p className="meta">{ubicacion(c.locationId)}</p>}
                <p className="meta">{c.evidenceCount} evidencias</p>
              </td>
              <td>
                {c.noteId}
                {c.noteVersion === null ? '' : ` · ${c.noteVersion}`}
              </td>
              <td className={c.status === 'PENDIENTE' ? 'pendiente' : undefined}>
                {c.status === 'PENDIENTE' ? `Pendiente: falta ${c.missingDocument ?? 'un documento'}` : 'Respaldada'}
              </td>
              <td>{c.review === null ? 'Sin revisar' : c.review === 'ACEPTADA' ? 'Aceptada' : 'Rechazada'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

