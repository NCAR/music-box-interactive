// The rate equation of a reaction type, shown above its parameter fields. Types without an
// entry here show nothing.
const Sup = ({ children }) => <sup>{children}</sup>
const Sub = ({ children }) => <sub>{children}</sub>

const FALLOFF_LEGEND = (
  <>
    T: temperature (K); [M]: number density of air (mol m<Sup>−3</Sup>)
  </>
)

// Troe and ternary chemical activation share k0, kinf and the broadening factor; only the
// leading fraction of k differs, so it is passed in as the children.
const FalloffEquation = ({ children }) => (
  <div className="space-y-1 text-left text-base">
    <div>
      k<Sub>0</Sub> = k<Sub>0A</Sub> · e<Sup>k<Sub>0C</Sub>/T</Sup> · (T/300.0)
      <Sup>
        k<Sub>0B</Sub>
      </Sup>
    </div>
    <div>
      k<Sub>inf</Sub> = k<Sub>infA</Sub> · e<Sup>k<Sub>infC</Sub>/T</Sup> · (T/300.0)
      <Sup>
        k<Sub>infB</Sub>
      </Sup>
    </div>
    <div>
      k = {children} · F<Sub>c</Sub>
      <Sup>
        1 / (1 + (1/N) · [log<Sub>10</Sub>(k<Sub>0</Sub>[M] / k<Sub>inf</Sub>)]<Sup>2</Sup>)
      </Sup>
    </div>
  </div>
)

const EQUATIONS = {
  ARRHENIUS: {
    equation: (
      <>
        k = A · e<Sup>C/T</Sup> · (T/D)<Sup>B</Sup> · (1 + E · P)
      </>
    ),
    legend: 'T: temperature (K); P: pressure (Pa)',
  },
  TERNARY_CHEMICAL_ACTIVATION: {
    equation: (
      <FalloffEquation>
        k<Sub>0</Sub> / (1 + k<Sub>0</Sub>[M] / k<Sub>inf</Sub>)
      </FalloffEquation>
    ),
    legend: FALLOFF_LEGEND,
  },
  TROE: {
    equation: (
      <FalloffEquation>
        k<Sub>0</Sub>[M] / (1 + k<Sub>0</Sub>[M] / k<Sub>inf</Sub>)
      </FalloffEquation>
    ),
    legend: FALLOFF_LEGEND,
  },
  SURFACE: {
    equation: (
      <div className="space-y-1 text-left text-base">
        <div>
          k<Sub>surface</Sub> = 4N<Sub>a</Sub>πr<Sub>e</Sub>
          <Sup>2</Sup> / (r<Sub>e</Sub> / D<Sub>g</Sub> + 4 / (v(T)γ))
        </div>
        <div>v = √(8RT / (π MW))</div>
      </div>
    ),
    legend: (
      <>
        N<Sub>a</Sub>: number concentration of particles (particles m<Sup>−3</Sup>); r<Sub>e</Sub>:
        effective particle radius (m); D<Sub>g</Sub>: gas-phase diffusion coefficient of the
        reactant (m<Sup>2</Sup> s<Sup>−1</Sup>); v: mean free speed of the gas-phase reactant; R:
        ideal gas constant (J K<Sup>−1</Sup> mol<Sup>−1</Sup>); T: temperature (K); MW: molecular
        weight of the gas-phase reactant (kg mol<Sup>−1</Sup>)
      </>
    ),
  },
  TUNNELING: {
    equation: (
      <>
        k = A · e<Sup>−B/T</Sup> · e<Sup>
          C/T<Sup>3</Sup>
        </Sup>
      </>
    ),
    legend: 'T: temperature (K). More details in Wennberg et al. (2018).',
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
