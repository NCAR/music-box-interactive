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
    label: 'Arrhenius (Temperature-dependent)',
    component: ArrheniusReactionForm,
  },
  {
    type: 'EMISSION',
    label: 'Emission',
    component: EmissionReactionForm,
  },
  {
    type: 'FIRST_ORDER_LOSS',
    label: 'First-Order Loss',
    component: FirstOrderLossReactionForm,
  },
  {
    type: 'PHOTOLYSIS',
    label: 'Photolysis (Light-dependent)',
    component: PhotolysisReactionForm,
  },
  {
    type: 'TERNARY_CHEMICAL_ACTIVATION',
    label: 'Ternary Chemical Activation',
    component: TernaryChemicalActivationReactionForm,
  },
  {
    type: 'TROE',
    label: 'Troe (Fall-Off)',
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
    label: 'Surface Reaction',
    component: SurfaceReactionForm,
  },
  {
    type: 'USER_DEFINED',
    label: 'User-Defined Rate',
    component: UserDefinedReactionForm,
  },
  {
    type: 'LAMBDA_RATE',
    label: 'Lambda Rate',
    component: LambdaRateReactionForm,
  },
]

export const getReactionDefinition = (reactionType) => {
  return (
    reactionRegistry.find((definition) => definition.type === reactionType) || reactionRegistry[0]
  )
}
