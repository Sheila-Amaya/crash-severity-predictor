import { useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useSerie } from '../../api/queries'
import type { Agrupacion, PuntoSerie } from '../../api/types'
import { useDuracionAnimacion } from '../../hooks/movimiento'
import { useFiltros } from '../../state/filtros'
import { usePaleta } from '../../theme/tema'
import { formatoEntero, formatoNulo, formatoPorcentaje } from '../../utils/formato'
import { ErrorCarga, Skeleton } from '../ui/Estados'
import { Segmentado } from '../ui/Segmentado'
import { Tarjeta } from '../ui/Tarjeta'

const AGRUPACIONES: { valor: Agrupacion; etiqueta: string }[] = [
  { valor: 'anio', etiqueta: 'Año' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'dia_sem', etiqueta: 'Día' },
  { valor: 'jornada', etiqueta: 'Jornada' },
]

function TooltipSerie({ active, payload }: { active?: boolean; payload?: { payload: PuntoSerie }[] }) {
  if (!active || !payload?.length) return null
  const punto = payload[0].payload

  return (
    <div className="rounded-md border border-borde-fuerte bg-tarjeta p-2 text-sm shadow-lg">
      <p className="rotulo font-semibold">{punto.etiqueta}</p>
      <p>Hechos: {formatoNulo(punto.hechos, formatoEntero)}</p>
      <p>Fallecidos: {formatoEntero(punto.fallecidos)}</p>
      <p>Lesionados: {formatoEntero(punto.lesionados)}</p>
      <p className="font-semibold">Letalidad: {formatoNulo(punto.letalidad, formatoPorcentaje)}</p>
    </div>
  )
}

function TablaSerie({ datos }: { datos: PuntoSerie[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-tenue">
          <tr>
            <th scope="col" className="py-1 pr-3">Periodo</th>
            <th scope="col" className="py-1 pr-3 text-right">Hechos</th>
            <th scope="col" className="py-1 pr-3 text-right">Fallecidos</th>
            <th scope="col" className="py-1 pr-3 text-right">Lesionados</th>
            <th scope="col" className="py-1 text-right">Letalidad</th>
          </tr>
        </thead>
        <tbody className="rotulo">
          {datos.map((d) => (
            <tr key={d.clave} className="border-t border-borde">
              <th scope="row" className="py-1 pr-3 text-left font-normal">{d.etiqueta}</th>
              <td className="py-1 pr-3 text-right">{formatoNulo(d.hechos, formatoEntero)}</td>
              <td className="py-1 pr-3 text-right">{formatoEntero(d.fallecidos)}</td>
              <td className="py-1 pr-3 text-right">{formatoEntero(d.lesionados)}</td>
              <td className="py-1 text-right">{formatoNulo(d.letalidad, formatoPorcentaje)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SerieTemporal() {
  const [agrupar, setAgrupar] = useState<Agrupacion>('anio')
  const [verTabla, setVerTabla] = useState(false)
  const filtros = useFiltros((estado) => estado.filtros)
  const { data, isPending, isError, refetch, isFetching } = useSerie(filtros, agrupar)
  const paleta = usePaleta()
  const duracion = useDuracionAnimacion()

  return (
    <Tarjeta
      titulo="Evolución"
      descripcion="Víctimas por periodo (barras) y letalidad (línea, eje derecho)."
      acciones={
        <>
          <Segmentado etiqueta="Agrupar por" opciones={AGRUPACIONES} valor={agrupar} onCambio={setAgrupar} />
          <button
            type="button"
            onClick={() => setVerTabla((v) => !v)}
            aria-pressed={verTabla}
            className="rounded-md border border-borde-fuerte px-2.5 py-1 text-sm"
          >
            {verTabla ? 'Ver gráfica' : 'Ver tabla'}
          </button>
        </>
      }
    >
      {isPending ? (
        <Skeleton className="h-72" etiqueta="Cargando serie…" />
      ) : isError ? (
        <ErrorCarga mensaje="No se pudo cargar la serie." onReintentar={refetch} />
      ) : verTabla ? (
        <TablaSerie datos={data.datos} />
      ) : (
        <div className={`h-72 transition-opacity duration-200 ${isFetching ? 'opacity-70' : ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={paleta.border} vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fill: paleta.muted, fontSize: 12 }} stroke={paleta.borderStrong} />
              <YAxis
                yAxisId="victimas"
                tickFormatter={formatoEntero}
                tick={{ fill: paleta.muted, fontSize: 12 }}
                stroke={paleta.borderStrong}
                width={56}
              />
              <YAxis
                yAxisId="letalidad"
                orientation="right"
                tickFormatter={(v: number) => `${v} %`}
                tick={{ fill: paleta.muted, fontSize: 12 }}
                stroke={paleta.borderStrong}
                width={48}
              />
              <Tooltip content={<TooltipSerie />} cursor={{ fill: paleta.surface2 }} />
              {/* Texto de la leyenda en color de tinta (el color de la serie solo en la muestra) */}
              <Legend
                wrapperStyle={{ fontSize: 13 }}
                formatter={(valor: string) => <span style={{ color: paleta.text }}>{valor}</span>}
              />
              <Bar
                yAxisId="victimas"
                dataKey="lesionados"
                name="Lesionados"
                stackId="victimas"
                fill={paleta.serieLesionados}
                animationDuration={duracion}
                isAnimationActive={duracion > 0}
              />
              <Bar
                yAxisId="victimas"
                dataKey="fallecidos"
                name="Fallecidos"
                stackId="victimas"
                fill={paleta.serieFallecidos}
                radius={[3, 3, 0, 0]}
                animationDuration={duracion}
                isAnimationActive={duracion > 0}
              />
              <Line
                yAxisId="letalidad"
                dataKey="letalidad"
                name="Letalidad (%)"
                type="monotone"
                stroke={paleta.text}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 3, fill: paleta.text }}
                animationDuration={duracion}
                isAnimationActive={duracion > 0}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Tarjeta>
  )
}
