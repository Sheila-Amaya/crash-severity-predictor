import { useId, useRef, useState, type KeyboardEvent } from 'react'

import { RankingTop } from '../dashboard/RankingTop'
import { SerieTemporal } from '../dashboard/SerieTemporal'

type Pestana = 'ranking' | 'evolucion'

const PESTANAS: { valor: Pestana; etiqueta: string }[] = [
  { valor: 'ranking', etiqueta: 'Ranking' },
  { valor: 'evolucion', etiqueta: 'Evolución' },
]

/** Pestañas "Ranking" / "Evolución" (patrón ARIA tabs, flechas para cambiar). */
export function PestanasDatos() {
  const [pestana, setPestana] = useState<Pestana>('ranking')
  const base = useId()
  const botones = useRef<Record<Pestana, HTMLButtonElement | null>>({ ranking: null, evolucion: null })

  const alTeclear = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const siguiente: Pestana = pestana === 'ranking' ? 'evolucion' : 'ranking'
    setPestana(siguiente)
    botones.current[siguiente]?.focus()
  }

  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label="Datos" className="grid grid-cols-2 border-b border-borde" onKeyDown={alTeclear}>
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            ref={(el) => {
              botones.current[p.valor] = el
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${p.valor}`}
            aria-selected={pestana === p.valor}
            aria-controls={`${base}-panel-${p.valor}`}
            tabIndex={pestana === p.valor ? 0 : -1}
            onClick={() => setPestana(p.valor)}
            className={`etiqueta -mb-px border-b-2 px-3 py-2 text-[10px] max-lg:min-h-11 transition-colors duration-150 ${
              pestana === p.valor ? 'border-acento text-tinta' : 'border-transparent hover:text-tinta'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {PESTANAS.map((p) => (
        <div
          key={p.valor}
          role="tabpanel"
          id={`${base}-panel-${p.valor}`}
          aria-labelledby={`${base}-tab-${p.valor}`}
          hidden={pestana !== p.valor}
          className="p-3"
        >
          {pestana === p.valor && (p.valor === 'ranking' ? <RankingTop conTitulo={false} /> : <SerieTemporal conTitulo={false} />)}
        </div>
      ))}
    </div>
  )
}

interface Props {
  plegado: boolean
  onAlternar: () => void
}

/** Panel flotante derecho, angosto y plegable con un clic (solo escritorio). */
export function PanelDatos({ plegado, onAlternar }: Props) {
  return (
    <aside aria-label="Datos" className="flotante pointer-events-auto w-[21rem] overflow-hidden">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={!plegado}
        aria-controls="panel-datos-contenido"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 hover:bg-panel-2"
      >
        <span className="etiqueta">Datos</span>
        <span className="etiqueta text-[10px] text-tinta" aria-hidden="true">
          {plegado ? '＋ Mostrar' : '－ Ocultar'}
        </span>
      </button>
      {/* Plegado: se desmonta (sin gráficas ocultas de tamaño 0) */}
      {!plegado && (
        <div id="panel-datos-contenido" className="border-t border-borde">
          <PestanasDatos />
        </div>
      )}
    </aside>
  )
}
