import { GenericReactionForm } from './GenericReaction'

export function BranchedReactionForm({ onAddReaction }) {
  return <GenericReactionForm onAddReaction={onAddReaction} reactionType="BRANCHED" />
}
