import { GenericReactionForm } from './GenericReaction'

export function TunnelingReactionForm({ onAddReaction }) {
  return <GenericReactionForm onAddReaction={onAddReaction} reactionType="TUNNELING" />
}
