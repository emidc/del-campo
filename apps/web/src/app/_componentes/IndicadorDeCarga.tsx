'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { destinoDeFormularioGet, esClicSimple, llevaAOtraPantalla } from './indicador-carga'

/** Si la respuesta llega antes de esto, no se muestra nada: así no parpadea. */
const DEMORA_MS = 150
/** Por si una navegación se corta sin cambiar la dirección. */
const TOPE_MS = 15000

/**
 * La barra de carga de toda la app. Aparece al tocar un enlace, una pestaña o un filtro que
 * lleva a otra pantalla, y se va cuando la pantalla nueva llegó. Marca además lo que se
 * tocó con `data-cargando`, para que el botón o la pestaña muestren su propio giro.
 * Las acciones que guardan datos tienen su espera en `BotonEnviar`.
 */
export function IndicadorDeCarga() {
  const ruta = usePathname()
  const parametros = useSearchParams()
  const [inicio, setInicio] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)

  // Llegó la pantalla nueva: se termina la espera.
  useEffect(() => {
    setInicio(null)
  }, [ruta, parametros])

  useEffect(() => {
    let marcado: Element | null = null
    const marcar = (el: Element | null) => {
      marcado?.removeAttribute('data-cargando')
      marcado = el
      el?.setAttribute('data-cargando', '')
    }
    const empezar = (el: Element | null) => {
      marcar(el)
      setInicio(Date.now())
    }

    const alClic = (e: MouseEvent) => {
      if (!esClicSimple(e) || !(e.target instanceof Element)) return
      const enlace = e.target.closest('a[href]')
      if (!(enlace instanceof HTMLAnchorElement)) return
      const destino = {
        href: enlace.href,
        actual: location.href,
        target: enlace.getAttribute('target'),
        descarga: enlace.hasAttribute('download'),
      }
      if (llevaAOtraPantalla(destino)) empezar(enlace)
    }

    // Va en la fase de burbuja de window, después de React: si un formulario lo maneja la
    // página (acción del servidor, envío propio), ya llegó con defaultPrevented.
    const alEnviar = (e: SubmitEvent) => {
      if (e.defaultPrevented || !(e.target instanceof HTMLFormElement)) return
      const formulario = e.target
      const metodo = (e.submitter?.getAttribute('formmethod') ?? formulario.method).toLowerCase()
      if (metodo !== 'get') return
      const campos: [string, string][] = []
      new FormData(formulario, e.submitter).forEach((v, k) => {
        if (typeof v === 'string') campos.push([k, v])
      })
      const destino = {
        href: destinoDeFormularioGet(formulario.action, campos),
        actual: location.href,
        target: formulario.getAttribute('target'),
      }
      // Un filtro que se vuelve a enviar igual también recarga la pantalla: se espera.
      if (llevaAOtraPantalla(destino) || destino.href === location.href) empezar(e.submitter ?? null)
    }

    const terminar = () => {
      marcar(null)
      setInicio(null)
    }

    window.addEventListener('click', alClic, true)
    window.addEventListener('submit', alEnviar)
    window.addEventListener('pageshow', terminar)
    return () => {
      window.removeEventListener('click', alClic, true)
      window.removeEventListener('submit', alEnviar)
      window.removeEventListener('pageshow', terminar)
      marcar(null)
    }
  }, [])

  useEffect(() => {
    if (inicio === null) {
      setVisible(false)
      document.querySelectorAll('[data-cargando]').forEach((el) => { el.removeAttribute('data-cargando') })
      return
    }
    const mostrar = setTimeout(() => { setVisible(true) }, DEMORA_MS)
    const tope = setTimeout(() => { setInicio(null) }, TOPE_MS)
    return () => {
      clearTimeout(mostrar)
      clearTimeout(tope)
    }
  }, [inicio])

  return (
    <div className={visible ? 'carga carga--activa' : 'carga'}>
      <span className="carga__barra" aria-hidden="true" />
      <span className="sr" role="status">
        {visible ? 'Cargando…' : ''}
      </span>
    </div>
  )
}
