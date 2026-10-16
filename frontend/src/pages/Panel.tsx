import { useEffect, useRef, useState } from 'react'

import { BarraFiltros } from '../components/BarraFiltros'
import { ChipsFiltros } from '../components/ChipsFiltros'
import { Kpis } from '../components/dashboard/Kpis'
import { RankingTop } from '../components/dashboard/RankingTop'
import { SerieTemporal } from '../components/dashboard/SerieTemporal'
import { Tarjeta } from '../components/ui/Tarjeta'
import { contarFiltros, useFiltros } from '../state/filtros'
import { useSincronizarUrl } from '../state/useSincronizarUrl'

/** Cajón de filtros para pantallas pequeñas. */
function CajonFiltros() {
  const [abierto, setAbierto] = useState(false)
  const activos = useFiltros((estado) => contarFiltros(estado.filtros))
  const cerrarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!abierto) return
    cerrarRef.current?.focus()
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [abierto])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-expanded={abierto}
        aria-controls="cajon-filtros"
        className="rounded-md bg-boton px-4 py-2 font-semibold text-boton-texto"
      >
        Filtros{activos > 0 ? ` (${activos})` : ''}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Filtros">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAbierto(false)} aria-hidden="true" />
          <div
            id="cajon-filtros"
            className="relative ml-auto flex h-full w-[min(22rem,90vw)] flex-col gap-3 overflow-y-auto bg-fondo p-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="rotulo text-lg font-semibold uppercase">Filtros</h2>
              <button
                ref={cerrarRef}
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-md border border-borde-fuerte px-3 py-1"
              >
                Cerrar
              </button>
            </div>
            <BarraFiltros />
          </div>
        </div>
      )}
    </div>
  )
}

export function Panel() {
  useSincronizarUrl()

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="hidden lg:block" aria-label="Filtros del panel">
        <div className="sticky top-4 rounded-xl border border-borde bg-tarjeta p-4">
          <h2 className="rotulo mb-3 text-lg font-semibold uppercase tracking-wide">Filtros</h2>
          <BarraFiltros />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="rotulo text-3xl font-extrabold uppercase tracking-wide">Panel de siniestralidad</h1>
          <CajonFiltros />
        </div>
        <ChipsFiltros />

        <Kpis />

        <div className="grid gap-4 xl:grid-cols-2">
          <Tarjeta titulo="Mapa" descripcion="Mapa coroplético (etapa d).">
            <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-borde-fuerte text-tenue">
              Próximamente
            </div>
          </Tarjeta>
          <RankingTop />
        </div>

        <SerieTemporal />
      </div>
    </div>
  )
}
