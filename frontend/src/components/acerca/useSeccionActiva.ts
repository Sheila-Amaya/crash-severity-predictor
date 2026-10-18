import { useEffect, useState } from 'react'

/**
 * Sección visible (scroll-spy):
 *   - si la última sección cabe entera en pantalla (final de la página), esa;
 *   - si no, de las secciones que cruzan la franja superior de la pantalla, la
 *     primera en el orden del documento.
 * Se registran entradas y salidas: una sección que ya salió nunca queda
 * marcada. Entre dos secciones (ninguna en la franja) se conserva la anterior.
 */
export function useSeccionActiva(ids: readonly string[]): string | null {
  const [activa, setActiva] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
    const elementos = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => e !== null)
    const ultima = elementos[elementos.length - 1]
    const enFranja = new Set<string>()
    let ultimaCompleta = false

    // Una sola decisión para los dos observadores (sin carreras entre ellos)
    const decidir = () => {
      if (ultima && ultimaCompleta) return setActiva(ultima.id)
      const primera = ids.find((id) => enFranja.has(id))
      if (primera) setActiva(primera)
    }

    const franja = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) enFranja.add(e.target.id)
          else enFranja.delete(e.target.id)
        }
        decidir()
      },
      // Franja entre el 25 % y el 40 % de la altura de la pantalla
      { rootMargin: '-25% 0px -60% 0px' },
    )
    elementos.forEach((e) => franja.observe(e))

    // La última sección suele ser corta: la página termina antes de que su
    // título llegue a la franja
    const final = new IntersectionObserver(
      ([e]) => {
        ultimaCompleta = e.intersectionRatio >= 0.99
        decidir()
      },
      { threshold: [0, 0.99] },
    )
    if (ultima) final.observe(ultima)

    return () => {
      franja.disconnect()
      final.disconnect()
    }
  }, [ids])

  return activa
}
