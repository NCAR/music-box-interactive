import { ArrheniusReactionForm } from './ArrheniusReaction'
import { EmissionReactionForm } from './EmissionReaction'
import { FirstOrderLossReactionForm } from './FirstOrderLossReaction'
import { PhotolysisReactionForm } from './PhotolysisReaction'
import { TernaryChemicalActivationReactionForm } from './TernaryChemicalActivationReaction'
import { TroeReactionForm } from './TroeReaction'
import { BranchedReactionForm } from './BranchedReaction'
import { TunnelingReactionForm } from './TunnelingReaction'
import { SurfaceReactionForm } from './SurfaceReaction'
import { UserDefinedReactionForm } from './UserDefinedReaction'
import { LambdaRateReactionForm } from './LambdaRateReaction'

// The optional constant scaling factor of Emission, First-order loss, Photolysis and User-defined
// reactions. `target` is what it scales, in the words of the mechanism configuration docs.
const scalingFactor = (target) => ({
  key: 'scaling factor',
  placeholder: '1.0',
  name: 'Scaling factor',
  description: `A constant scaling factor for the ${target}.`,
  unit: 'unitless',
})

// Troe and ternary chemical activation take the same parameters. Names follow those types in the
// mechanism configuration API reference; descriptions follow their pages in the reactions docs, where
// k0_ and kinf_ are the Arrhenius parameters of k_0 and k_inf with D = 300 and E = 0.
const FALLOFF_PARAMETERS = [
  {
    key: 'k0_A',
    placeholder: '1.0',
    name: 'Low-pressure pre-exponential factor',
    description: 'Arrhenius parameter A of the low-pressure limiting rate constant k_0.',
    unit: '(mol m^-3)^-(n-1) s^-1',
  },
  {
    key: 'k0_B',
    placeholder: '0.0',
    name: 'Low-pressure temperature-scaling parameter',
    description: 'Arrhenius parameter B of k_0.',
    unit: 'unitless',
  },
  {
    key: 'k0_C',
    placeholder: '0.0',
    name: 'Low-pressure exponential factor',
    description: 'Arrhenius parameter C of k_0.',
    unit: 'K',
  },
  {
    key: 'kinf_A',
    placeholder: '1.0',
    name: 'High-pressure pre-exponential factor',
    description: 'Arrhenius parameter A of the high-pressure limiting rate constant k_inf.',
    unit: '(mol m^-3)^-(n-1) s^-1',
  },
  {
    key: 'kinf_B',
    placeholder: '0.0',
    name: 'High-pressure temperature-scaling parameter',
    description: 'Arrhenius parameter B of k_inf.',
    unit: 'unitless',
  },
  {
    key: 'kinf_C',
    placeholder: '0.0',
    name: 'High-pressure exponential factor',
    description: 'Arrhenius parameter C of k_inf.',
    unit: 'K',
  },
  {
    key: 'Fc',
    placeholder: '0.6',
    name: 'F_c parameter',
    description: 'Sets the shape of the fall-off curve. Typically 0.6.',
    unit: 'unitless',
  },
  {
    key: 'N',
    placeholder: '1.0',
    name: 'N parameter',
    description: 'Sets the shape of the fall-off curve. Typically 1.0.',
    unit: 'unitless',
  },
]

