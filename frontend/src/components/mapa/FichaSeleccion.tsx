import { useEffect, useRef } from 'react'

import type { Nivel } from '../../api/types'
import type { PropiedadesMapa } from '../../utils/clasificacion'
import { formatoEntero, formatoNulo, formatoPorcentaje } from '../../utils/formato'

interface Props {
  props: PropiedadesMapa
  nivel: Nivel
  onCerrar: () => void
  /** Acercar y bajar de nivel (el mismo drill-down que el clic en escritorio). */
  onBajarNivel: () => void
}

/**
 * Ficha fija del área tocada (pantallas táctiles, sin hover): muestra sus cifras
 * y ofrece bajar de nivel. Se cierra con ✕, Esc o tocando fuera de ella. Es
 * compacta y va justo encima del selector de vista para no tapar las burbujas.
 */
export function FichaSeleccion({ props, nivel, onCerrar, onBajarNivel }: Props) {
  const ficha = useRef<HTMLElement>(null)

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    // Tocar fuera de la ficha la cierra; en el mapa decide su propio manejador
    // (otra burbuja la reemplaza, el mapa vacío la cierra)
    const alTocar = (e: PointerEvent) => {
      const destino = e.target as Element | null
      if (!destino || ficha.current?.contains(destino) || destino.closest('.maplibregl-canvas')) return
      onCerrar()
    }
    document.addEventListener('keydown', alPresionar)
    document.addEventListener('pointerdown', alTocar)
    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.removeEventListener('pointerdown', alTocar)
    }
  }, [onCerrar])

  return (
    <section
      ref={ficha}
      aria-label={`Datos de ${props.nombre}`}
      className="flotante pointer-events-auto absolute right-4 bottom-[7.5rem] left-4 z-20 mx-auto max-w-sm px-3 pt-1.5 pb-2.5 text-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 pt-1">
          <h2 className="truncate font-semibold text-tinta">{props.nombre}</h2>
          <p className="etiqueta text-[10px] text-tinta">{props.etiquetaClase}</p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label={`Cerrar los datos de ${props.nombre}`}
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-lg text-tenue hover:text-tinta"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <dl className="cifra mt-1 grid grid-cols-[auto_1fr_auto_1fr] gap-x-2 gap-y-0.5 text-xs">
        <dt className="text-tenue">Víctimas</dt>
        <dd className="text-right">{formatoEntero(props.total)}</dd>
        <dt className="pl-2 text-tenue">Fallecidos</dt>
        <dd className="text-right">{formatoEntero(props.fallecidos)}</dd>
        <dt className="text-tenue">Lesionados</dt>
        <dd className="text-right">{formatoEntero(props.lesionados)}</dd>
        <dt className="pl-2 text-tenue">Letalidad</dt>
        <dd className="text-right">{formatoNulo(props.letalidad, formatoPorcentaje)}</dd>
      </dl>
      <button
        type="button"
        onClick={onBajarNivel}
        className="mt-2 flex min-h-11 w-full items-center justify-center rounded-sm bg-boton px-3 text-sm font-semibold text-boton-texto"
      >
        {nivel === 'depto' ? 'Ver municipios' : 'Ver solo este municipio'}
      </button>
    </section>
  )
}
