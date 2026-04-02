import { GenericReactionForm } from './GenericReaction'

export function FirstOrderLossReactionForm({ onAddReaction }) {
  return <GenericReactionForm onAddReaction={onAddReaction} reactionType="FIRST_ORDER_LOSS" />
}
