import { NavLink, Outlet } from 'react-router-dom'

import { useTema, type Preferencia } from '../theme/tema'

const ENLACES = [
  { to: '/', etiqueta: 'Panel' },
  { to: '/simulador', etiqueta: 'Simulador' },
  { to: '/acerca', etiqueta: 'Acerca de' },
]

function SelectorTema() {
  const preferencia = useTema((estado) => estado.preferencia)
  const setPreferencia = useTema((estado) => estado.setPreferencia)

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-tenue">Tema</span>
      <select
        value={preferencia}
        onChange={(e) => setPreferencia(e.target.value as Preferencia)}
        className="rounded-md border border-borde-fuerte bg-tarjeta px-2 py-1"
      >
        <option value="sistema">Sistema</option>
        <option value="claro">Claro</option>
        <option value="oscuro">Oscuro</option>
      </select>
    </label>
  )
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-tarjeta focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      <header className="border-b border-borde bg-tarjeta">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-3" aria-label="Inicio: Severidad vial Guatemala">
            {/* Señal preventiva (rombo) como marca */}
            <span
              aria-hidden="true"
              className="flex h-9 w-9 rotate-45 items-center justify-center rounded-md border-2 border-tinta bg-senal"
            >
              <span className="-rotate-45 rotulo text-lg font-black text-[#1C1A17]">!</span>
            </span>
            <span className="leading-tight">
              <span className="rotulo block text-xl font-extrabold uppercase tracking-wide">
                Severidad vial
              </span>
              <span className="block text-xs text-tenue">Guatemala · INE 2018–2024</span>
            </span>
          </NavLink>

          <nav aria-label="Principal" className="flex items-center gap-1">
            {ENLACES.map((enlace) => (
              <NavLink
                key={enlace.to}
                to={enlace.to}
                end
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-semibold transition-colors duration-150 ${
                    isActive ? 'bg-boton text-boton-texto' : 'hover:bg-tarjeta-2'
                  }`
                }
              >
                {enlace.etiqueta}
              </NavLink>
            ))}
          </nav>

          <SelectorTema />
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4">
        <Outlet />
      </main>

      <footer className="border-t border-borde px-4 py-3 text-center text-xs text-tenue">
        Datos: INE Guatemala (2018–2024) · Cartografía: IDEG. Apoyo a la decisión; no sustituye el
        criterio de las autoridades.
      </footer>
    </div>
  )
}