export const reactionRegistry = [
  {
    type: 'ARRHENIUS',
    parameters: [
      {
        key: 'A',
        placeholder: '1.0',
        name: 'Pre-exponential factor',
        description: 'n is the number of reactants.',
        unit: '(mol m^-3)^-(n-1) s^-1',
      },
      {
        key: 'B',
        placeholder: '0.0',
        name: 'Unitless exponential factor',
        description: 'The exponent in (T / D)^B.',
        unit: 'unitless',
      },
      {
        key: 'C',
        placeholder: '0.0',
        name: 'Activation threshold',
        description:
          'Equal to -E_a / k_b, where E_a is the activation energy (J) and k_b is the Boltzmann constant (J/K). Give either C or E_a, not both.',
        unit: 'K',
      },
      {
        key: 'D',
        placeholder: '300.0',
        name: 'Temperature dependence factor',
        description: 'The reference temperature D in (T / D)^B.',
        unit: 'K',
      },
      {
        key: 'E',
        placeholder: '0.0',
        name: 'Pressure dependence factor',
        description: 'The coefficient E in (1 + E * P), where P is the pressure (Pa).',
        unit: 'Pa^-1',
      },
    ],
    label: 'Arrhenius',
    component: ArrheniusReactionForm,
  },
  {
    type: 'EMISSION',
    parameters: [scalingFactor('rate')],
    label: 'Emission',
    component: EmissionReactionForm,
  },
  {
    type: 'FIRST_ORDER_LOSS',
    parameters: [scalingFactor('rate')],
    label: 'First-order loss',
    component: FirstOrderLossReactionForm,
  },
  {
    type: 'PHOTOLYSIS',
    parameters: [scalingFactor('rate constant')],
    label: 'Photolysis',
    component: PhotolysisReactionForm,
  },
  {
    type: 'TERNARY_CHEMICAL_ACTIVATION',
    parameters: FALLOFF_PARAMETERS,
    label: 'Ternary chemical activation',
    component: TernaryChemicalActivationReactionForm,
  },
  {
    type: 'TROE',
    parameters: FALLOFF_PARAMETERS,
    label: 'Troe (Fall-off)',
    component: TroeReactionForm,
  },
  {
    type: 'BRANCHED_NO_RO2',
    parameters: [
      {
        key: 'X',
        placeholder: '1.0',
        name: 'Pre-exponential factor',
        description: 'An Arrhenius parameter for the overall reaction.',
        unit: '(mol m^-3)^-(n-1) s^-1',
      },
      {
        key: 'Y',
        placeholder: '0.0',
        name: 'Exponential factor',
        description: 'An Arrhenius parameter for the overall reaction.',
        unit: 'K',
      },
      {
        key: 'a0',
        placeholder: '1.0',
        name: 'Branching factor',
        description: 'Z is defined as a function of \u03b1_0 and n.',
        unit: 'unitless',
      },
      {
        key: 'n',
        placeholder: '0',
        name: 'Number of heavy atoms',
        description:
          'The number of heavy atoms in the RO2 reacting species (excluding the peroxy moiety).',
        unit: 'unitless',
      },
    ],
    label: 'Branched',
    component: BranchedReactionForm,
  },
  {
    type: 'TUNNELING',
    // Names and units follow the Tunneling type in the mechanism configuration docs.
    parameters: [
      {
        key: 'A',
        placeholder: '1.0',
        name: 'Pre-exponential factor',
        description: 'n is the number of reactants.',
        unit: '(mol m^-3)^-(n-1) s^-1',
      },
      {
        key: 'B',
        placeholder: '0.0',
        name: 'Linear temperature-dependent parameter',
        description: 'Captures the temperature dependence in e^(-B/T), as in Wennberg et al. (2018).',
        unit: 'K',
      },
      {
        key: 'C',
        placeholder: '0.0',
        name: 'Cubed temperature-dependent parameter',
        description: 'Captures the temperature dependence in e^(C/T\u00b3), as in Wennberg et al. (2018).',
        unit: 'K^3',
      },
    ],
    label: 'Tunneling',
    component: TunnelingReactionForm,
  },
  {
    type: 'SURFACE',
    parameters: [
      {
        key: 'reaction probability',
        placeholder: '1.0',
        name: 'Reaction probability',
        description: 'The \u03b3 in the equation (0-1).',
        unit: 'unitless',
      },
    ],
    label: 'Surface',
    component: SurfaceReactionForm,
  },
  {
    type: 'USER_DEFINED',
    parameters: [scalingFactor('rate constant')],
    label: 'User-defined rate',
    component: UserDefinedReactionForm,
  },
  {
    type: 'LAMBDA_RATE_CONSTANT',
    parameters: [{ key: 'lambda function' }],
    label: 'Lambda rate',
    component: LambdaRateReactionForm,
  },
]

export const getReactionDefinition = (reactionType) => {
  return (
    reactionRegistry.find((definition) => definition.type === reactionType) || reactionRegistry[0]
  )
}

// Title-case unknown types for readability: USER_DEFINED → "User defined".
const titleCase = (type) => {
  const words = String(type).replace(/_/g, ' ').toLowerCase().trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// Return the type's rate parameters with their solver defaults as placeholders when unset.
export const getReactionParameters = (reactionType) =>
  reactionRegistry.find((entry) => entry.type === reactionType)?.parameters ?? []

export const getReactionTypeLabel = (reactionType) => {
  const definition = reactionRegistry.find((entry) => entry.type === reactionType)
  return definition?.label ?? titleCase(reactionType)
}
