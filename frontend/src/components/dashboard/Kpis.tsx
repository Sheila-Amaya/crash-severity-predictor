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
}

/** Tarjeta tipo hito kilométrico: cabeza redondeada, cifra condensada grande. */
function Kpi({ etiqueta, valor, formato, pie, notaNulo, destacado = false }: KpiProps) {
  const animado = useNumeroAnimado(valor)

  return (
    <article
      className={`relative flex flex-col items-center rounded-t-[2.5rem] rounded-b-lg border-2 px-3 pt-4 pb-3 text-center ${
        destacado ? 'border-ambar bg-tarjeta' : 'border-borde-fuerte bg-tarjeta'
      }`}
    >
      <h3 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-tenue">
        {etiqueta}
        {valor === null && notaNulo && <Ayuda etiqueta={`Por qué ${etiqueta.toLowerCase()} no está disponible`}>{notaNulo}</Ayuda>}
      </h3>
      <p className="rotulo mt-1 text-4xl leading-none font-bold sm:text-5xl" aria-live="polite">
        {animado === null ? '—' : formato(animado)}
      </p>
      <div className="carril mt-3 w-2/3" aria-hidden="true" />
      <p className="mt-2 text-xs text-tenue">{pie}</p>
    </article>
  )
}

export function Kpis() {
  const filtros = useFiltros((estado) => estado.filtros)
  const { data, isPending, isError, refetch, isFetching } = useResumen(filtros)

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-36" etiqueta="Cargando indicadores…" />
        ))}
      </div>
    )
  }

  if (isError) return <ErrorCarga mensaje="No se pudieron cargar los indicadores." onReintentar={refetch} />

  const entero = (v: number) => formatoEntero(Math.round(v))

  return (
    <div
      className={`grid grid-cols-2 gap-3 transition-opacity duration-200 md:grid-cols-5 ${isFetching ? 'opacity-70' : ''}`}
      aria-busy={isFetching}
    >
      <Kpi etiqueta="Hechos" valor={data.hechos} formato={entero} pie="hechos de tránsito" notaNulo={data.nota} />
      <Kpi etiqueta="Víctimas" valor={data.victimas} formato={entero} pie="fallecidos + lesionados" />
      <Kpi etiqueta="Fallecidos" valor={data.fallecidos} formato={entero} pie="víctimas fallecidas" />
      <Kpi etiqueta="Lesionados" valor={data.lesionados} formato={entero} pie="víctimas lesionadas" />
      <Kpi
        etiqueta="Letalidad"
        valor={data.letalidad}
        formato={formatoPorcentaje}
        pie="fallecidos / víctimas"
        notaNulo="Sin víctimas con estos filtros."
        destacado
      />
    </div>
  )
}
