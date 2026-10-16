import { Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { REPOSITORIO } from '../proyecto'
import { useTema } from '../theme/tema'
import { Skeleton } from './ui/Estados'
import { Logotipo } from './ui/Logotipo'

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

/** Icono a GitHub (marca de GitHub en SVG, sin librerías). Abre otra pestaña. */
function EnlaceGitHub({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Código del proyecto en GitHub"
      title="Código del proyecto en GitHub"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-borde-fuerte text-tenue transition-colors duration-150 hover:text-tinta"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" focusable="false">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
    </a>
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

      <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-borde bg-barra px-2.5 sm:gap-3 sm:px-4">
        <NavLink to="/" className="flex shrink-0 items-center gap-2 sm:min-w-0 sm:shrink sm:gap-3" aria-label="Severidad vial: volver al mapa">
          <Logotipo />
          <span className="shrink-0 leading-tight sm:min-w-0 sm:shrink">
            {/* El nombre nunca se corta; el subtítulo sí (y en móvil se oculta) */}
            <span className="block text-sm font-semibold whitespace-nowrap text-tinta">Severidad vial</span>
            <span className="etiqueta hidden truncate text-[10px] sm:block">Mapa de siniestralidad · Guatemala</span>
          </span>
        </NavLink>

        <nav aria-label="Principal" className="flex shrink-0 items-center gap-1 sm:gap-2">
          {!enMapa && (
            // En móvil el logotipo con el nombre ya lleva al mapa (deja sitio al nombre)
            <NavLink to="/" end className={(estado) => `${enlace(estado)} hidden sm:block`}>
              ← Mapa
            </NavLink>
          )}
          <NavLink to="/acerca" className={enlace}>
            Acerca
          </NavLink>
          <NavLink
            to="/simulador"
            className="rounded-sm bg-boton px-2 py-1.5 text-sm font-semibold sm:px-3 text-boton-texto transition-opacity duration-150 hover:opacity-90"
          >
            Simulador
          </NavLink>
          {REPOSITORIO && <EnlaceGitHub url={REPOSITORIO} />}
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
