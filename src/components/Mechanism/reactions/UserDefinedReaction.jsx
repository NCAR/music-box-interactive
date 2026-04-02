import { ScaledReactionForm } from './ScaledReaction'

export function UserDefinedReactionForm({ onAddReaction }) {
  return (
    <ScaledReactionForm
      onAddReaction={onAddReaction}
      reactionType="USER_DEFINED"
      allowEmptyProducts
    />
  )
}
