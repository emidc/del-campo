'use client'

import { useState, type SyntheticEvent } from 'react'

import { Freshness, formatTime, LogoutButton, participantLabel, usePolling, type Label } from './polling.tsx'

type Item =
  | {
      readonly kind: 'message'
      readonly id: number
      readonly direction: 'inbound' | 'outbound'
      readonly body: string
      readonly at: string
      readonly status: 'sent' | 'delivered' | 'read' | 'failed' | null
      readonly errorCode: number | null
      readonly errorTitle: string | null
    }
  | { readonly kind: 'unsupported'; readonly type: string; readonly at: string }
  | {
      readonly kind: 'attempt'
      readonly id: number
      readonly state: 'sending' | 'unconfirmed'
      readonly body: string | null
      readonly reason: string | null
      readonly at: string
    }

interface ThreadData {
  readonly id: number
  readonly label: Label
  readonly lastDeliveryAt: string | null
  readonly window: { readonly open: boolean; readonly closesAt: string | null }
  readonly canReply: boolean
  readonly replyBlockedReason: string | null
  readonly items: Item[]
}

interface ReplyOutcome {
  readonly kind: string
  readonly message: string
  readonly code?: number | null
  readonly title?: string
  readonly reason?: string
}

const STATUS_LABEL: Record<NonNullable<Extract<Item, { kind: 'message' }>['status']>, string> = {
  sent: 'Enviado',
  delivered: 'Entregado',
  read: 'Leído',
  failed: 'Falló',
}

/** Resultados después de los cuales el próximo envío es un intento nuevo, con otra clave. */
const FINAL = new Set(['sent', 'rejected', 'unconfirmed', 'invalid', 'window-closed', 'no-phone', 'not-found', 'key-reused'])

function ItemView({ item }: { readonly item: Item }) {
  if (item.kind === 'unsupported') {
    return (
      <div className="msg marker">
        Mensaje de tipo «{item.type}» (fuera de alcance, sin contenido)
        <span className="meta">{formatTime(item.at)}</span>
      </div>
    )
  }
  if (item.kind === 'attempt') {
    return (
      <div className="msg attempt">
        <strong>{item.state === 'sending' ? 'Enviando…' : 'Intento sin confirmar: puede haber salido.'}</strong>
        {item.body === null ? <div>(texto borrado por retención)</div> : <div>{item.body}</div>}
        <span className="meta">
          {formatTime(item.at)}
          {item.reason === null ? null : ` · ${item.reason}`}
        </span>
      </div>
    )
  }
  return (
    <div className={`msg ${item.direction}`}>
      {item.body}
      <span className="meta">
        {item.direction === 'inbound' ? 'Recibido' : 'Saliente'} · {formatTime(item.at)}
        {item.direction === 'outbound' ? ` · ${item.status === null ? 'Sin estado aún' : STATUS_LABEL[item.status]}` : null}
        {item.status === 'failed' ? (
          <span className="error">
            {' '}· Error {item.errorCode === null ? '' : String(item.errorCode)} {item.errorTitle ?? ''}
          </span>
        ) : null}
      </span>
    </div>
  )
}

export function Thread({ id }: { readonly id: number }) {
  const { poll, refresh } = usePolling<ThreadData>(`/api/conversations/${String(id)}`)
  const data = poll.state === 'ok' ? poll.data : poll.state === 'error' ? poll.data : null
  const [text, setText] = useState('')
  // Una clave por intento (R-20): se reusa en el reintento del mismo texto y cambia con
  // el texto o después de un resultado definitivo.
  const [key, setKey] = useState(() => crypto.randomUUID())
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<ReplyOutcome | null>(null)

  const submit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault()
    if (sending) return
    setSending(true)
    try {
      const response = await fetch(`/api/conversations/${String(id)}/reply`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: key, body: text }),
      })
      if (response.status === 401) {
        window.location.assign('/login')
        return
      }
      const result = (await response.json()) as ReplyOutcome
      setOutcome(result)
      if (FINAL.has(result.kind)) setKey(crypto.randomUUID())
      if (result.kind === 'sent') setText('')
    } catch {
      // Sin respuesta: se conserva la clave, y reintentar el mismo texto no envía dos veces.
      setOutcome({ kind: 'network', message: 'No hubo respuesta del servidor. Podés reintentar: no se envía dos veces.' })
    } finally {
      setSending(false)
      refresh()
    }
  }

  return (
    <main>
      <header className="bar">
        <h1>{data === null ? 'Conversación' : participantLabel(data.label)}</h1>
        <span>
          <a href="/">Conversaciones</a>
        </span>
        <LogoutButton />
      </header>
      <Freshness lastDeliveryAt={data?.lastDeliveryAt ?? null} poll={poll} />
      {data === null ? (
        <p className="muted">Cargando…</p>
      ) : (
        <section className="panel">
          <div className="thread">
            {data.items.length === 0 ? <p className="muted">Sin mensajes.</p> : null}
            {data.items.map((item, n) => (
              <ItemView key={item.kind === 'unsupported' ? `u-${String(n)}-${item.at}` : `${item.kind}-${String(item.id)}`} item={item} />
            ))}
          </div>
          <form className="reply" onSubmit={(e) => void submit(e)}>
            <p className={data.window.open ? 'muted' : 'notice warn'}>
              {data.window.open
                ? `Ventana de servicio abierta hasta ${formatTime(data.window.closesAt)}`
                : data.window.closesAt === null
                  ? 'Ventana de servicio cerrada: el participante todavía no escribió.'
                  : `Ventana de servicio cerrada desde ${formatTime(data.window.closesAt)}: no se puede enviar texto libre`}
            </p>
            {data.replyBlockedReason === null ? null : <p className="notice warn">{data.replyBlockedReason}</p>}
            {outcome === null ? null : (
              <p className={outcome.kind === 'sent' ? 'muted' : 'notice error'}>
                {outcome.message}
                {outcome.title === undefined ? null : ` (${outcome.code === null || outcome.code === undefined ? '' : `${String(outcome.code)}: `}${outcome.title})`}
                {outcome.reason === undefined ? null : ` (${outcome.reason})`}
              </p>
            )}
            <textarea
              rows={3}
              maxLength={4096}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setKey(crypto.randomUUID())
              }}
              disabled={!data.canReply || !data.window.open}
              placeholder="Escribí una respuesta"
            />
            <button type="submit" disabled={sending || !data.canReply || !data.window.open || text.trim() === ''}>
              {sending ? 'Enviando…' : 'Enviar'}
            </button>
          </form>
        </section>
      )}
    </main>
  )
}
