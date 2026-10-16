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

/** Grupo de botones de radio con aspecto segmentado (accesible con teclado). */
export function Segmentado<T extends string>({ etiqueta, opciones, valor, onCambio }: Props<T>) {
  const nombre = useId()

  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">{etiqueta}</legend>
      <span aria-hidden="true" className="text-xs text-tenue">
        {etiqueta}
      </span>
      <div className="flex rounded-lg border border-borde-fuerte p-0.5">
        {opciones.map((opcion) => (
          <label
            key={opcion.valor}
            className="cursor-pointer rounded-md px-2.5 py-1 text-sm transition-colors duration-150 has-checked:bg-boton has-checked:font-semibold has-checked:text-boton-texto has-focus-visible:outline-3 has-focus-visible:outline-foco"
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
