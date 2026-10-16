import { useEffect, useState } from 'react'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useCatalogos, useRanking } from '../../api/queries'
import type { FilaRanking, Nivel, OrdenRanking } from '../../api/types'
import { useDuracionAnimacion } from '../../hooks/movimiento'
import { useFiltros } from '../../state/filtros'
import { usePaleta } from '../../theme/tema'
import { formatoEntero, formatoNulo, formatoPorcentaje } from '../../utils/formato'
import { ErrorCarga, Skeleton } from '../ui/Estados'
import { Segmentado } from '../ui/Segmentado'
import { Tarjeta } from '../ui/Tarjeta'

const ORDENES: { valor: OrdenRanking; etiqueta: string }[] = [
  { valor: 'fallecidos', etiqueta: 'Fallecidos' },
  { valor: 'victimas', etiqueta: 'Víctimas' },
  { valor: 'letalidad', etiqueta: 'Letalidad' },
]

const NIVELES: { valor: Nivel; etiqueta: string }[] = [
  { valor: 'depto', etiqueta: 'Depto.' },
  { valor: 'municipio', etiqueta: 'Municipio' },
]

const valorDe = (fila: FilaRanking, orden: OrdenRanking) =>
  orden === 'letalidad' ? (fila.letalidad ?? 0) : orden === 'victimas' ? fila.victimas : fila.fallecidos

const formatoDe = (orden: OrdenRanking) => (orden === 'letalidad' ? formatoPorcentaje : formatoEntero)

function TooltipRanking({ active, payload }: { active?: boolean; payload?: { payload: FilaRanking }[] }) {
  if (!active || !payload?.length) return null
  const fila = payload[0].payload

  return (
    <div className="rounded-md border border-borde-fuerte bg-tarjeta p-2 text-sm shadow-lg">
      <p className="rotulo font-semibold">
        {fila.posicion}. {fila.nombre}
      </p>
      <p>Hechos: {formatoNulo(fila.hechos, formatoEntero)}</p>
      <p>Víctimas: {formatoEntero(fila.victimas)}</p>
      <p>Fallecidos: {formatoEntero(fila.fallecidos)}</p>
      <p className="font-semibold">Letalidad: {formatoNulo(fila.letalidad, formatoPorcentaje)}</p>
      <p className="mt-1 text-xs text-tenue">Clic para filtrar el panel</p>
    </div>
  )
}

export function RankingTop() {
  const filtros = useFiltros((estado) => estado.filtros)
  const hayDepto = filtros.depto !== undefined
  const [nivel, setNivel] = useState<Nivel>(hayDepto ? 'municipio' : 'depto')
  const [orden, setOrden] = useState<OrdenRanking>('fallecidos')

  // Drill-down: con un departamento filtrado, el ranking pasa a sus municipios
  useEffect(() => {
    setNivel(hayDepto ? 'municipio' : 'depto')
  }, [hayDepto])
  const setFiltro = useFiltros((estado) => estado.setFiltro)
  const { data, isPending, isError, refetch, isFetching } = useRanking(filtros, nivel, orden)
  const { data: catalogos } = useCatalogos()
  const paleta = usePaleta()
  const duracion = useDuracionAnimacion()

  const nombreDepto = (codigo: number | null) =>
    catalogos?.depto.find((d) => d.id === codigo)?.descripcion ?? ''

  const filas = (data?.datos ?? []).map((fila) => ({
    ...fila,
    // El departamento solo se aclara si no hay uno filtrado
    etiqueta: nivel === 'municipio' && !hayDepto ? `${fila.nombre} (${nombreDepto(fila.depto)})` : fila.nombre,
    valor: valorDe(fila, orden),
  }))

  const seleccionar = (fila: FilaRanking) =>
    setFiltro(nivel === 'depto' ? 'depto' : 'municipio', fila.codigo)

  return (
    <Tarjeta
      titulo="Top 10"
      descripcion={`${nivel === 'depto' ? 'Departamentos' : 'Municipios'} con más ${
        orden === 'letalidad' ? 'letalidad' : orden
      }.`}
      acciones={
        <>
          <Segmentado etiqueta="Nivel" opciones={NIVELES} valor={nivel} onCambio={setNivel} />
          <Segmentado etiqueta="Ordenar" opciones={ORDENES} valor={orden} onCambio={setOrden} />
        </>
      }
    >
      {isPending ? (
        <Skeleton className="h-80" etiqueta="Cargando ranking…" />
      ) : isError ? (
        <ErrorCarga mensaje="No se pudo cargar el ranking." onReintentar={refetch} />
      ) : filas.length === 0 ? (
        <p className="py-10 text-center text-tenue">Sin víctimas con estos filtros.</p>
      ) : (
        <>
          <div className={`h-80 transition-opacity duration-200 ${isFetching ? 'opacity-70' : ''}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filas} layout="vertical" margin={{ top: 0, right: 64, bottom: 0, left: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="etiqueta"
                  width={nivel === 'municipio' ? 170 : 120}
                  tick={{ fill: paleta.text, fontSize: 12 }}
                  stroke={paleta.borderStrong}
                  interval={0}
                />
                <Tooltip content={<TooltipRanking />} cursor={{ fill: paleta.surface2 }} />
                <Bar
                  dataKey="valor"
                  name={ORDENES.find((o) => o.valor === orden)?.etiqueta}
                  radius={[0, 4, 4, 0]}
                  onClick={(entrada) => seleccionar(entrada as unknown as FilaRanking)}
                  className="cursor-pointer"
                  animationDuration={duracion}
                  isAnimationActive={duracion > 0}
                >
                  {filas.map((fila) => (
                    <Cell
                      key={fila.codigo}
                      fill={orden === 'victimas' ? paleta.serieLesionados : paleta.serieFallecidos}
                    />
                  ))}
                  <LabelList
                    dataKey="valor"
                    position="right"
                    formatter={(v: number) => formatoDe(orden)(v)}
                    style={{ fill: paleta.text, fontSize: 12, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Alternativa accesible al clic en las barras */}
          <ol className="sr-only flex-col gap-1 text-sm focus-within:not-sr-only focus-within:flex">
            {filas.map((fila) => (
              <li key={fila.codigo}>
                <button type="button" onClick={() => seleccionar(fila)}>
                  Filtrar por {fila.etiqueta}: {formatoDe(orden)(fila.valor)}
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </Tarjeta>
  )
}
