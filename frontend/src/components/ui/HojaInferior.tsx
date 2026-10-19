import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  titulo: string
  abierta: boolean
  onCerrar: () => void
  children: ReactNode
}

/** Hoja inferior (bottom sheet) para móvil: modal, se cierra con Esc o tocando fuera. */
export function HojaInferior({ titulo, abierta, onCerrar, children }: Props) {
  const cerrarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!abierta) return
    const anterior = document.activeElement as HTMLElement | null
    cerrarRef.current?.focus()
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', alPresionar)
    return () => {
      document.removeEventListener('keydown', alPresionar)
      anterior?.focus()
    }
  }, [abierta, onCerrar])

  if (!abierta) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 bg-black/60" onClick={onCerrar} aria-hidden="true" />
      <div className="relative flex max-h-[82dvh] flex-col rounded-t-lg border-t border-borde-fuerte bg-panel shadow-2xl">
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-borde-fuerte" />
        <div className="flex items-center justify-between border-b border-borde px-3 py-2">
          <h2 className="etiqueta">{titulo}</h2>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            className="etiqueta flex min-h-11 min-w-11 items-center gap-1.5 rounded-sm border border-borde-fuerte px-3 text-[11px] text-tinta"
          >
            <span aria-hidden="true">✕</span>
            Cerrar
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
