// The rate equation of a reaction type, shown above its parameter fields. Types without an
// entry here show nothing.
const Sup = ({ children }) => <sup>{children}</sup>

const EQUATIONS = {
  ARRHENIUS: {
    equation: (
      <>
        k = A · e<Sup>C/T</Sup> · (T/D)<Sup>B</Sup> · (1 + E · P)
      </>
    ),
    legend: 'T: temperature (K); P: pressure (Pa)',
  },
}

export function ReactionEquation({ type }) {
  const entry = EQUATIONS[type]
  if (!entry) return null
  return (
    <div className="rounded-xl border border-border bg-assist-secondary px-4 py-3 text-center">
      <div className="font-serif text-lg italic text-assist-secondary-foreground">{entry.equation}</div>
      <div className="pt-2 text-xs text-assist-secondary-foreground">{entry.legend}</div>
    </div>
  )
}
