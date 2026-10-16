import { NavLink, Route, Routes } from 'react-router-dom'

import { useCatalogos } from './api/queries'

// Estructura base (etapa a). Las páginas se construyen en las etapas c–f.

function EstadoApi() {
  const { isPending, isError, error, data } = useCatalogos()

  if (isPending) return <p>Conectando con la API…</p>
  if (isError) return <p role="alert">Sin conexión con la API: {error.message}</p>

  return (
    <p>
      API conectada: {data.anio.length} años, {data.depto.length} departamentos,{' '}
      {data.municipio.length} municipios.
    </p>
  )
}

function Pendiente({ titulo }: { titulo: string }) {
  return (
    <section>
      <h1>{titulo}</h1>
      <EstadoApi />
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
          <Route path="/" element={<Pendiente titulo="Panel" />} />
          <Route path="/simulador" element={<Pendiente titulo="Simulador" />} />
          <Route path="/acerca" element={<Pendiente titulo="Acerca de" />} />
        </Routes>
      </main>
    </>
  )
}
