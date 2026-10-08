'use client'

import { Freshness, formatTime, LogoutButton, participantLabel, usePolling, type Deliveries, type Label } from './polling.tsx'

interface ListData {
  readonly deliveries: Deliveries
  readonly conversations: (Label & { readonly id: number; readonly lastMessageAt: string; readonly windowOpen: boolean })[]
}

export function ConversationList() {
  const { poll } = usePolling<ListData>('/api/conversations')
  const data = poll.state === 'ok' ? poll.data : poll.state === 'error' ? poll.data : null

  return (
    <main>
      <header className="bar">
        <h1>Conversaciones</h1>
        <LogoutButton />
      </header>
      <Freshness deliveries={data?.deliveries ?? null} poll={poll} />
      {data === null ? (
        <p className="muted">Cargando…</p>
      ) : data.conversations.length === 0 ? (
        <p className="muted">Todavía no hay conversaciones.</p>
      ) : (
        <ul className="list panel">
          {data.conversations.map((c) => (
            <li key={c.id}>
              <a href={`/c/${String(c.id)}`}>
                <span>
                  {participantLabel(c)}
                  <span className="meta">Último mensaje: {formatTime(c.lastMessageAt)}</span>
                </span>
                <span className={c.windowOpen ? 'badge open' : 'badge'}>
                  {c.windowOpen ? 'Ventana abierta' : 'Ventana cerrada'}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
