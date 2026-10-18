import { useEffect, useRef, type MouseEvent } from 'react'

import { usePrefiereMenosMovimiento } from '../../hooks/movimiento'

interface Seccion {
  numero: string
  id: string
  etiqueta: string
}

/**
 * Índice de la página: columna fija en escritorio y barra horizontal compacta
 * en móvil (el aside que lo contiene la mantiene pegada arriba). El enlace de la sección visible lleva aria-current.
 */
export function Indice({ secciones, activa }: { secciones: readonly Seccion[]; activa: string | null }) {
  const reducido = usePrefiereMenosMovimiento()
  const lista = useRef<HTMLOListElement>(null)

  // Barra horizontal (móvil): desplaza solo la barra para que se vea el enlace
  // activo; nunca mueve el scroll de la página.
  useEffect(() => {
    const ol = lista.current
    if (!ol || !activa || ol.scrollWidth <= ol.clientWidth) return
    const enlace = ol.querySelector<HTMLElement>(`a[href="#${activa}"]`)
    if (!enlace) return
    const izquierda = enlace.offsetLeft - ol.offsetLeft
    if (izquierda < ol.scrollLeft || izquierda + enlace.offsetWidth > ol.scrollLeft + ol.clientWidth) {
      ol.scrollTo({ left: Math.max(0, izquierda - 16), behavior: reducido ? 'auto' : 'smooth' })
    }
  }, [activa, reducido])

  const ir = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const destino = document.getElementById(id)
    if (!destino) return
    e.preventDefault()
    destino.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
  }

  return (
    <nav
      aria-label="Secciones de la página"
      className="-mx-4 border-b border-borde bg-fondo/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:sticky lg:top-24 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
    >
      <p className="etiqueta mb-3 hidden lg:block">Contenido</p>
      <ol ref={lista} className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-l lg:border-borde">
        {secciones.map((s) => {
          const esActiva = activa === s.id
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                onClick={(e) => ir(e, s.id)}
                aria-current={esActiva ? 'location' : undefined}
                className={`flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors duration-150 lg:-ml-px lg:rounded-none lg:border-l-2 lg:py-2 lg:pl-4 ${
                  esActiva
                    ? 'bg-panel-2 text-tinta lg:border-acento lg:bg-transparent'
                    : 'text-tenue hover:text-tinta lg:border-transparent'
                }`}
              >
                <span className={`cifra text-xs ${esActiva ? 'text-acento' : ''}`}>{s.numero}</span>
                <span>{s.etiqueta}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
