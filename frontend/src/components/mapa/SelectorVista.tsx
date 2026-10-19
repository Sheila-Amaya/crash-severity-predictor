import { useEffect, useId, useSyncExternalStore } from 'react'

import { useMapaUi, type Vista } from '../../state/mapaUi'

const VISTAS: { valor: Vista; etiqueta: string }[] = [
  { valor: 'burbujas', etiqueta: 'Burbujas' },
  { valor: 'areas', etiqueta: 'Áreas' },
  { valor: '3d', etiqueta: '3D' },
]

// 3D desactivado en móvil (pantallas pequeñas o táctiles): rendimiento
const CONSULTA_MOVIL = '(max-width: 639px), (pointer: coarse)'

function useEsMovil() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(CONSULTA_MOVIL)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(CONSULTA_MOVIL).matches,
    () => false,
  )
}

/** Interruptor de vista del mapa: BURBUJAS / ÁREAS / 3D. */
export function SelectorVista() {
  const vista = useMapaUi((estado) => estado.vista)
  const setVista = useMapaUi((estado) => estado.setVista)
  const esMovil = useEsMovil()
  const nombre = useId()

  useEffect(() => {
    if (esMovil && vista === '3d') setVista('burbujas')
  }, [esMovil, vista, setVista])

  return (
    <fieldset className="flotante pointer-events-auto flex overflow-hidden">
      <legend className="sr-only">Vista del mapa</legend>
      {VISTAS.map((opcion) => {
        const deshabilitada = opcion.valor === '3d' && esMovil
        return (
          <label
            key={opcion.valor}
            title={deshabilitada ? 'La vista 3D no está disponible en móvil' : undefined}
            className={`border-r border-borde px-3 py-1.5 font-mono max-lg:flex max-lg:min-h-11 max-lg:items-center text-[11px] tracking-wider uppercase transition-colors duration-150 last:border-r-0 has-checked:bg-boton has-checked:text-boton-texto has-focus-visible:outline-2 has-focus-visible:outline-foco ${
              deshabilitada ? 'cursor-not-allowed text-tenue/50' : 'cursor-pointer text-tenue hover:text-tinta'
            }`}
          >
            <input
              type="radio"
              name={nombre}
              value={opcion.valor}
              checked={vista === opcion.valor}
              disabled={deshabilitada}
              onChange={() => setVista(opcion.valor)}
              className="sr-only"
            />
            {opcion.etiqueta}
          </label>
        )
      })}
    </fieldset>
  )
}
