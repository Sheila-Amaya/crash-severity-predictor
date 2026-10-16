import type { ReactNode } from 'react'

interface Props {
  titulo: string
  /** Controles a la derecha del título (selectores). */
  acciones?: ReactNode
  descripcion?: ReactNode
  children: ReactNode
  className?: string
}

/** Contenedor de sección con título condensado y línea de carril. */
export function Tarjeta({ titulo, acciones, descripcion, children, className = '' }: Props) {
  return (
    <section
      aria-label={titulo}
      className={`flex flex-col gap-3 rounded-xl border border-borde bg-tarjeta p-4 shadow-sm ${className}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="rotulo text-lg font-semibold uppercase tracking-wide">{titulo}</h2>
          {descripcion && <p className="text-sm text-tenue">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
      </header>
      <div className="carril" aria-hidden="true" />
      {children}
    </section>
  )
}
