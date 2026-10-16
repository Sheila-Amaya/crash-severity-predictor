import { NavLink, Outlet, useLocation } from 'react-router-dom'

/** Marca: señal preventiva (triángulo) en un recuadro de borde fino. */
function Marca() {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-borde-fuerte"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 2.5 20h19L12 3Z" strokeLinejoin="round" />
        <path d="M12 10v4.5" strokeLinecap="round" />
        <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    </span>
  )
}

const enlace = ({ isActive }: { isActive: boolean }) =>
  `rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
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
        <NavLink to="/" className="flex min-w-0 items-center gap-3" aria-label="Severidad vial: volver al mapa">
          <Marca />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-tinta">Severidad vial</span>
            <span className="etiqueta block truncate text-[10px]">Mapa de siniestralidad · Guatemala</span>
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
            className="rounded-sm bg-boton px-3 py-1.5 text-sm font-semibold text-boton-texto transition-opacity duration-150 hover:opacity-90"
          >
            Simulador
          </NavLink>
        </nav>
      </header>

      <main id="contenido" className={`relative min-h-0 flex-1 ${enMapa ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <Outlet />
      </main>
    </div>
  )
}
