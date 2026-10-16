import { Route, Routes } from 'react-router-dom'

import { Layout } from './components/Layout'
import { Panel } from './pages/Panel'

function Pendiente({ titulo }: { titulo: string }) {
  return <h1 className="rotulo text-3xl font-extrabold uppercase">{titulo}</h1>
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Panel />} />
        <Route path="simulador" element={<Pendiente titulo="Simulador" />} />
        <Route path="acerca" element={<Pendiente titulo="Acerca de" />} />
      </Route>
    </Routes>
  )
}
