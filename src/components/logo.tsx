// Símbolo de Compás: dos huellas (los pasos) sobre una línea de tiempo con
// una marca de nota. Hereda el color del texto (currentColor); en la
// cabecera va en text-primary.
export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="32" fill="currentColor" />
      <g fill="#fff">
        <g transform="rotate(-14 24 27)">
          <ellipse cx="24" cy="29" rx="5.2" ry="9" />
          <circle cx="24" cy="16.5" r="3.4" />
        </g>
        <g transform="rotate(14 40 23)">
          <ellipse cx="40" cy="25" rx="5.2" ry="9" />
          <circle cx="40" cy="12.5" r="3.4" />
        </g>
      </g>
      <rect x="16" y="45" width="32" height="3.5" rx="1.75" fill="#fff" opacity="0.55" />
      <circle cx="40" cy="46.75" r="4.5" fill="#fff" />
    </svg>
  );
}
