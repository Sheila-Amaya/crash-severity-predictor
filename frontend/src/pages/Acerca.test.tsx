import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { REPOSITORIO } from '../proyecto'
import { Acerca } from './Acerca'

const RESUMEN = { hechos: 52488, victimas: 71942, fallecidos: 13741, lesionados: 58201, letalidad: 19.1, nota: null }
const CATALOGOS = {
  anio: [2018, 2019, 2020, 2021, 2022, 2023, 2024].map((id) => ({ id, descripcion: String(id) })),
  depto: Array.from({ length: 22 }, (_, i) => ({ id: i + 1, descripcion: `Depto ${i + 1}` })),
  municipio: [],
  g_hora_5: [],
  dia_sem_ocu: [],
  tipo_eve: [],
  tipo_veh: [],
  sexo: [],
  edad_quinquenales: [],
}

const respuesta = (status: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } }))

function montar(falla = false) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (falla) return respuesta(503, { success: false, message: 'Sin base' })
      if (url.includes('/api/resumen')) return respuesta(200, RESUMEN)
      if (url.endsWith('/api/catalogos')) return respuesta(200, CATALOGOS)
      return respuesta(404, {})
    }),
  )
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const envoltorio = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  return render(<Acerca />, { wrapper: envoltorio })
}

describe('Acerca', () => {
  beforeEach(() => vi.unstubAllGlobals())
  afterEach(() => cleanup())

  it('muestra el hero con las cifras leídas de la API', async () => {
    montar()
    expect(screen.getByRole('heading', { level: 1, name: 'Un mapa de severidad vial, abierto y explicable.' })).toBeTruthy()
    expect(await screen.findByText('71,942')).toBeTruthy()
    expect(screen.getByText('52,488')).toBeTruthy()
    // 7 años (2018–2024) y 22 departamentos, desde /api/catalogos
    expect(await screen.findByText('7')).toBeTruthy()
    expect(screen.getByText('2018–2024')).toBeTruthy()
    expect(screen.getByText('22')).toBeTruthy()
    expect(document.title).toBe('Acerca de · Severidad vial · Guatemala')
  })

  it('tiene las cinco secciones numeradas, la Tabla I accesible y el enlace al código', () => {
    montar()
    for (const titulo of [
      'Microdatos oficiales del INE.',
      'Random Forest, evaluado en datos que no vio.',
      'Qué pesó en cada estimación.',
      'Para qué sirve y para qué no.',
      'Código abierto.',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: titulo })).toBeTruthy()
    }

    const tabla = screen.getByRole('table', { name: /Tabla I/ })
    for (const valor of ['0.6949', '0.7233', '0.7336', '0.6245', '0.3382']) {
      expect(within(tabla).getByText(valor)).toBeTruthy()
    }
    expect(screen.getByRole('list', { name: 'Flujo del sistema' }).textContent).toContain('Microdatos INE')
    expect(screen.getByText(/1 de cada 3 alertas «Fallecido» es real/)).toBeTruthy()

    const enlace = screen.getByRole('link', { name: /Ver el repositorio en GitHub/ })
    expect(enlace.getAttribute('href')).toBe(REPOSITORIO)
    expect(enlace.getAttribute('rel')).toBe('noopener noreferrer')
    // Sin pie de autoría ni créditos
    expect(document.querySelector('footer')).toBeNull()
  })

  it('las figuras cargan en diferido, con alt y tamaño reservado', () => {
    montar()
    const imagenes = screen.getAllByRole('img').filter((i) => i.getAttribute('src')?.startsWith('/figuras/'))
    expect(imagenes.map((i) => i.getAttribute('src'))).toEqual([
      '/figuras/shap-resumen.png',
      '/figuras/shap-abejas.png',
      '/figuras/shap-cascada.png',
      '/figuras/arbol-decision.png',
    ])
    for (const img of imagenes) {
      expect(img.getAttribute('loading')).toBe('lazy')
      expect(img.getAttribute('alt')?.length).toBeGreaterThan(20)
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0)
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0)
    }
  })

  it('el lightbox abre la figura, atrapa el foco y se cierra con Esc devolviendo el foco', () => {
    montar()
    const boton = screen.getByRole('button', { name: 'Ampliar figura: Una predicción, paso a paso' })
    boton.focus()
    fireEvent.click(boton)

    const dialogo = screen.getByRole('dialog', { name: 'Una predicción, paso a paso' })
    const cerrar = within(dialogo).getByRole('button', { name: /Cerrar/ })
    expect(document.activeElement).toBe(cerrar)
    expect(within(dialogo).getByRole('img').getAttribute('src')).toBe('/figuras/shap-cascada.png')

    // Tab no sale del diálogo (único elemento enfocable: Cerrar)
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(cerrar)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(boton)
  })

  it('el lightbox también se cierra al hacer clic fuera', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar figura: Qué variables pesan más' }))
    const fondo = document.querySelector('.bg-black\\/75') as HTMLElement
    fireEvent.click(fondo)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('si la API falla, muestra guiones y permite reintentar', async () => {
    montar(true)
    expect(await screen.findByText('No se pudieron cargar las cifras de la API.', { exact: false })).toBeTruthy()
    expect(screen.getAllByText('—').length).toBe(4)
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })
})
