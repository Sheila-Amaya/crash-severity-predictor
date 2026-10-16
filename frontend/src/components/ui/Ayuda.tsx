import { useId, type ReactNode } from 'react'

interface Props {
  /** Texto accesible del disparador. */
  etiqueta: string
  /** Lado hacia el que se abre (usar 'izquierda' cerca del borde derecho). */
  hacia?: 'derecha' | 'izquierda'
  children: ReactNode
}

/**
 * Tooltip accesible: se muestra con el cursor y con el foco del teclado,
 * y el texto queda asociado al botón con aria-describedby.
 */
export function Ayuda({ etiqueta, hacia = 'derecha', children }: Props) {
  const id = useId()

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={etiqueta}
        aria-describedby={id}
        className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-borde-fuerte font-mono text-[10px] text-tenue"
      >
        ?
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none invisible absolute top-full ${hacia === 'derecha' ? 'left-0' : 'right-0'} z-30 mt-2 w-60 rounded-sm border border-borde-fuerte bg-panel-2 p-2 text-left font-sans text-xs normal-case tracking-normal text-tinta opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100`}
      >
        {children}
      </span>
    </span>
  )
}
