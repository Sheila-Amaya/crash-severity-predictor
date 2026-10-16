interface SkeletonProps {
  className?: string
  etiqueta?: string
}

/** Bloque de carga. El pulso se desactiva con prefers-reduced-motion. */
export function Skeleton({ className = '', etiqueta = 'Cargando…' }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label={etiqueta}
      className={`motion-safe:animate-pulse rounded-sm bg-panel-2 ${className}`}
    />
  )
}

interface ErrorProps {
  mensaje?: string
  detalle?: string
  onReintentar: () => void
}

export function ErrorCarga({
  mensaje = 'No se pudieron cargar los datos.',
  detalle,
  onReintentar,
}: ErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-sm border border-borde-fuerte bg-panel-2 p-3">
      <p className="text-sm font-semibold text-peligro">{mensaje}</p>
      {detalle && <p className="text-xs text-tenue">{detalle}</p>}
      <button
        type="button"
        onClick={onReintentar}
        className="rounded-sm bg-boton px-3 py-1 text-sm font-semibold text-boton-texto"
      >
        Reintentar
      </button>
    </div>
  )
}
