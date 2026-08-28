// Optional species properties and their payload targets.
//
// `target` mirrors the C++ split:
// - 'species': Species members → mechanism.species[]
// - 'phase': PhaseSpecies members → phases[].species[]
//
// Notes:
// - Absolute tolerance requires the `__` prefix; "absolute tolerance" is rejected.
// - mechanism.species[] rejects unknown keys, while phases[].species[] silently ignores them.
export const SPECIES_PROPERTIES = [
  {
    pill: 'Molecular weight',
    key: 'molecular weight [kg mol-1]',
    target: 'species',
    label: 'Molecular weight (kg/mol)',
    placeholder: 'e.g., 0.029',
  },
  {
    pill: 'Absolute tolerance',
    key: '__absolute tolerance',
    target: 'species',
    label: 'Absolute tolerance (mol/m3)',
    placeholder: 'e.g., 1e-12',
  },
  {
    pill: 'Constant concentration',
    key: 'constant concentration [mol m-3]',
    target: 'species',
    label: 'Constant concentration (mol/m3)',
    placeholder: 'e.g., 1e19',
  },
  {
    pill: 'Constant mixing ratio',
    key: 'constant mixing ratio [mol mol-1]',
    target: 'species',
    label: 'Constant mixing ratio (mol/mol)',
    placeholder: 'e.g., 1e-6',
  },
  {
    pill: 'Diffusion coefficient',
    key: 'diffusion coefficient [m2 s-1]',
    target: 'phase',
    label: 'Diffusion coefficient (m2/s)',
    placeholder: 'e.g., 1e-5',
  },
  {
    pill: 'Density',
    key: 'density [kg m-3]',
    target: 'phase',
    label: 'Density (kg/m3)',
    placeholder: 'e.g., 1000',
  },
  // Last: the only boolean, so it reads as a separate kind of thing from the value properties
  // above it. This order drives the pill row and the expanded-chip field list alike.
  {
    pill: 'Third body',
    key: 'is third body',
    target: 'species',
    type: 'boolean',
    label: 'Third body',
  },
]

// Keys that belong on phases[].species[].
export const PHASE_PROPERTY_KEYS = SPECIES_PROPERTIES.filter((f) => f.target === 'phase').map(
  (f) => f.key
)

// Keys that belong on mechanism.species[].
export const SPECIES_PROPERTY_KEYS = SPECIES_PROPERTIES.filter((f) => f.target === 'species').map(
  (f) => f.key
)

// Copies across only the keys the source actually defines, so "not set" stays distinguishable
// from "set to a default".
export const pickDeclared = (source, keys) => {
  const picked = {}
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      picked[key] = source[key]
    }
  }
  return picked
}
