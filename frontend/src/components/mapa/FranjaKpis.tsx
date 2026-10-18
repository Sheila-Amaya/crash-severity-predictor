import { useResumen } from '../../api/queries'
import { useNumeroAnimado } from '../../hooks/movimiento'
import { useFiltros } from '../../state/filtros'
import { formatoEntero, formatoPorcentaje } from '../../utils/formato'
import { Ayuda } from '../ui/Ayuda'

function Cifra({
  etiqueta,
  valor,
  formato,
  nota,
  acento = false,
}: {
  etiqueta: string
  valor: number | null
  formato: (v: number) => string
  nota?: string | null
  acento?: boolean
}) {
  const animado = useNumeroAnimado(valor)

  return (
    <div className="flex min-w-0 flex-col items-center px-3 py-1.5 sm:px-4">
      <dt className="etiqueta flex items-center gap-1 text-[9px] sm:text-[10px]">
        {etiqueta}
        {valor === null && nota && (
          <Ayuda etiqueta={`Por qué ${etiqueta.toLowerCase()} no está disponible`}>{nota}</Ayuda>
        )}
      </dt>
      <dd className={`cifra text-base leading-tight font-semibold sm:text-lg ${acento ? 'text-acento' : 'text-tinta'}`}>
        {animado === null ? '—' : formato(animado)}
      </dd>
    </div>
  )
}

/** Franja delgada de KPIs arriba al centro (víctimas, hechos, fallecidos, letalidad). */
export function FranjaKpis() {
  const filtros = useFiltros((estado) => estado.filtros)
  const { data, isPending, isError, refetch, isFetching } = useResumen(filtros)
  const entero = (v: number) => formatoEntero(Math.round(v))

  if (isError) {
    return (
      <p role="alert" className="flotante flex items-center gap-2 px-3 py-2 text-xs text-peligro">
        Sin indicadores.
        <button type="button" onClick={() => refetch()} className="underline">
          Reintentar
        </button>
      </p>
    )
  }

  return (
    <dl
      aria-label="Indicadores"
      aria-busy={isPending || isFetching}
      className={`flotante grid grid-cols-4 divide-x divide-borde transition-opacity duration-200 ${
        isFetching ? 'opacity-75' : ''
      }`}
    >
      <Cifra etiqueta="Víctimas" valor={data?.victimas ?? null} formato={entero} />
      <Cifra etiqueta="Hechos" valor={isPending ? null : (data?.hechos ?? null)} formato={entero} nota={data?.nota} />
      <Cifra etiqueta="Fallecidos" valor={data?.fallecidos ?? null} formato={entero} />
      <Cifra
        etiqueta="Letalidad"
        valor={data?.letalidad ?? null}
        formato={formatoPorcentaje}
        nota={data ? 'Sin víctimas con estos filtros.' : null}
        acento
      />
    </dl>
  )
}
