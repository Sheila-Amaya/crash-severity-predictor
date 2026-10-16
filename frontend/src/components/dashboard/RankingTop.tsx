import { useEffect, useState } from 'react'
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useCatalogos, useRanking } from '../../api/queries'
import type { FilaRanking, Nivel, OrdenRanking } from '../../api/types'
import { useDuracionAnimacion } from '../../hooks/movimiento'
import { useFiltros } from '../../state/filtros'
import { usePaleta } from '../../theme/tema'
import { formatoEntero, formatoNulo, formatoPorcentaje } from '../../utils/formato'
import { EtiquetaSeccion } from '../ui/Editorial'
import { ErrorCarga, Skeleton } from '../ui/Estados'
import { Segmentado } from '../ui/Segmentado'

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
    <div className="rounded-sm border border-borde-fuerte bg-panel-2 p-2 text-xs shadow-lg">
      <p className="font-semibold">
        {fila.posicion}. {fila.nombre}
      </p>
      <p className="cifra text-tenue">Hechos {formatoNulo(fila.hechos, formatoEntero)}</p>
      <p className="cifra text-tenue">Víctimas {formatoEntero(fila.victimas)}</p>
      <p className="cifra text-tenue">Fallecidos {formatoEntero(fila.fallecidos)}</p>
      <p className="cifra">Letalidad {formatoNulo(fila.letalidad, formatoPorcentaje)}</p>
      <p className="etiqueta mt-1 text-[10px]">Clic para filtrar</p>
    </div>
  )
}

export function RankingTop() {
  const filtros = useFiltros((estado) => estado.filtros)
  const setFiltro = useFiltros((estado) => estado.setFiltro)
  const hayDepto = filtros.depto !== undefined
  const [nivel, setNivel] = useState<Nivel>(hayDepto ? 'municipio' : 'depto')
  const [orden, setOrden] = useState<OrdenRanking>('fallecidos')

  // Drill-down: con un departamento filtrado, el ranking pasa a sus municipios
  useEffect(() => {
    setNivel(hayDepto ? 'municipio' : 'depto')
  }, [hayDepto])

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

  const seleccionar = (fila: FilaRanking) => setFiltro(nivel === 'depto' ? 'depto' : 'municipio', fila.codigo)

  return (
    <section aria-labelledby="ranking-titulo" className="flex flex-col gap-2.5">
      <EtiquetaSeccion as="h3" id="ranking-titulo" derecha={nivel === 'depto' ? 'Depto.' : 'Municipio'}>
        Top 10
      </EtiquetaSeccion>
      <div className="flex flex-col gap-2">
        <Segmentado etiqueta="Nivel del ranking" opciones={NIVELES} valor={nivel} onCambio={setNivel} />
        <Segmentado etiqueta="Ordenar ranking por" opciones={ORDENES} valor={orden} onCambio={setOrden} />
      </div>

      {isPending ? (
        <Skeleton className="h-64" etiqueta="Cargando ranking…" />
      ) : isError ? (
        <ErrorCarga mensaje="No se pudo cargar el ranking." onReintentar={refetch} />
      ) : filas.length === 0 ? (
        <p className="py-8 text-center text-sm text-tenue">Sin víctimas con estos filtros.</p>
      ) : (
        <>
          <div className={`h-64 transition-opacity duration-200 ${isFetching ? 'opacity-60' : ''}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filas} layout="vertical" margin={{ top: 0, right: 52, bottom: 0, left: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="etiqueta"
                  width={nivel === 'municipio' && !hayDepto ? 150 : 108}
                  tick={{ fill: paleta.text, fontSize: 11 }}
                  stroke={paleta.border}
                  tickLine={false}
                  interval={0}
                />
                <Tooltip content={<TooltipRanking />} cursor={{ fill: paleta.surface2 }} />
                <Bar
                  dataKey="valor"
                  fill={orden === 'victimas' ? paleta.serieLesionados : paleta.serieFallecidos}
                  radius={[0, 2, 2, 0]}
                  barSize={14}
                  onClick={(entrada) => seleccionar(entrada as unknown as FilaRanking)}
                  className="cursor-pointer"
                  animationDuration={duracion}
                  isAnimationActive={duracion > 0}
                >
                  <LabelList
                    dataKey="valor"
                    position="right"
                    formatter={(v: number) => formatoDe(orden)(v)}
                    style={{ fill: paleta.text, fontSize: 11, fontFamily: 'JetBrains Mono Variable, monospace' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Alternativa accesible al clic en las barras (visible al recibir foco) */}
          <ol className="sr-only flex-col gap-1 text-xs focus-within:not-sr-only focus-within:flex">
            {filas.map((fila) => (
              <li key={fila.codigo}>
                <button type="button" onClick={() => seleccionar(fila)} className="underline">
                  Filtrar por {fila.etiqueta}: {formatoDe(orden)(fila.valor)}
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
