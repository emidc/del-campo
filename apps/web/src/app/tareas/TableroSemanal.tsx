'use client'

// Tablero de «Tareas de la semana»: una columna por estado y una tarjeta por tarea. Al
// soltar una tarjeta en otra columna se guarda el estado con la misma acción que la ficha;
// si falla, la tarjeta vuelve a su columna y se muestra el error.

import type { TaskStatus, TaskSummary } from '@del-campo/api'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import { editarCampo } from '@/app/tareas/acciones'

const ESTADOS: readonly TaskStatus[] = ['PENDIENTE', 'EN_CURSO', 'TRABADA', 'EN_REVISION', 'HECHA']

export function TableroSemanal({
  tareas,
  nombres,
  prioridades,
  hoy,
}: {
  readonly tareas: readonly TaskSummary[]
  readonly nombres: Readonly<Record<TaskStatus, string>>
  readonly prioridades: Readonly<Record<string, string>>
  readonly hoy: string
}) {
  const [estados, setEstados] = useState<Readonly<Record<string, TaskStatus>>>(() =>
    Object.fromEntries(tareas.map((t) => [t.id, t.status])),
  )
  const [arrastrada, setArrastrada] = useState<string | null>(null)
  const [destino, setDestino] = useState<TaskStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, iniciar] = useTransition()

  const estadoDe = (t: TaskSummary): TaskStatus => estados[t.id] ?? t.status

  const mover = (id: string, hacia: TaskStatus) => {
    const tarea = tareas.find((t) => t.id === id)
    if (tarea === undefined) return
    const desde = estadoDe(tarea)
    if (desde === hacia) return
    setEstados((previos) => ({ ...previos, [id]: hacia }))
    setError(null)
    iniciar(async () => {
      const form = new FormData()
      form.set('id', id)
      form.set('campo', 'estado')
      form.set('valor', hacia)
      const resultado = await editarCampo(null, form)
      if (resultado?.ok === false) {
        setEstados((previos) => ({ ...previos, [id]: desde }))
        setError(`No se pudo mover «${tarea.title}». ${resultado.error}`)
      }
    })
  }

  const fecha = (iso: string): string => iso.split('-').reverse().join('/')

  return (
    <>
      {error === null ? null : (
        <p className="estado estado--aviso" role="alert">
          {error}
        </p>
      )}
      <div className="tablero">
        {ESTADOS.map((estado) => {
          const columna = tareas.filter((t) => estadoDe(t) === estado)
          return (
            <section
              key={estado}
              className={destino === estado ? 'tablero__columna tablero__columna--destino' : 'tablero__columna'}
              aria-label={nombres[estado]}
              onDragOver={(e) => {
                if (arrastrada === null) return
                e.preventDefault()
                setDestino(estado)
              }}
              onDragLeave={() => { setDestino((d) => (d === estado ? null : d)); }}
              onDrop={(e) => {
                e.preventDefault()
                const id = arrastrada ?? e.dataTransfer.getData('text/plain')
                setArrastrada(null)
                setDestino(null)
                if (id !== '') mover(id, estado)
              }}
            >
              <h2 className="tablero__titulo">
                {nombres[estado]} <span className="meta">({columna.length})</span>
              </h2>
              {columna.map((t) => (
                <article
                  key={t.id}
                  className={arrastrada === t.id ? 'tarjeta-tarea tarjeta-tarea--arrastrada' : 'tarjeta-tarea'}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', t.id)
                    e.dataTransfer.effectAllowed = 'move'
                    setArrastrada(t.id)
                  }}
                  onDragEnd={() => {
                    setArrastrada(null)
                    setDestino(null)
                  }}
                >
                  <Link href={`/tareas/${t.id}`} className="tarjeta-tarea__titulo">
                    {t.title}
                  </Link>
                  <p className="meta">{t.assignedToMe ? 'Vos' : (t.assignedEmail ?? 'Sin responsable')}</p>
                  <div className="chips">
                    {t.dueDate === null ? null : (
                      <span className={t.dueDate < hoy && estadoDe(t) !== 'HECHA' ? 'chip chip--alerta' : 'chip'}>
                        Vence {fecha(t.dueDate)}
                      </span>
                    )}
                    {t.priority === null ? null : <span className="chip">Prioridad {(prioridades[t.priority] ?? '').toLowerCase()}</span>}
                  </div>
                </article>
              ))}
            </section>
          )
        })}
      </div>
    </>
  )
}
