import type { ReactNode } from 'react'

// Un solo set de íconos de línea: viewBox 24, trazo 1.6, extremos redondeados.
const TRAZOS = {
  datos: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </>
  ),
  archivos: <path d="M8 3h7l4 4v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v4h4M4 7v13a1 1 0 0 0 1 1h10" />,
  mapa: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" />,
  filtro: <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />,
  arbol: (
    <>
      <circle cx="12" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M12 7v4m0 0-6 6m6-6 6 6" />
    </>
  ),
  servidor: (
    <>
      <rect x="4" y="4" width="16" height="7" rx="1.5" />
      <rect x="4" y="13" width="16" height="7" rx="1.5" />
      <path d="M8 7.5h.01M8 16.5h.01" />
    </>
  ),
  balanza: <path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0L5 8Zm14 0-2.5 6a3 3 0 0 0 5 0L19 8Z" />,
  matraz: <path d="M9 3h6M10 3v6L4.5 18.5A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.5L14 9V3M7 15h10" />,
  lista: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  reloj: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  diana: <path d="M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1M21 3l-8 8" />,
  candado: <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" />,
  codigo: <path d="m8 8-4 4 4 4m8-8 4 4-4 4M14 4l-4 16" />,
  ampliar: <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />,
} satisfies Record<string, ReactNode>

export type NombreIcono = keyof typeof TRAZOS

export function Icono({ nombre, className = 'h-5 w-5' }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TRAZOS[nombre]}
    </svg>
  )
}
