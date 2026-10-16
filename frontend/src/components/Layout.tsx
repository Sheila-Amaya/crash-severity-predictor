import { Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { useTema } from '../theme/tema'
import { Skeleton } from './ui/Estados'

/** Marca: señal preventiva (triángulo) en un recuadro de borde fino. */
function Marca() {
  return (
    <span
      aria-hidden="true"
      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-borde-fuerte sm:flex"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 2.5 20h19L12 3Z" strokeLinejoin="round" />
        <path d="M12 10v4.5" strokeLinecap="round" />
        <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    </span>
  )
}

/** Interruptor de tema: el oscuro es el principal; el claro, opcional. */
function InterruptorTema() {
  const tema = useTema((estado) => estado.tema)
  const elegir = useTema((estado) => estado.elegir)
  const claro = tema === 'light'

  return (
    <button
      type="button"
      aria-pressed={claro}
      aria-label="Tema claro"
      title={claro ? 'Tema claro activado' : 'Activar tema claro'}
      onClick={() => elegir(claro ? 'dark' : 'light')}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-borde-fuerte text-tenue transition-colors duration-150 hover:text-tinta"
    >
      {claro ? (
        // Sol: tema claro activo
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
      ) : (
        // Luna: tema oscuro activo
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  )
}

const enlace = ({ isActive }: { isActive: boolean }) =>
  `rounded-sm px-2 py-1.5 sm:px-3 text-sm font-medium transition-colors duration-150 ${
    isActive ? 'text-tinta underline decoration-acento underline-offset-[6px]' : 'text-tenue hover:text-tinta'
  }`

export function Layout() {
  const { pathname } = useLocation()
  const enMapa = pathname === '/'

  return (
    <div className="flex h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-panel focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-borde bg-barra px-3 sm:px-4">
        <NavLink to="/" className="flex shrink-0 items-center gap-3 sm:min-w-0 sm:shrink" aria-label="Severidad vial: volver al mapa">
          <Marca />
          <span className="shrink-0 leading-tight sm:min-w-0 sm:shrink">
            {/* El nombre nunca se corta; el subtítulo sí (y en móvil se oculta) */}
            <span className="block text-sm font-semibold whitespace-nowrap text-tinta">Severidad vial</span>
            <span className="etiqueta hidden truncate text-[10px] sm:block">Mapa de siniestralidad · Guatemala</span>
          </span>
        </NavLink>

        <nav aria-label="Principal" className="flex shrink-0 items-center gap-1 sm:gap-2">
          {!enMapa && (
            <NavLink to="/" end className={enlace}>
              ← Mapa
            </NavLink>
          )}
          <NavLink to="/acerca" className={enlace}>
            Acerca
          </NavLink>
          <NavLink
            to="/simulador"
            className="rounded-sm bg-boton px-2.5 py-1.5 text-sm sm:px-3 font-semibold text-boton-texto transition-opacity duration-150 hover:opacity-90"
          >
            Simulador
          </NavLink>
          <InterruptorTema />
        </nav>
      </header>

      <main id="contenido" className={`relative min-h-0 flex-1 ${enMapa ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {/* Páginas cargadas bajo demanda (el mapa no viaja con el simulador ni con "Acerca de") */}
        <Suspense
          fallback={
            <div className="mx-auto max-w-[780px] px-4 py-16">
              <Skeleton className="h-10 w-2/3" etiqueta="Cargando página…" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
