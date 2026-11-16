import { randomUUID } from 'node:crypto'

import type { ThreadItem } from '@del-campo/api'
import { MAX_REPLY_LENGTH, MENSAJE_DE_RESPUESTA, conversacion, esResultadoDeRespuesta, latestBatch } from '@del-campo/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import { Cabecera } from '@/app/_componentes/Cabecera'
import { Refresco } from '@/app/comunicacion/Refresco'
import { responder } from '@/app/comunicacion/acciones'
import { avisosDeEntregas, contacto } from '@/app/comunicacion/etiquetas'
import { instante } from '@/lib/formato'
import { consultar, requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const ESTADO: Readonly<Record<string, string>> = { sent: 'Enviado', delivered: 'Entregado', read: 'Leído', failed: 'No se entregó' }

const TIPO: Readonly<Record<string, string>> = {
  image: 'una imagen',
  audio: 'un audio',
  video: 'un video',
  document: 'un documento',
  sticker: 'un sticker',
  location: 'una ubicación',
  contacts: 'un contacto',
  reaction: 'una reacción',
}

const clave = (item: ThreadItem, n: number): string => (item.kind === 'unsupported' ? `u-${String(n)}` : `${item.kind}-${String(item.id)}`)

function Mensaje({ item }: { readonly item: ThreadItem }) {
  if (item.kind === 'unsupported') {
    return (
      <div className="msg msg--nota">
        Mandó {TIPO[item.type] ?? `un mensaje de tipo «${item.type}»`}. Broker OS por ahora sólo muestra texto.
        <span className="msg__meta">{instante(item.at)}</span>
      </div>
    )
  }
  if (item.kind === 'attempt') {
    return (
      <div className="msg msg--sale msg--duda">
        <strong>{item.state === 'sending' ? 'Enviando…' : 'Sin confirmar: puede haber salido.'}</strong>
        <div>{item.body ?? '(texto borrado a los 30 días)'}</div>
        <span className="msg__meta">
          {instante(item.at)}
          {item.reason === null ? null : ` · ${item.reason}`}
        </span>
      </div>
    )
  }
  const saliente = item.direction === 'outbound'
  return (
    <div className={saliente ? 'msg msg--sale' : 'msg msg--entra'}>
      {item.body}
      <span className="msg__meta">
        {instante(item.at)}
        {saliente ? ` · ${item.status === null ? 'Enviado' : (ESTADO[item.status] ?? item.status)}` : null}
        {item.status === 'failed' ? ` · ${[item.errorCode === null ? null : String(item.errorCode), item.errorTitle].filter((x) => x !== null).join(' ')}` : null}
      </span>
    </div>
  )
}

export default async function ConversacionPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly id: string }>
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const { id: crudo } = await params
  if (!/^[1-9]\d{0,15}$/.test(crudo)) notFound()
  const [lote, c] = await consultar(Promise.all([latestBatch(principal), conversacion(principal, Number(crudo))]))
  if (c === null) notFound()
  const { hilo } = c
  const r = (await searchParams).r
  const resultado = typeof r === 'string' && esResultadoDeRespuesta(r) ? r : null
  const titulo = c.clientes[0]?.name ?? hilo.label.profileName ?? contacto({ profileName: null, waIdLast4: hilo.label.waIdLast4, bsuid: hilo.label.bsuid })

  const impedimento = !hilo.canReply
    ? 'Este contacto no tiene teléfono visible: no se le puede responder desde acá.'
    : !c.envioConfigurado
      ? 'El envío de WhatsApp todavía no está configurado en Broker OS.'
      : !hilo.window.open
        ? hilo.window.closesAt === null
          ? 'Sólo se puede responder dentro de las 24 h desde su último mensaje, y todavía no escribió.'
          : `La ventana de 24 h se cerró el ${instante(hilo.window.closesAt)}. Hasta que vuelva a escribir, no se le puede mandar texto libre.`
        : null

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <Refresco />
      <nav className="migas" aria-label="Migas de pan">
        <Link href="/comunicacion">Comunicación</Link>
        <span aria-hidden="true">›</span>
        <span>{titulo}</span>
      </nav>
      <header className="encabezado">
        <div>
          <p className="antetitulo">WhatsApp</p>
          <h1>{titulo}</h1>
          <div className="chips">
            <span className="chip">{contacto({ profileName: hilo.label.profileName, waIdLast4: hilo.label.waIdLast4, bsuid: hilo.label.bsuid })}</span>
            {c.clientes.length === 0 ? (
              <span className="chip">Sin identificar</span>
            ) : (
              c.clientes.map((cliente) => (
                <Link className="chip" key={cliente.partyId} href={`/parte/${cliente.partyId}`}>
                  Cliente: {cliente.name}
                </Link>
              ))
            )}
          </div>
        </div>
      </header>
      {c.clientes.length === 0 ? (
        <p className="meta">
          Ningún cliente tiene cargado este teléfono. Si es un cliente, hay que cargarle el teléfono en su ficha para que la conversación aparezca ahí.
        </p>
      ) : null}
      {avisosDeEntregas(c.entregas).map((aviso) => (
        <p className="estado estado--aviso" key={aviso}>
          {aviso}
        </p>
      ))}

      <section className="tarjeta hilo" aria-label="Mensajes">
        {hilo.items.length === 0 ? <p className="meta">Sin mensajes.</p> : null}
        {hilo.items.map((item, n) => (
          <Mensaje key={clave(item, n)} item={item} />
        ))}
      </section>

      <h2>Responder</h2>
      {resultado === null ? null : (
        <p className={resultado === 'sent' ? 'estado' : 'estado estado--aviso'} role="status">
          {MENSAJE_DE_RESPUESTA[resultado]}
        </p>
      )}
      {impedimento !== null ? (
        <p className="estado">{impedimento}</p>
      ) : (
        <form action={responder} className="buscador">
          <input type="hidden" name="id" value={hilo.id} />
          <input type="hidden" name="clave" value={randomUUID()} />
          <div className="campo" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="mensaje">Mensaje</label>
            <textarea id="mensaje" name="mensaje" rows={3} maxLength={MAX_REPLY_LENGTH} required />
            {hilo.window.closesAt === null ? null : <p className="meta">Se puede responder hasta el {instante(hilo.window.closesAt)}.</p>}
          </div>
          <div className="acciones">
            <BotonEnviar>Enviar por WhatsApp</BotonEnviar>
          </div>
        </form>
      )}
    </main>
  )
}
