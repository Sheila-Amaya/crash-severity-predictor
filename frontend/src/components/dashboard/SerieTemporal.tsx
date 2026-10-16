import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useSerie } from '../../api/queries'
import type { Agrupacion, PuntoSerie } from '../../api/types'
import { useDuracionAnimacion } from '../../hooks/movimiento'
import { useFiltros } from '../../state/filtros'
import { usePaleta } from '../../theme/tema'
import { formatoEntero, formatoNulo, formatoPorcentaje } from '../../utils/formato'
import { EtiquetaSeccion } from '../ui/Editorial'
import { ErrorCarga, Skeleton } from '../ui/Estados'
import { Segmentado } from '../ui/Segmentado'

const AGRUPACIONES: { valor: Agrupacion; etiqueta: string }[] = [
  { valor: 'anio', etiqueta: 'Año' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'dia_sem', etiqueta: 'Día' },
  { valor: 'jornada', etiqueta: 'Jornada' },
]

// Etiquetas cortas para el eje en un panel estrecho
const corta = (etiqueta: string, agrupar: Agrupacion) =>
  agrupar === 'mes' || agrupar === 'dia_sem' ? etiqueta.slice(0, 3) : etiqueta

function TooltipSerie({ active, payload }: { active?: boolean; payload?: { payload: PuntoSerie }[] }) {
  if (!active || !payload?.length) return null
  const punto = payload[0].payload

  return (
    <div className="rounded-sm border border-borde-fuerte bg-panel-2 p-2 text-xs shadow-lg">
      <p className="font-semibold">{punto.etiqueta}</p>
      <p className="cifra text-tenue">Hechos {formatoNulo(punto.hechos, formatoEntero)}</p>
      <p className="cifra text-tenue">Fallecidos {formatoEntero(punto.fallecidos)}</p>
      <p className="cifra text-tenue">Lesionados {formatoEntero(punto.lesionados)}</p>
      <p className="cifra">Letalidad {formatoNulo(punto.letalidad, formatoPorcentaje)}</p>
    </div>
  )
}

function TablaSerie({ datos }: { datos: PuntoSerie[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="etiqueta text-left text-[10px]">
          <tr>
            <th scope="col" className="py-1 pr-2 font-normal">Periodo</th>
            <th scope="col" className="py-1 pr-2 text-right font-normal">Fall.</th>
            <th scope="col" className="py-1 pr-2 text-right font-normal">Les.</th>
            <th scope="col" className="py-1 text-right font-normal">Letal.</th>
          </tr>
        </thead>
        <tbody className="cifra">
          {datos.map((d) => (
            <tr key={d.clave} className="border-t border-borde">
              <th scope="row" className="py-1 pr-2 text-left font-sans font-normal">{d.etiqueta}</th>
              <td className="py-1 pr-2 text-right">{formatoEntero(d.fallecidos)}</td>
              <td className="py-1 pr-2 text-right">{formatoEntero(d.lesionados)}</td>
              <td className="py-1 text-right">{formatoNulo(d.letalidad, formatoPorcentaje)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Leyenda propia: texto en color de tinta; el color de la serie solo en la muestra. */
function LeyendaSerie() {
  const paleta = usePaleta()
  const items = [
    { color: paleta.serieLesionados, texto: 'Lesionados', forma: 'h-2.5 w-2.5' },
    { color: paleta.serieFallecidos, texto: 'Fallecidos', forma: 'h-2.5 w-2.5' },
    { color: paleta.serieLetalidad, texto: 'Letalidad % (eje der.)', forma: 'h-0.5 w-4' },
  ]

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tinta">
      {items.map((item) => (
        <li key={item.texto} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={item.forma} style={{ backgroundColor: item.color }} />
          {item.texto}
        </li>
      ))}
    </ul>
  )
}

export function SerieTemporal() {
  const [agrupar, setAgrupar] = useState<Agrupacion>('anio')
  const [verTabla, setVerTabla] = useState(false)
  const filtros = useFiltros((estado) => estado.filtros)
  const { data, isPending, isError, refetch, isFetching } = useSerie(filtros, agrupar)
  const paleta = usePaleta()
  const duracion = useDuracionAnimacion()

  const datos = (data?.datos ?? []).map((d) => ({ ...d, eje: corta(d.etiqueta, agrupar) }))
  const tick = { fill: paleta.muted, fontSize: 10, fontFamily: 'JetBrains Mono Variable, monospace' }

  return (
    <section aria-labelledby="serie-titulo" className="flex flex-col gap-2.5">
      <EtiquetaSeccion
        as="h3"
        id="serie-titulo"
        derecha={
          <button type="button" onClick={() => setVerTabla((v) => !v)} aria-pressed={verTabla} className="underline">
            {verTabla ? 'Gráfica' : 'Tabla'}
          </button>
        }
      >
        Evolución
      </EtiquetaSeccion>
      <Segmentado etiqueta="Agrupar la serie por" opciones={AGRUPACIONES} valor={agrupar} onCambio={setAgrupar} />

      {isPending ? (
        <Skeleton className="h-48" etiqueta="Cargando serie…" />
      ) : isError ? (
        <ErrorCarga mensaje="No se pudo cargar la serie." onReintentar={refetch} />
      ) : verTabla ? (
        <TablaSerie datos={datos} />
      ) : (
        <>
          <div className={`h-48 transition-opacity duration-200 ${isFetching ? 'opacity-60' : ''}`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={datos} margin={{ top: 6, right: 0, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={paleta.border} vertical={false} />
                <XAxis dataKey="eje" tick={tick} stroke={paleta.border} tickLine={false} interval={0} />
                <YAxis yAxisId="victimas" tickFormatter={formatoEntero} tick={tick} stroke={paleta.border} tickLine={false} width={44} />
                <YAxis
                  yAxisId="letalidad"
                  orientation="right"
                  tickFormatter={(v: number) => `${v}%`}
                  tick={tick}
                  stroke={paleta.border}
                  tickLine={false}
                  width={34}
                />
                <Tooltip content={<TooltipSerie />} cursor={{ fill: paleta.surface2 }} />
                <Bar
                  yAxisId="victimas"
                  dataKey="lesionados"
                  stackId="victimas"
                  fill={paleta.serieLesionados}
                  animationDuration={duracion}
                  isAnimationActive={duracion > 0}
                />
                <Bar
                  yAxisId="victimas"
                  dataKey="fallecidos"
                  stackId="victimas"
                  fill={paleta.serieFallecidos}
                  animationDuration={duracion}
                  isAnimationActive={duracion > 0}
                />
                <Line
                  yAxisId="letalidad"
                  dataKey="letalidad"
                  type="monotone"
                  stroke={paleta.serieLetalidad}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: paleta.serieLetalidad, strokeWidth: 0 }}
                  animationDuration={duracion}
                  isAnimationActive={duracion > 0}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <LeyendaSerie />
        </>
      )}
    </section>
  )
}
