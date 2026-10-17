import type { Figura } from './contenido'
import { Icono } from './Iconos'

/**
 * Cuadrícula 2×2 (1 columna en móvil) de celdas idénticas: cada figura en un
 * marco blanco 4:3 con object-fit: contain (ni se recorta ni se deforma).
 * Toda la tarjeta abre el visor: el botón "Ampliar" (siempre visible, también
 * en táctil) se extiende con ::after sobre la tarjeta.
 */
export function Figuras({ figuras, onAmpliar }: { figuras: Figura[]; onAmpliar: (f: Figura) => void }) {
  return (
    // auto-rows-fr: todas las filas miden lo que la más alta, así las cuatro
    // celdas quedan iguales aunque los pies tengan largos distintos
    <div className="grid auto-rows-fr gap-5 md:grid-cols-2">
      {figuras.map((f) => (
        <figure
          key={f.src}
          data-figura={f.numero}
          className="group relative flex h-full flex-col gap-3 rounded-lg border border-borde bg-panel p-3 transition duration-200 focus-within:border-acento hover:border-acento/60 hover:shadow-lg motion-safe:hover:-translate-y-0.5 sm:p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="etiqueta cifra">FIG. {f.numero}</span>
            <button
              type="button"
              onClick={() => onAmpliar(f)}
              aria-label={`Ampliar figura ${f.numero}: ${f.titulo}`}
              className="etiqueta inline-flex items-center gap-1.5 rounded-sm border border-borde-fuerte px-2 py-1 text-[10px] text-tinta transition-colors group-hover:border-acento after:absolute after:inset-0 after:rounded-lg after:content-['']"
            >
              <Icono nombre="ampliar" className="h-3.5 w-3.5" />
              Ampliar
            </button>
          </div>
          <div data-marco className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-borde-fuerte bg-white p-2">
            <img
              src={f.src}
              alt={f.alt}
              width={f.ancho}
              height={f.alto}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          </div>
          <figcaption className="flex min-h-[6.5rem] flex-col gap-1">
            <span className="font-mono text-sm text-tinta">{f.titulo}</span>
            <span className="text-sm leading-snug text-tenue">{f.pie}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
