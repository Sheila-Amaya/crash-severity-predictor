import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { Layout } from './components/Layout'

// Cada página es un chunk aparte: el simulador y "Acerca de" no cargan MapLibre
// ni Recharts, y el mapa no carga el simulador.
const Panel = lazy(() => import('./pages/Panel').then((m) => ({ default: m.Panel })))
const Simulador = lazy(() => import('./pages/Simulador').then((m) => ({ default: m.Simulador })))
const Acerca = lazy(() => import('./pages/Acerca').then((m) => ({ default: m.Acerca })))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Panel />} />
        <Route path="simulador" element={<Simulador />} />
        <Route path="acerca" element={<Acerca />} />
      </Route>
    </Routes>
  )
}
