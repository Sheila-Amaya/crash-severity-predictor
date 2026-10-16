import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Simulador } from './Simulador'

const op = (...pares: [number, string][]) => pares.map(([id, descripcion]) => ({ id, descripcion }))

const OPCIONES = {
  tipo_eve: op([1, 'Colisión'], [5, 'Atropello']),
  tipo_veh: op([1, 'Automóvil'], [4, 'Motocicleta']),
  g_hora_5: op([1, 'Mañana'], [3, 'Noche']),
  dia_sem_ocu: op([1, 'Lunes'], [6, 'Sábado']),
  sexo_per: op([1, 'Hombre'], [2, 'Mujer']),
  edad_quinquenales: op([2, '5 - 9'], [7, '30 - 34']),
  mayor_menor: op([1, 'Mayor'], [2, 'Menor']),
  depto_ocu: op([1, 'Guatemala'], [5, 'Escuintla']),
  nota: 'Algunos códigos del catálogo general no se ofrecen en el simulador.',
}

const PREDICCION = {
  resultado: 'Fallecido',
  clase: 1,
  confianza: 61.2,
  probabilidades: { Fallecido: 61.2, Lesionado: 38.8 },
  factores: [
    { variable: 'tipo_eve', etiqueta: 'Tipo de evento', valor: 5, contribucion: 9.85, efecto: 'aumenta' },
    { variable: 'g_hora_5', etiqueta: 'Jornada', valor: 3, contribucion: 4.1, efecto: 'aumenta' },
    { variable: 'sexo_per', etiqueta: 'Sexo', valor: 1, contribucion: -2.3, efecto: 'disminuye' },
  ],
}

const respuesta = (status: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } }))

function montar(predecir: () => Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) =>
      url.endsWith('/api/predecir/opciones') ? respuesta(200, OPCIONES) : init?.method === 'POST' ? predecir() : respuesta(404, {}),
    ),
  )
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const envoltorio = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  return render(<Simulador />, { wrapper: envoltorio })
}

describe('Simulador', () => {
  beforeEach(() => vi.unstubAllGlobals())
  afterEach(() => cleanup())

  it('muestra la nota de la API sobre las opciones que no se ofrecen', async () => {
    montar(() => respuesta(200, PREDICCION))
    expect(await screen.findByText(OPCIONES.nota)).toBeTruthy()
    expect(screen.getByText(/1 de cada 3 alertas «Fallecido» es real/)).toBeTruthy()
  })

  it('enviar vacío marca los campos y lleva el foco al primero', async () => {
    montar(() => respuesta(200, PREDICCION))
    const boton = await screen.findByRole('button', { name: 'Estimar severidad' })
    fireEvent.click(boton)
    const primero = screen.getByLabelText('Tipo de evento')
    expect(primero.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(primero)
    expect(screen.getAllByText('Elija una opción.')).toHaveLength(8)
  })

  it('muestra la clase, la probabilidad y los factores en lenguaje sencillo', async () => {
    montar(() => respuesta(200, PREDICCION))
    fireEvent.click(await screen.findByRole('button', { name: 'Usar un ejemplo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Estimar severidad' }))

    const titulo = await screen.findByRole('heading', { name: /Clase predicha\s*Fallecido/ })
    await waitFor(() => expect(document.activeElement).toBe(titulo))
    expect(screen.getByText(/Probabilidad estimada de fallecimiento/)).toBeTruthy()
    expect(screen.getByText('Tipo de evento «Atropello» sube la probabilidad de fallecimiento en 9.9 puntos.')).toBeTruthy()
    expect(screen.getByText('Sexo «Hombre» baja la probabilidad de fallecimiento en 2.3 puntos.')).toBeTruthy()
  })

  it('la edad sugiere "mayor o menor de edad"', async () => {
    montar(() => respuesta(200, PREDICCION))
    fireEvent.change(await screen.findByLabelText('Edad (grupo de 5 años)'), { target: { value: '2' } })
    expect((screen.getByLabelText('Mayor o menor de edad') as HTMLSelectElement).value).toBe('2')
  })

  it('422: mensaje claro con el campo rechazado', async () => {
    montar(() =>
      respuesta(422, {
        success: false,
        message: 'Validation error',
        errors: [{ loc: ['body', 'tipo_veh'], msg: 'Value error, tipo_veh=4 no aparece en los datos de entrenamiento.', type: 'value_error' }],
      }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Usar un ejemplo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Estimar severidad' }))

    expect(await screen.findByText(/Revise los datos/)).toBeTruthy()
    expect(screen.getByText('Tipo de vehículo: tipo_veh=4 no aparece en los datos de entrenamiento.')).toBeTruthy()
    expect(screen.getByLabelText('Tipo de vehículo').getAttribute('aria-invalid')).toBe('true')
  })

  it('503: avisa que el modelo no está disponible', async () => {
    montar(() => respuesta(503, { success: false, message: 'Prediction model not available' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Usar un ejemplo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Estimar severidad' }))

    expect(await screen.findByText('El modelo no está disponible en este momento.')).toBeTruthy()
  })
})
