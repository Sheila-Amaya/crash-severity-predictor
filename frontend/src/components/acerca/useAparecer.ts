import { useEffect, useRef, useState } from 'react'

import { usePrefiereMenosMovimiento } from '../../hooks/movimiento'

/**
 * Entrada suave al hacer scroll: devuelve una ref y si el elemento ya entró en
 * pantalla. Sin IntersectionObserver o con prefers-reduced-motion, el
 * contenido es visible desde el principio (nunca queda oculto).
 */
export function useAparecer<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const reducido = usePrefiereMenosMovimiento()
  const soportado = typeof window !== 'undefined' && 'IntersectionObserver' in window
  const [visto, setVisto] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || !soportado || reducido) return
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisto(true)
          observador.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [soportado, reducido])

  const visible = visto || !soportado || reducido
  const clase = reducido
    ? ''
    : `transition-[opacity,translate] duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`

  return { ref, clase }
}
