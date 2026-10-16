import { NavLink, Route, Routes } from 'react-router-dom'

import { useResumen } from './api/queries'
import { BarraFiltros } from './components/BarraFiltros'
import { useFiltros } from './state/filtros'
import { useSincronizarUrl } from './state/useSincronizarUrl'

// Estructura base. El dashboard, el mapa, el simulador y "Acerca de" se
// construyen en las etapas c–f.

function Panel() {
  useSincronizarUrl()

  const filtros = useFiltros((estado) => estado.filtros)
  const resumen = useResumen(filtros)

  return (
    <section>
      <h1>Panel</h1>
      <BarraFiltros />
      <pre aria-live="polite">
        {resumen.isError ? resumen.error.message : JSON.stringify(resumen.data ?? null, null, 2)}
      </pre>
    </section>
  )
}

function Pendiente({ titulo }: { titulo: string }) {
  return (
    <section>
      <h1>{titulo}</h1>
    </section>
  )
}

export default function App() {
  return (
    <>
      <nav aria-label="Principal">
        <NavLink to="/">Panel</NavLink> · <NavLink to="/simulador">Simulador</NavLink> ·{' '}
        <NavLink to="/acerca">Acerca de</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Panel />} />
          <Route path="/simulador" element={<Pendiente titulo="Simulador" />} />
          <Route path="/acerca" element={<Pendiente titulo="Acerca de" />} />
        </Routes>
      </main>
    </>
  )
}
