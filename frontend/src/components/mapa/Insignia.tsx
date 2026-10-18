import { useResumen } from '../../api/queries'
import { useFiltros } from '../../state/filtros'
import { formatoEntero } from '../../utils/formato'

/** Insignia inferior izquierda: "● 71,942 VÍCTIMAS · 2018–2024" (según filtros). */
export function Insignia() {
  const filtros = useFiltros((estado) => estado.filtros)
  const { data, isError } = useResumen(filtros)
  const periodo = filtros.anio !== undefined ? String(filtros.anio) : '2018–2024'

  return (
    <p className="flotante etiqueta pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-tinta" aria-live="polite">
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${isError ? 'bg-peligro' : 'bg-acento motion-safe:animate-pulse'}`}
      />
      {isError && !data ? (
        <span>Sin conexión con los datos</span>
      ) : (
        <>
          <span className="cifra">{data ? formatoEntero(data.victimas) : '…'}</span>
          <span>víctimas · {periodo}</span>
        </>
      )}
    </p>
  )
}
