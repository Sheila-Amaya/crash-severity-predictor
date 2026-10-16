import { Fragment, type ReactNode } from 'react'

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

/** Sección con línea divisoria de 1 px arriba (salvo la primera). */
export function SeccionEditorial({
  etiqueta,
  titulo,
  children,
}: {
  etiqueta: string
  titulo?: string
  children?: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-borde py-12 first:border-t-0 first:pt-0">
      <EtiquetaSeccion>{etiqueta}</EtiquetaSeccion>
      {titulo && <h2 className="text-3xl font-semibold tracking-tight text-tinta sm:text-4xl">{titulo}</h2>}
      {children}
    </section>
  )
}

/**
 * Esquema de flujo: cajitas monoespaciadas de borde fino unidas por flechas.
 * En móvil se apila en vertical (flechas hacia abajo).
 */
export function EsquemaFlujo({ pasos, etiqueta }: { pasos: string[]; etiqueta: string }) {
  return (
    <ol
      aria-label={etiqueta}
      className="flex flex-col items-stretch gap-2 rounded-sm border border-borde bg-panel p-3 sm:flex-row sm:flex-wrap sm:items-center"
    >
      {pasos.map((paso, i) => (
        <Fragment key={paso}>
          <li className="rounded-sm border border-borde-fuerte bg-fondo px-3 py-1.5 text-center font-mono text-sm text-tinta">
            {paso}
          </li>
          {i < pasos.length - 1 && (
            <li aria-hidden="true" className="text-center font-mono text-tenue">
              <span className="sm:hidden">↓</span>
              <span className="hidden sm:inline">→</span>
            </li>
          )}
        </Fragment>
      ))}
    </ol>
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
