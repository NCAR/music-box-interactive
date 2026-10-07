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

export const reactionRegistry = [
  {
    type: 'ARRHENIUS',
    // Names, units and descriptions follow the Arrhenius type in the mechanism configuration docs:
    // https://mechanismconfiguration.readthedocs.io/en/latest/api/index.html
    parameters: [
      {
        key: 'A',
        placeholder: '1.0',
        name: 'Pre-exponential factor',
        unit: '(mol m^-3)^-(n-1) s^-1',
      },
      { key: 'B', placeholder: '0.0', name: 'Unitless exponential factor', unit: 'unitless' },
      {
        key: 'C',
        placeholder: '0.0',
        name: 'Activation threshold',
        description:
          'Expected to be the negative activation energy divided by the Boltzmann constant (-E_a / k_B).',
        unit: 'K',
      },
      {
        key: 'D',
        placeholder: '300.0',
        name: 'Temperature dependence factor',
        description: 'A factor that determines temperature dependence.',
        unit: 'K',
      },
      {
        key: 'E',
        placeholder: '0.0',
        name: 'Pressure dependence factor',
        description: 'A factor that determines pressure dependence.',
        unit: 'Pa^-1',
      },
    ],
    label: 'Arrhenius',
    component: ArrheniusReactionForm,
  },
  {
    type: 'EMISSION',
    parameters: [{ key: 'scaling factor', placeholder: '1.0' }],
    label: 'Emission',
    component: EmissionReactionForm,
  },
  {
    type: 'FIRST_ORDER_LOSS',
    parameters: [{ key: 'scaling factor', placeholder: '1.0' }],
    label: 'First-order loss',
    component: FirstOrderLossReactionForm,
  },
  {
    type: 'PHOTOLYSIS',
    parameters: [{ key: 'scaling factor', placeholder: '1.0' }],
    label: 'Photolysis',
    component: PhotolysisReactionForm,
  },
  {
    type: 'TERNARY_CHEMICAL_ACTIVATION',
    parameters: [
      { key: 'k0_A', placeholder: '1.0' },
      { key: 'k0_B', placeholder: '0.0' },
      { key: 'k0_C', placeholder: '0.0' },
      { key: 'kinf_A', placeholder: '1.0' },
      { key: 'kinf_B', placeholder: '0.0' },
      { key: 'kinf_C', placeholder: '0.0' },
      { key: 'Fc', placeholder: '0.6' },
      { key: 'N', placeholder: '1.0' },
    ],
    label: 'Ternary chemical activation',
    component: TernaryChemicalActivationReactionForm,
  },
  {
    type: 'TROE',
    parameters: [
      { key: 'k0_A', placeholder: '1.0' },
      { key: 'k0_B', placeholder: '0.0' },
      { key: 'k0_C', placeholder: '0.0' },
      { key: 'kinf_A', placeholder: '1.0' },
      { key: 'kinf_B', placeholder: '0.0' },
      { key: 'kinf_C', placeholder: '0.0' },
      { key: 'Fc', placeholder: '0.6' },
      { key: 'N', placeholder: '1.0' },
    ],
    label: 'Troe (Fall-off)',
    component: TroeReactionForm,
  },
  {
    type: 'BRANCHED_NO_RO2',
    // Names follow the Branched type in the mechanism configuration docs. The descriptions of X and
    // Y and the units of Y, a0 and n come from the app's earlier reaction help. The docs give no
    // units for Branched, so X uses the unit of the Arrhenius A.
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
        description: 'The \u03b1_0 in Z(\u03b1_0, n), which sets the split between the two branches.',
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
    parameters: [
      { key: 'A', placeholder: '1.0' },
      { key: 'B', placeholder: '0.0' },
      { key: 'C', placeholder: '0.0' },
    ],
    label: 'Tunneling',
    component: TunnelingReactionForm,
  },
  {
    type: 'SURFACE',
    parameters: [{ key: 'reaction probability', placeholder: '1.0' }],
    label: 'Surface',
    component: SurfaceReactionForm,
  },
  {
    type: 'USER_DEFINED',
    parameters: [{ key: 'scaling factor', placeholder: '1.0' }],
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
