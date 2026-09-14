// Símbolo de Compás: una persona bailando de perfil, en pictograma, sobre una
// línea de tiempo con una marca de nota. Hereda el color del texto
// (currentColor); en la cabecera va en text-primary.
export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="32" fill="currentColor" />
      <g transform="translate(-3 0)">
        <circle cx="36" cy="12" r="4.5" fill="#fff" />
        <g fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M35 19 L31 33" />
          <path d="M34 22 L47 12" />
          <path d="M34 22 L23 27" />
          <path d="M31 33 L20 42" />
          <path d="M31 33 L38 38 L40 45" />
        </g>
      </g>
      <rect x="16" y="49" width="32" height="3.5" rx="1.75" fill="#fff" opacity="0.55" />
      <circle cx="45" cy="50.75" r="4.5" fill="#fff" />
    </svg>
  );
}
