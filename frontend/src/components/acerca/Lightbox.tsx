import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface FiguraAmpliable {
  src: string
  alt: string
  titulo: string
  pie: string
  ancho: number
  alto: number
}

interface Props {
  figura: FiguraAmpliable | null
  onCerrar: () => void
}

const ENFOCABLES = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Figura ampliada en un diálogo modal: Esc o clic fuera para cerrar, foco
 * atrapado dentro y devuelto al botón que lo abrió. La figura conserva su
 * fondo blanco original (nunca se invierten sus colores).
 */
export function Lightbox({ figura, onCerrar }: Props) {
  const dialogo = useRef<HTMLDivElement>(null)
  const cerrar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!figura) return
    const anterior = document.activeElement as HTMLElement | null
    cerrar.current?.focus()

    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCerrar()
        return
      }
      if (e.key !== 'Tab' || !dialogo.current) return
      // Foco atrapado: Tab y Shift+Tab giran dentro del diálogo
      const elementos = [...dialogo.current.querySelectorAll<HTMLElement>(ENFOCABLES)]
      if (elementos.length === 0) return
      const primero = elementos[0]
      const ultimo = elementos[elementos.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      } else if (!dialogo.current.contains(document.activeElement)) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', alPresionar)
    return () => {
      document.removeEventListener('keydown', alPresionar)
      anterior?.focus()
    }
  }, [figura, onCerrar])

  if (!figura) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/75" onClick={onCerrar} aria-hidden="true" />
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-titulo"
        aria-describedby="lightbox-pie"
        className="relative flex max-h-full w-full max-w-6xl flex-col gap-3 rounded-md border border-borde-fuerte bg-panel p-3 shadow-2xl sm:p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="lightbox-titulo" className="etiqueta pt-1.5">
            {figura.titulo}
          </h2>
          <button
            ref={cerrar}
            type="button"
            onClick={onCerrar}
            className="etiqueta shrink-0 rounded-sm border border-borde-fuerte px-2.5 py-1.5 text-[10px] text-tinta hover:bg-panel-2"
          >
            Cerrar <span aria-hidden="true">· Esc</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-borde-fuerte bg-white">
          <img
            src={figura.src}
            alt={figura.alt}
            width={figura.ancho}
            height={figura.alto}
            className="mx-auto h-auto max-h-[75dvh] w-auto max-w-full"
          />
        </div>
        <p id="lightbox-pie" className="text-sm text-tenue">
          {figura.pie}
        </p>
      </div>
    </div>,
    document.body,
  )
}
