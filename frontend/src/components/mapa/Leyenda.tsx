import { useMapaUi } from '../../state/mapaUi'
import { usePaleta } from '../../theme/tema'
import type { Metrica } from '../../utils/clasificacion'
import { formatoEntero, formatoPorcentaje } from '../../utils/formato'
import { radioBurbuja, radioMaximo } from '../../utils/geometria'
import { Segmentado } from '../ui/Segmentado'
import { useClasificacionMapa } from './useClasificacionMapa'

const METRICAS: { valor: Metrica; etiqueta: string }[] = [
  { valor: 'letalidad', etiqueta: 'Letalidad' },
  { valor: 'total', etiqueta: 'Víctimas' },
]

function rango(min: number, max: number, metrica: Metrica) {
  const f = metrica === 'letalidad' ? formatoPorcentaje : formatoEntero
  return min === max ? f(min) : `${f(min)} – ${f(max)}`
}

/** Leyenda compacta y horizontal; se adapta a la vista (burbujas, áreas, 3D). */
export function Leyenda({ ancho = 'w-[22rem]' }: { ancho?: string }) {
  const paleta = usePaleta()
  const { clasificacion, metrica, nivel, vista } = useClasificacionMapa()
  const setMetrica = useMapaUi((estado) => estado.setMetrica)
  const brillo = useMapaUi((estado) => estado.brillo)
  const setBrillo = useMapaUi((estado) => estado.setBrillo)

  const clases = clasificacion?.clases ?? []
  const sinVictimas = clasificacion?.sinVictimas ?? 0
  const unidad = nivel === 'depto' ? 'departamento' : 'municipio'
  const maxTotal = Math.max(0, ...(clasificacion?.coleccion.features.map((f) => f.properties.total) ?? [0]))
  const radioMax = radioMaximo(nivel)
  const muestras = maxTotal > 0 ? [maxTotal, Math.round(maxTotal / 4)] : []
  const nombreVista = vista === '3d' ? '3D' : vista === 'areas' ? 'Áreas' : 'Burbujas'

  return (
    <section aria-labelledby="leyenda-titulo" className={`flotante pointer-events-auto ${ancho} max-w-full p-2.5`}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="leyenda-titulo" className="etiqueta text-[10px]">
          Leyenda · {nombreVista}
        </h2>
        {vista === 'burbujas' && (
          <label className="etiqueta flex cursor-pointer items-center gap-1.5 text-[10px] text-tinta">
            Brillo
            <input
              type="checkbox"
              role="switch"
              checked={brillo}
              onChange={(e) => setBrillo(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--c-accent)]"
            />
          </label>
        )}
      </div>

      {vista === 'areas' && (
        <div className="mt-2">
          <Segmentado etiqueta="Métrica del color" opciones={METRICAS} valor={metrica} onCambio={setMetrica} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
        {/* Color: quintiles relativos (fila completa) */}
        <div className="w-full min-w-0">
          <p className="mb-1 text-[10.5px] text-tinta">Color: {metrica === 'letalidad' ? 'letalidad' : 'víctimas'}</p>
          {clases.length === 0 && <p className="text-[10.5px] text-tenue">Sin datos para mostrar.</p>}
          <ol
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${Math.max(clases.length, 1)}, minmax(0, 1fr))` }}
            aria-label="Clases de color"
          >
            {clases.map((clase) => (
              <li key={clase.indice} title={`${clase.etiqueta}: ${rango(clase.min, clase.max, metrica)}`}>
                <span aria-hidden="true" className="block h-2" style={{ backgroundColor: clase.color }} />
                <span className="etiqueta mt-0.5 block text-center text-[9px]">
                  {clases.length === 5 ? `Q${clase.indice}` : `G${clase.indice}`}
                </span>
                <span className="sr-only">
                  {clase.etiqueta}: {rango(clase.min, clase.max, metrica)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Tamaño (burbujas) o altura (3D) */}
        {vista === 'burbujas' && muestras.length > 0 && (
          <div className="flex items-end gap-2" role="img" aria-label={`Tamaño: víctimas (${muestras.map(formatoEntero).join(' y ')})`}>
            {muestras.map((valor) => {
              const r = radioBurbuja(valor, maxTotal, 5, radioMax) * 0.55
              return (
                <span key={valor} className="flex flex-col items-center">
                  <svg width={r * 2 + 2} height={r * 2 + 2} aria-hidden="true">
                    <circle cx={r + 1} cy={r + 1} r={r} fill="none" stroke={paleta.mapBubbleStroke} strokeWidth="1" />
                  </svg>
                  <span className="cifra text-[9.5px] text-tenue">{formatoEntero(valor)}</span>
                </span>
              )
            })}
          </div>
        )}
        {vista === '3d' && (
          // Texto siempre visible (no un tooltip): la leyenda flota en una esquina
          // y así se lee igual con ratón, teclado, pantalla táctil y lector
          <div>
            <p className="text-[10.5px] text-tinta">Altura: víctimas (escala suavizada)</p>
            <p className="mt-0.5 text-[10px] leading-snug text-tenue">
              Una columna más alta tiene más víctimas, pero la altura no es proporcional: se suaviza para que los
              municipios grandes no tapen a los demás. Para cifras exactas, usa el ranking.
            </p>
          </div>
        )}

        {sinVictimas > 0 && (
          <p className="flex items-center gap-1.5 text-[10.5px] text-tinta">
            {vista === 'burbujas' ? (
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: paleta.mapNullDot }} />
            ) : (
              <span
                aria-hidden="true"
                className="h-2.5 w-3"
                style={{
                  backgroundColor: paleta.mapNull,
                  backgroundImage: `repeating-linear-gradient(135deg, ${paleta.mapBubbleStroke} 0 1px, transparent 1px 4px)`,
                }}
              />
            )}
            Sin víctimas <span className="cifra text-tenue">{sinVictimas}</span>
          </p>
        )}
      </div>

      <details className="mt-2 text-[10.5px]">
        <summary className="etiqueta cursor-pointer text-[10px] text-tinta">Rangos por clase</summary>
        <ul className="mt-1 grid grid-cols-1 gap-0.5">
          {[...clases].reverse().map((clase) => (
            <li key={clase.indice} className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-1.5 text-tinta">
                <span aria-hidden="true" className="h-2 w-2" style={{ backgroundColor: clase.color }} />
                {clase.etiqueta}
              </span>
              <span className="cifra text-tenue">{rango(clase.min, clase.max, metrica)}</span>
            </li>
          ))}
        </ul>
      </details>

      <p className="mt-1.5 border-t border-borde pt-1.5 text-[10px] leading-snug text-tenue">
        Los cortes se calculan con los datos visibles y cambian con los filtros.
        {vista === 'burbujas' && ` Resumen por ${unidad}; no es la ubicación exacta de cada hecho.`} Límites: IDEG.
      </p>
    </section>
  )
}
