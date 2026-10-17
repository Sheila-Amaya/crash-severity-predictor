import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

  it('muestra el hero con el título nuevo y las cifras leídas de la API', async () => {
    montar()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Dónde son más letales los accidentes viales en Guatemala' }),
    ).toBeTruthy()
    // El valor final siempre está disponible (texto para lectores de pantalla)
    expect((await screen.findAllByText('71,942')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('52,488').length).toBeGreaterThan(0)
    expect((await screen.findAllByText('2018–2024')).length).toBe(1)
    expect(screen.getAllByText('22').length).toBeGreaterThan(0)
    expect(document.title).toBe('Acerca de · Severidad vial · Guatemala')
  })

  it('no menciona el paper, el congreso ni "Tabla I"', () => {
    const { container } = montar()
    expect(container.textContent).not.toMatch(/paper|congreso|CONESCAPAN|Tabla I\b|publicaci[oó]n/i)
  })

  it('tiene las cinco secciones, el índice, las métricas accesibles y el enlace al código', () => {
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

    const indice = screen.getByRole('navigation', { name: 'Secciones de la página' })
    expect(within(indice).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '#datos',
      '#modelo',
      '#explicabilidad',
      '#uso-responsable',
      '#codigo',
    ])

    const tabla = screen.getByRole('table', { name: /Métricas del modelo/ })
    for (const valor of ['0.6949', '0.7233', '0.7336', '0.6245', '0.3382']) {
      expect(within(tabla).getByText(valor)).toBeTruthy()
    }
    expect(within(tabla).getByText('De cada 100 fallecidos reales, el modelo detecta ~62.')).toBeTruthy()

    const flujo = screen.getByRole('list', { name: 'Flujo de datos' })
    expect(within(flujo).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Datos INE'),
      expect.stringContaining('Limpieza'),
      expect.stringContaining('Modelo'),
      expect.stringContaining('API'),
      expect.stringContaining('Mapa y simulador'),
    ])
    expect(screen.getByText(/1 de cada 3 alertas «Fallecido» es real/)).toBeTruthy()

    const enlace = screen.getByRole('link', { name: /Ver el repositorio en GitHub/ })
    expect(enlace.getAttribute('href')).toBe(REPOSITORIO)
    expect(enlace.getAttribute('rel')).toBe('noopener noreferrer')
    expect(document.querySelector('footer')).toBeNull()
  })

  it('las cuatro figuras usan celdas idénticas: marco 4:3, contain, etiqueta FIG. y carga diferida', () => {
    montar()
    const celdas = [...document.querySelectorAll<HTMLElement>('[data-figura]')]
    expect(celdas.map((c) => within(c).getByText(/^FIG\. 0\d$/).textContent)).toEqual([
      'FIG. 01',
      'FIG. 02',
      'FIG. 03',
      'FIG. 04',
    ])
    for (const celda of celdas) {
      const marco = celda.querySelector('[data-marco]') as HTMLElement
      expect(marco.className).toContain('aspect-[4/3]')
      const img = within(marco).getByRole('img')
      expect(img.className).toContain('object-contain')
      expect(img.getAttribute('loading')).toBe('lazy')
      expect(img.getAttribute('alt')?.length).toBeGreaterThan(20)
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0)
      // Botón "Ampliar" siempre presente (no depende del hover)
      expect(within(celda).getByRole('button', { name: /^Ampliar figura 0\d:/ })).toBeTruthy()
    }
  })

  it('el visor abre la figura, atrapa el foco y se cierra con Esc devolviendo el foco', () => {
    montar()
    const boton = screen.getByRole('button', { name: 'Ampliar figura 03: Una predicción, paso a paso' })
    boton.focus()
    fireEvent.click(boton)

    const dialogo = screen.getByRole('dialog', { name: 'Una predicción, paso a paso' })
    const cerrar = within(dialogo).getByRole('button', { name: /Cerrar/ })
    expect(document.activeElement).toBe(cerrar)
    expect(within(dialogo).getByRole('img').getAttribute('src')).toBe('/figuras/shap-cascada.png')

    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(cerrar)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(boton)
  })

  it('el visor también se cierra al hacer clic fuera', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar figura 01: Qué variables pesan más' }))
    fireEvent.click(document.querySelector('.bg-black\\/75') as HTMLElement)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('el índice resalta la sección visible (scroll-spy)', () => {
    const observadores: { callback: IntersectionObserverCallback; elementos: Element[] }[] = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        elementos: Element[] = []
        constructor(callback: IntersectionObserverCallback) {
          observadores.push({ callback, elementos: this.elementos })
        }
        observe(el: Element) {
          this.elementos.push(el)
        }
        disconnect() {}
        unobserve() {}
      },
    )
    montar()
    const seccion = document.getElementById('modelo') as HTMLElement
    act(() => {
      for (const o of observadores) {
        if (o.elementos.includes(seccion)) {
          o.callback([{ isIntersecting: true, target: seccion } as unknown as IntersectionObserverEntry], {} as IntersectionObserver)
        }
      }
    })
    const indice = screen.getByRole('navigation', { name: 'Secciones de la página' })
    expect(within(indice).getByRole('link', { name: /Modelo/ }).getAttribute('aria-current')).toBe('location')
    expect(within(indice).getByRole('link', { name: /Datos/ }).getAttribute('aria-current')).toBeNull()
  })

  it('si la API falla, muestra guiones y permite reintentar', async () => {
    montar(true)
    expect(await screen.findByText('No se pudieron cargar las cifras de la API.', { exact: false })).toBeTruthy()
    expect(screen.getAllByText('—').length).toBe(4)
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })
})
