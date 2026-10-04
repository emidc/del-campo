'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Cada cuánto se consulta mientras la pestaña está visible (T-0025: polling, no push). */
export const POLL_INTERVAL_MS = 3000

export type Poll<T> =
  | { readonly state: 'loading' }
  | { readonly state: 'ok'; readonly data: T; readonly fetchedAt: Date }
  | { readonly state: 'error'; readonly message: string; readonly data: T | null }

/**
 * Consulta `url` al montar, cada 3 s mientras la pestaña está visible y al volver a
 * ella. Un 401 lleva al login. Devuelve también `refresh` para después de un envío.
 */
export const usePolling = <T,>(url: string): { poll: Poll<T>; refresh: () => void } => {
  const [poll, setPoll] = useState<Poll<T>>({ state: 'loading' })
  const last = useRef<T | null>(null)
  const inFlight = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin' })
      if (response.status === 401 || response.status === 503) {
        window.location.assign('/login')
        return
      }
      if (!response.ok) {
        setPoll({ state: 'error', message: `El servidor respondió ${String(response.status)}.`, data: last.current })
        return
      }
      const data = (await response.json()) as T
      last.current = data
      setPoll({ state: 'ok', data, fetchedAt: new Date() })
    } catch {
      setPoll({ state: 'error', message: 'Sin conexión con el servidor.', data: last.current })
    } finally {
      inFlight.current = false
    }
  }, [url])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, POLL_INTERVAL_MS)
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  return { poll, refresh: () => void load() }
}

const TIME_ZONE = 'America/Argentina/Mendoza'

export const formatTime = (iso: string | null): string => {
  if (iso === null) return 'nunca'
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso))
}

export interface Label {
  readonly profileName: string | null
  readonly waIdLast4: string | null
  readonly bsuid: string | null
}

/** Nombre de perfil y últimos 4 dígitos, o el BSUID si falta el teléfono (CO01 §2). */
export const participantLabel = (l: Label): string => {
  const name = l.profileName ?? 'Sin nombre'
  if (l.waIdLast4 !== null) return `${name} · …${l.waIdLast4}`
  return `${name} · ${l.bsuid ?? 'sin identificador'}`
}

export function Freshness({ lastDeliveryAt, poll }: { readonly lastDeliveryAt: string | null; readonly poll: Poll<unknown> }) {
  return (
    <p className="muted">
      Última entrega de webhook recibida: <strong>{formatTime(lastDeliveryAt)}</strong>
      {poll.state === 'error' ? <span className="error"> · {poll.message}</span> : null}
    </p>
  )
}

export function LogoutButton() {
  return (
    <form method="post" action="/api/logout">
      <button className="link" type="submit">Salir</button>
    </form>
  )
}
