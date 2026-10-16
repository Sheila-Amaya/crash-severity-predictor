import { LOGO } from '../../theme/logo'

/**
 * Logotipo: punto con dos anillos (como las burbujas del mapa) en un cuadro de
 * borde fino. El color es el acento de la paleta del tema activo; el anillo
 * exterior late despacio salvo con prefers-reduced-motion.
 */
export function Logotipo({ className = 'flex' }: { className?: string }) {
  const c = LOGO.vista / 2
  const ultimo = LOGO.anillos.length - 1

  return (
    <span
      aria-hidden="true"
      className={`h-8 w-8 shrink-0 sm:h-9 sm:w-9 items-center justify-center rounded-sm border border-borde-fuerte text-acento ${className}`}
    >
      <svg viewBox={`0 0 ${LOGO.vista} ${LOGO.vista}`} className="h-5 w-5 sm:h-6 sm:w-6" focusable="false">
        {LOGO.anillos.map((a, i) => (
          <circle
            key={a.r}
            cx={c}
            cy={c}
            r={a.r}
            fill="none"
            stroke="currentColor"
            strokeWidth={a.grosor}
            strokeOpacity={a.opacidad}
            className={i === ultimo ? 'logo-pulso' : undefined}
          />
        ))}
        <circle cx={c} cy={c} r={LOGO.punto} fill="currentColor" />
      </svg>
    </span>
  )
}
