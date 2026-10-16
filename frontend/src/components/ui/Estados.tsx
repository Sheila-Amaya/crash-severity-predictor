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
      className={`motion-safe:animate-pulse rounded-lg bg-tarjeta-2 ${className}`}
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
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-lg border border-borde-fuerte bg-tarjeta-2 p-4"
    >
      <p className="font-semibold text-peligro">{mensaje}</p>
      {detalle && <p className="text-sm text-tenue">{detalle}</p>}
      <button
        type="button"
        onClick={onReintentar}
        className="rounded-md bg-boton px-3 py-1.5 text-sm font-semibold text-boton-texto"
      >
        Reintentar
      </button>
    </div>
  )
}
