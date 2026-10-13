import { ScaledReactionForm } from './ScaledReaction'

export function UserDefinedReactionForm({ onAddReaction, parameters }) {
  return (
    <ScaledReactionForm onAddReaction={onAddReaction} reactionType="USER_DEFINED" parameters={parameters} />
  )
}
