import { useState } from 'react'

import { useMapaUi } from '../../state/mapaUi'
import { usePaleta } from '../../theme/tema'
import type { Metrica } from '../../utils/clasificacion'
import { formatoEntero, formatoPorcentaje } from '../../utils/formato'
import { radioBurbuja, radioMaximo } from '../../utils/geometria'
import { EtiquetaSeccion } from '../ui/Editorial'
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

/** Leyenda compacta del mapa; se adapta a la vista (burbujas, áreas, 3D). */
export function Leyenda() {
  const paleta = usePaleta()
  const { clasificacion, metrica, nivel, vista } = useClasificacionMapa()
  const setMetrica = useMapaUi((estado) => estado.setMetrica)
  const [abierta, setAbierta] = useState(true)

  const clases = clasificacion?.clases ?? []
  const sinVictimas = clasificacion?.sinVictimas ?? 0
  const unidad = nivel === 'depto' ? 'departamento' : 'municipio'
  const maxTotal = Math.max(0, ...(clasificacion?.coleccion.features.map((f) => f.properties.total) ?? [0]))
  const radioMax = radioMaximo(nivel)

  // Muestras de tamaño: máximo y una cuarta parte (área ∝ víctimas)
  const muestras = maxTotal > 0 ? [maxTotal, Math.round(maxTotal / 4)] : []

  return (
    <section aria-labelledby="leyenda-titulo" className="flotante pointer-events-auto w-64">
      <div className="flex flex-col gap-2.5 p-3">
        <EtiquetaSeccion
          as="h2"
          id="leyenda-titulo"
          derecha={
            <button
              type="button"
              onClick={() => setAbierta((v) => !v)}
              aria-expanded={abierta}
              aria-controls="leyenda-contenido"
              className="rounded-sm border border-borde-fuerte px-1.5 py-0.5 text-[9px] text-tinta hover:bg-panel-2"
            >
              {abierta ? 'Ocultar' : 'Mostrar'}
            </button>
          }
        >
          Leyenda · {vista === '3d' ? '3D' : vista === 'areas' ? 'Áreas' : 'Burbujas'}
        </EtiquetaSeccion>

        <div id="leyenda-contenido" hidden={!abierta} className="flex flex-col gap-2.5">

        {vista === 'areas' && (
          <Segmentado etiqueta="Métrica del color" opciones={METRICAS} valor={metrica} onCambio={setMetrica} />
        )}

        {/* Escala de color por quintiles relativos */}
        <div>
          <p className="mb-1 text-[11px] text-tinta">
            Color: {metrica === 'letalidad' ? 'letalidad' : 'víctimas'}
          </p>
          <ol className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.max(clases.length, 1)}, 1fr)` }} aria-label="Clases de color">
            {clases.map((clase) => (
              <li key={clase.indice} title={`${clase.etiqueta}: ${rango(clase.min, clase.max, metrica)}`}>
                <span aria-hidden="true" className="block h-2.5" style={{ backgroundColor: clase.color }} />
                <span className="etiqueta mt-0.5 block text-center text-[9px]">
                  {clases.length === 5 ? `Q${clase.indice}` : `G${clase.indice}`}
                </span>
                <span className="sr-only">
                  {clase.etiqueta}: {rango(clase.min, clase.max, metrica)}
                </span>
              </li>
            ))}
          </ol>
          <p className="etiqueta mt-0.5 flex justify-between text-[9px]" aria-hidden="true">
            <span>← más bajo</span>
            <span>más alto →</span>
          </p>
        </div>

        <details className="text-[11px]">
          <summary className="etiqueta cursor-pointer text-[10px] text-tinta">Rangos por clase</summary>
          <ul className="mt-1.5 flex flex-col gap-1">
            {[...clases].reverse().map((clase) => (
              <li key={clase.indice} className="flex items-baseline justify-between gap-2">
                <span className="text-tinta">{clase.etiqueta}</span>
                <span className="cifra text-tenue">{rango(clase.min, clase.max, metrica)}</span>
              </li>
            ))}
          </ul>
        </details>

        {/* Tamaño (burbujas) o altura (3D) */}
        {vista === 'burbujas' && muestras.length > 0 && (
          <div className="flex items-end gap-3">
            {muestras.map((valor) => {
              const r = radioBurbuja(valor, maxTotal, 5, radioMax) * 0.6
              return (
                <span key={valor} className="flex flex-col items-center gap-0.5">
                  <svg width={r * 2 + 2} height={r * 2 + 2} aria-hidden="true">
                    <circle cx={r + 1} cy={r + 1} r={r} fill="none" stroke={paleta.mapBubbleStroke} strokeWidth="1" />
                  </svg>
                  <span className="cifra text-[10px] text-tenue">{formatoEntero(valor)}</span>
                </span>
              )
            })}
            <span className="pb-3 text-[11px] text-tinta">Tamaño: víctimas</span>
          </div>
        )}
        {vista === '3d' && <p className="text-[11px] text-tinta">Altura: víctimas por municipio (escala raíz cuadrada)</p>}

        {sinVictimas > 0 && (
          <p className="flex items-center gap-2 text-[11px] text-tinta">
            {vista === 'burbujas' ? (
              <span aria-hidden="true" className="ml-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: paleta.mapNullDot }} />
            ) : (
              <span
                aria-hidden="true"
                className="h-2.5 w-3.5"
                style={{
                  backgroundColor: paleta.mapNull,
                  backgroundImage: `repeating-linear-gradient(135deg, ${paleta.mapBubbleStroke} 0 1px, transparent 1px 4px)`,
                }}
              />
            )}
            Sin víctimas <span className="cifra text-tenue">· {sinVictimas}</span>
          </p>
        )}

        <div className="flex flex-col gap-1 border-t border-borde pt-2 text-[10.5px] leading-snug text-tenue">
          <p>Los cortes se calculan con los datos visibles y cambian con los filtros.</p>
          {vista === 'burbujas' && <p>Resumen por {unidad}; no es la ubicación exacta de cada hecho.</p>}
          <p>Límites: IDEG.</p>
        </div>
        </div>
      </div>
    </section>
  )
}
