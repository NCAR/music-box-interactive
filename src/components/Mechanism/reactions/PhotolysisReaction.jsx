import { ScaledReactionForm } from './ScaledReaction'

export function PhotolysisReactionForm({ onAddReaction, parameters }) {
  return (
    <ScaledReactionForm onAddReaction={onAddReaction} reactionType="PHOTOLYSIS" parameters={parameters} />
  )
}
