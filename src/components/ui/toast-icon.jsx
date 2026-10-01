// Left-hand icon panel of a toast: a tinted panel with a filled glyph, colored per variant.
const STYLES = {
  success: { panel: '#D5EADF', glyph: '#5BA67A', shape: 'check' },
  warning: { panel: '#FAF0D2', glyph: '#E8BE52', shape: 'triangle' },
  destructive: { panel: '#F7CFCB', glyph: '#E9665A', shape: 'exclamation' },
  delete: { panel: '#DCE8F7', glyph: '#3B7DD8', shape: 'trash' },
  default: { panel: '#DCE8F7', glyph: '#3B7DD8', shape: 'info' },
}

function Glyph({ shape, color }) {
  const common = { width: 32, height: 32, viewBox: '0 0 32 32', 'aria-hidden': true }
  if (shape === 'triangle') {
    return (
      <svg {...common}>
        <path d="M16 3 L30 27 H2 Z" fill={color} stroke={color} strokeWidth="3" strokeLinejoin="round" />
        <rect x="14.8" y="11" width="2.4" height="9" rx="1.2" fill="#fff" />
        <circle cx="16" cy="23.2" r="1.5" fill="#fff" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="16" cy="16" r="16" fill={color} />
      {shape === 'check' && (
        <path
          d="M10 16.5 L14.2 20.7 L22 12.5"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
      {shape === 'exclamation' && (
        <>
          <rect x="14.8" y="8" width="2.4" height="10" rx="1.2" fill="#fff" />
          <circle cx="16" cy="22.5" r="1.5" fill="#fff" />
        </>
      )}
      {shape === 'trash' && (
        <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M10.5 11.5 H21.5" />
          <path d="M14 11.5 V10 H18 V11.5" />
          <path d="M11.8 11.5 L12.6 21.5 H19.4 L20.2 11.5" />
          <path d="M14.5 14.5 V19" />
          <path d="M17.5 14.5 V19" />
        </g>
      )}
      {shape === 'info' && (
        <>
          <circle cx="16" cy="10" r="1.5" fill="#fff" />
          <rect x="14.8" y="14" width="2.4" height="10" rx="1.2" fill="#fff" />
        </>
      )}
    </svg>
  )
}

export function ToastIcon({ variant }) {
  const style = STYLES[variant] ?? STYLES.default
  return (
    <div
      className="flex w-14 shrink-0 items-center justify-center"
      style={{ backgroundColor: style.panel }}
    >
      <Glyph shape={style.shape} color={style.glyph} />
    </div>
  )
}
