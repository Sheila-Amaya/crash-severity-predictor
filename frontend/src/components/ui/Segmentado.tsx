import { useId } from 'react'

interface Opcion<T extends string> {
  valor: T
  etiqueta: string
}

interface Props<T extends string> {
  etiqueta: string
  opciones: Opcion<T>[]
  valor: T
  onCambio: (valor: T) => void
}

/** Grupo de radios con aspecto segmentado (accesible con teclado y flechas). */
export function Segmentado<T extends string>({ etiqueta, opciones, valor, onCambio }: Props<T>) {
  const nombre = useId()

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{etiqueta}</legend>
      <div className="flex rounded-sm border border-borde-fuerte">
        {opciones.map((opcion) => (
          <label
            key={opcion.valor}
            className="flex-1 cursor-pointer border-r border-borde-fuerte px-2 py-1 text-center font-mono text-[11px] uppercase tracking-wide text-tenue transition-colors duration-150 last:border-r-0 hover:text-tinta has-checked:bg-boton has-checked:text-boton-texto has-focus-visible:outline-2 has-focus-visible:outline-foco"
          >
            <input
              type="radio"
              name={nombre}
              value={opcion.valor}
              checked={opcion.valor === valor}
              onChange={() => onCambio(opcion.valor)}
              className="sr-only"
            />
            {opcion.etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
