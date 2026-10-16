import { useResumen } from '../../api/queries'
import { useNumeroAnimado } from '../../hooks/movimiento'
import { useFiltros } from '../../state/filtros'
import { formatoEntero, formatoPorcentaje } from '../../utils/formato'
import { Ayuda } from '../ui/Ayuda'
import { ErrorCarga, Skeleton } from '../ui/Estados'

interface KpiProps {
  etiqueta: string
  valor: number | null
  formato: (valor: number) => string
  pie: string
  /** Explicación cuando el valor es null. */
  notaNulo?: string | null
  destacado?: boolean
  /** Columna derecha: el tooltip se abre hacia la izquierda. */
  derecha?: boolean
}

function Kpi({ etiqueta, valor, formato, pie, notaNulo, destacado = false, derecha = false }: KpiProps) {
  const animado = useNumeroAnimado(valor)

  return (
    <div className={`flex flex-col gap-1 bg-panel p-3 ${destacado ? 'col-span-2' : ''}`}>
      <p className="etiqueta flex items-center gap-1.5 text-[10px]">
        {etiqueta}
        {valor === null && notaNulo && (
          <Ayuda etiqueta={`Por qué ${etiqueta.toLowerCase()} no está disponible`} hacia={derecha ? 'izquierda' : 'derecha'}>
            {notaNulo}
          </Ayuda>
        )}
      </p>
      <p
        className={`cifra leading-none font-semibold ${destacado ? 'text-3xl text-acento' : 'text-2xl text-tinta'}`}
        aria-live="polite"
      >
        {animado === null ? '—' : formato(animado)}
      </p>
      <p className="text-[11px] text-tenue">{pie}</p>
    </div>
  )
}

export function Kpis() {
  const filtros = useFiltros((estado) => estado.filtros)
  const { data, isPending, isError, refetch, isFetching } = useResumen(filtros)

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-px">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className={`h-20 ${i === 4 ? 'col-span-2' : ''}`} etiqueta="Cargando indicadores…" />
        ))}
      </div>
    )
  }

  if (isError) return <ErrorCarga mensaje="No se pudieron cargar los indicadores." onReintentar={refetch} />

  const entero = (v: number) => formatoEntero(Math.round(v))

  // gap-px sobre fondo de borde: rejilla con líneas de 1 px
  return (
    <div
      className={`grid grid-cols-2 gap-px rounded-sm border border-borde bg-borde transition-opacity duration-200 ${
        isFetching ? 'opacity-70' : ''
      }`}
      aria-busy={isFetching}
    >
      <Kpi etiqueta="Víctimas" valor={data.victimas} formato={entero} pie="fallecidos + lesionados" />
      <Kpi etiqueta="Hechos" valor={data.hechos} formato={entero} pie="hechos de tránsito" notaNulo={data.nota} derecha />
      <Kpi etiqueta="Fallecidos" valor={data.fallecidos} formato={entero} pie="víctimas fallecidas" />
      <Kpi etiqueta="Lesionados" valor={data.lesionados} formato={entero} pie="víctimas lesionadas" />
      <Kpi
        etiqueta="Letalidad"
        valor={data.letalidad}
        formato={formatoPorcentaje}
        pie="fallecidos / (fallecidos + lesionados)"
        notaNulo="Sin víctimas con estos filtros."
        destacado
      />
    </div>
  )
}
