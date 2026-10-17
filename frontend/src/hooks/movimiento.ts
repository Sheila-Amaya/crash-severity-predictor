import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

const CONSULTA = '(prefers-reduced-motion: reduce)'

// Sin matchMedia (navegadores muy antiguos, jsdom) se asume que no se pide
// reducir el movimiento.
function suscribir(callback: () => void) {
  const media = window.matchMedia?.(CONSULTA)
  media?.addEventListener('change', callback)
  return () => media?.removeEventListener('change', callback)
}

/** true si el sistema pide reducir el movimiento. */
export function usePrefiereMenosMovimiento(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia?.(CONSULTA).matches ?? false,
    () => false,
  )
}

/** Duración de animación: 250 ms, o 0 si se pide reducir movimiento. */
export function useDuracionAnimacion(ms = 250): number {
  return usePrefiereMenosMovimiento() ? 0 : ms
}

/**
 * Anima un número hacia `objetivo` (ease-out, 250 ms). Con
 * prefers-reduced-motion salta directo al valor final.
 */
export function useNumeroAnimado(objetivo: number | null, duracion = 250): number | null {
  const reducido = usePrefiereMenosMovimiento()
  const [valor, setValor] = useState(objetivo)
  const actual = useRef(objetivo)

  useEffect(() => {
    if (objetivo === null || reducido || actual.current === null) {
      actual.current = objetivo
      setValor(objetivo)
      return
    }

    const desde = actual.current
    const inicio = performance.now()
    let frame = 0

    const paso = (ahora: number) => {
      const progreso = Math.min(1, (ahora - inicio) / duracion)
      const suavizado = 1 - (1 - progreso) ** 3
      const siguiente = desde + (objetivo - desde) * suavizado

      actual.current = siguiente
      setValor(siguiente)

      if (progreso < 1) frame = requestAnimationFrame(paso)
    }

    frame = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(frame)
  }, [objetivo, reducido, duracion])

  return valor
}
