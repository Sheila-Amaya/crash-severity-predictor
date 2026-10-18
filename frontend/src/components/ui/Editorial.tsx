import type { ReactNode } from 'react'

// Piezas editoriales reutilizables (página "Acerca de", ayuda del simulador y
// secciones de los paneles del mapa).

/** Etiqueta de sección: monoespaciada, mayúsculas, espaciada, gris suave. */
export function EtiquetaSeccion({
  children,
  derecha,
  as: Tag = 'h2',
  id,
}: {
  children: ReactNode
  /** Dato a la derecha (contador, estado). */
  derecha?: ReactNode
  as?: 'h2' | 'h3' | 'p'
  id?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Tag id={id} className="etiqueta">
        {children}
      </Tag>
      {derecha !== undefined && <span className="etiqueta cifra">{derecha}</span>}
    </div>
  )
}

/** Lista en recuadro de borde fino, viñetas cuadradas y filas separadas. */
export function ListaRecuadro({ items, etiqueta }: { items: ReactNode[]; etiqueta?: string }) {
  return (
    <ul aria-label={etiqueta} className="divide-y divide-borde rounded-sm border border-borde bg-panel">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3 text-tinta">
          <span aria-hidden="true" className="mt-[0.55em] h-1.5 w-1.5 shrink-0 bg-tinta" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
