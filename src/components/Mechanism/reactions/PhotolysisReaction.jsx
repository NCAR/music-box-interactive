import { ScaledReactionForm } from './ScaledReaction'

export function PhotolysisReactionForm({ onAddReaction }) {
  return <ScaledReactionForm onAddReaction={onAddReaction} reactionType="PHOTOLYSIS" />
}
