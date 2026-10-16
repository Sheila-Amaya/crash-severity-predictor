import { useId, type ReactNode } from 'react'

interface Props {
  /** Texto accesible del disparador. */
  etiqueta: string
  children: ReactNode
}

/**
 * Tooltip accesible: se muestra con el cursor y con el foco del teclado,
 * y el texto queda asociado al botón con aria-describedby.
 */
export function Ayuda({ etiqueta, children }: Props) {
  const id = useId()

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={etiqueta}
        aria-describedby={id}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-borde-fuerte text-xs font-bold text-tenue"
      >
        ?
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute top-full left-1/2 z-20 mt-2 w-64 -translate-x-1/2 rounded-md border border-borde-fuerte bg-tarjeta p-2 text-left text-xs font-normal normal-case tracking-normal text-tinta opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {children}
      </span>
    </span>
  )
}
