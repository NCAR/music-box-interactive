// The rate equation of a reaction type, shown above its parameter fields. Types without an
// entry here show nothing.
const Sup = ({ children }) => <sup>{children}</sup>
const Sub = ({ children }) => <sub>{children}</sub>

const EQUATIONS = {
  ARRHENIUS: {
    equation: (
      <>
        k = A · e<Sup>C/T</Sup> · (T/D)<Sup>B</Sup> · (1 + E · P)
      </>
    ),
    legend: 'T: temperature (K); P: pressure (Pa)',
  },
  BRANCHED_NO_RO2: {
    equation: (
      <div className="space-y-1 text-left text-base">
        <div>
          k<Sub>firstBranch</Sub> = (X · e<Sup>−Y/T</Sup>) · A / (A + Z)
        </div>
        <div>
          k<Sub>secondBranch</Sub> = (X · e<Sup>−Y/T</Sup>) · Z / (Z + A)
        </div>
        <div>
          A(T, [M], n) = (2×10<Sup>−22</Sup> e<Sup>n</Sup> [M]) / (1 + u) · 0.41
          <Sup>1 / (1 + [log u]<Sup>2</Sup>)</Sup>
        </div>
        <div>
          u = (2×10<Sup>−22</Sup> e<Sup>n</Sup> [M]) / (0.43 (T/298)<Sup>−8</Sup>)
        </div>
        <div>
          Z(α<Sub>0</Sub>, n) = A(T = 293 K, [M] = 2.45×10<Sup>19</Sup> molec cm<Sup>−3</Sup>, n) ·
          (1 − α<Sub>0</Sub>) / α<Sub>0</Sub>
        </div>
      </div>
    ),
    legend: (
      <>
        Typically used for NO + RO2 → alkoxy radical + NO2 reactions. T: temperature (K); [M]:
        number density of air (molecules cm<Sup>−3</Sup>). More details in Wennberg et al. (2018).
      </>
    ),
  },
}

export function ReactionEquation({ type }) {
  const entry = EQUATIONS[type]
  if (!entry) return null
  return (
    <div className="rounded-xl border border-border bg-assist-secondary px-4 py-3 text-center">
      <div className="overflow-x-auto font-serif text-lg italic text-assist-secondary-foreground">
        {entry.equation}
      </div>
      <div className="pt-2 text-xs text-assist-secondary-foreground">{entry.legend}</div>
    </div>
  )
}
