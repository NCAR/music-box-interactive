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
    label: 'Arrhenius',
    component: ArrheniusReactionForm,
  },
  {
    type: 'EMISSION',
    label: 'Emission',
    component: EmissionReactionForm,
  },
  {
    type: 'FIRST_ORDER_LOSS',
    label: 'First-order loss',
    component: FirstOrderLossReactionForm,
  },
  {
    type: 'PHOTOLYSIS',
    label: 'Photolysis',
    component: PhotolysisReactionForm,
  },
  {
    type: 'TERNARY_CHEMICAL_ACTIVATION',
    label: 'Ternary chemical activation',
    component: TernaryChemicalActivationReactionForm,
  },
  {
    type: 'TROE',
    label: 'Troe (Fall-off)',
    component: TroeReactionForm,
  },
  {
    type: 'BRANCHED',
    label: 'Branched',
    component: BranchedReactionForm,
  },
  {
    type: 'TUNNELING',
    label: 'Tunneling',
    component: TunnelingReactionForm,
  },
  {
    type: 'SURFACE_REACTION',
    label: 'Surface',
    component: SurfaceReactionForm,
  },
  {
    type: 'USER_DEFINED',
    label: 'User-defined rate',
    component: UserDefinedReactionForm,
  },
  {
    type: 'LAMBDA_RATE',
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
export const getReactionTypeLabel = (reactionType) => {
  const registryType = SOLVER_TYPE_ALIASES[reactionType] ?? reactionType
  const definition = reactionRegistry.find((entry) => entry.type === registryType)
  return definition?.label ?? titleCase(reactionType)
}
