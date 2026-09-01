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
    parameters: [
      { key: 'A', placeholder: '1.0' },
      { key: 'B', placeholder: '0.0' },
      { key: 'C', placeholder: '0.0' },
      { key: 'D', placeholder: '300.0' },
      { key: 'E', placeholder: '0.0' },
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
    type: 'BRANCHED',
    parameters: [
      { key: 'X', placeholder: '1.0' },
      { key: 'Y', placeholder: '0.0' },
      { key: 'a0', placeholder: '1.0' },
      { key: 'n', placeholder: '0' },
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
    type: 'SURFACE_REACTION',
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
    type: 'LAMBDA_RATE',
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

// Mechanism files use solver type names that differ from the registry for three types.
// serializeReaction applies this rename when saving; mapping them back keeps loaded reactions
// labelled consistently with form-built ones.
const SOLVER_TYPE_ALIASES = {
  SURFACE: 'SURFACE_REACTION',
  BRANCHED_NO_RO2: 'BRANCHED',
  LAMBDA_RATE_CONSTANT: 'LAMBDA_RATE',
}

// Title-case unknown type names so they remain readable: USER_DEFINED → "User defined".
const titleCase = (type) => {
  const words = String(type).replace(/_/g, ' ').toLowerCase().trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// Returns the display label for a reaction type, accepting either registry or solver naming.
// The registry's spelling of a type. Reactions built in the form carry the registry name while
// ones loaded from a mechanism carry the solver's, so anything grouping by type must reduce both
// to one value first -- otherwise the same kind of reaction appears as two categories.
// The rate parameters a type can carry, each with the value the solver applies when it is left
// unset -- shown as the field's placeholder so an omitted parameter still reads as a value.
export const getReactionParameters = (reactionType) =>
  reactionRegistry.find((entry) => entry.type === canonicalReactionType(reactionType))
    ?.parameters ?? []

export const canonicalReactionType = (reactionType) =>
  SOLVER_TYPE_ALIASES[reactionType] ?? reactionType

export const getReactionTypeLabel = (reactionType) => {
  const registryType = SOLVER_TYPE_ALIASES[reactionType] ?? reactionType
  const definition = reactionRegistry.find((entry) => entry.type === registryType)
  return definition?.label ?? titleCase(reactionType)
}
