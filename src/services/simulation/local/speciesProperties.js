// The optional species properties MICM understands, and where each belongs in the payload.
//
// `target` mirrors the C++ split: 'species' properties are members of Species and go on
// mechanism.species[]; 'phase' properties are members of PhaseSpecies and go on
// phases[].species[]. Putting a phase property on a species (or vice versa) is not a harmless
// mistake -- see the notes on validation below.
//
// The keys are exact, and taken from the mechanism-configuration constants:
//   inline constexpr std::string_view diffusion_coefficient = "diffusion coefficient [m2 s-1]";
//   inline constexpr std::string_view density               = "density [kg m-3]";
//
// Two traps worth knowing:
//   - Absolute tolerance must carry the `__` prefix. "absolute tolerance" is rejected.
//   - mechanism.species[] rejects any key it does not recognise, but phases[].species[] is not
//     validated at all, so a misspelled phase property is silently ignored rather than erroring.
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
    pill: 'Third body',
    key: 'is third body',
    target: 'species',
    type: 'boolean',
    label: 'Third body',
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
]

/** Keys that belong on phases[].species[] and must be kept off mechanism.species[]. */
export const PHASE_PROPERTY_KEYS = SPECIES_PROPERTIES.filter((f) => f.target === 'phase').map(
  (f) => f.key
)

/** Keys that belong on mechanism.species[]. */
export const SPECIES_PROPERTY_KEYS = SPECIES_PROPERTIES.filter((f) => f.target === 'species').map(
  (f) => f.key
)
