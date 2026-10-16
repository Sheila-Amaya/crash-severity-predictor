import { Route, Routes } from 'react-router-dom'

import { Layout } from './components/Layout'
import { EtiquetaSeccion } from './components/ui/Editorial'
import { Panel } from './pages/Panel'

/** Página provisional (simulador: etapa e; acerca de: etapa f). */
function Pendiente({ etiqueta, titulo }: { etiqueta: string; titulo: string }) {
  return (
    <div className="mx-auto max-w-[780px] px-4 py-16">
      <EtiquetaSeccion as="p">{etiqueta}</EtiquetaSeccion>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-3 text-tenue">En construcción.</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Panel />} />
        <Route path="simulador" element={<Pendiente etiqueta="Simulador" titulo="Simulador de severidad" />} />
        <Route path="acerca" element={<Pendiente etiqueta="Acerca del proyecto" titulo="Acerca de" />} />
      </Route>
    </Routes>
  )
}
