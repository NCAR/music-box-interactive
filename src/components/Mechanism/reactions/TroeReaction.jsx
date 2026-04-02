import { GenericReactionForm } from './GenericReaction'

export function TroeReactionForm({ onAddReaction }) {
  return <GenericReactionForm onAddReaction={onAddReaction} reactionType="TROE" />
}
