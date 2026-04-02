import { GenericReactionForm } from './GenericReaction'

export function TernaryChemicalActivationReactionForm({ onAddReaction }) {
  return (
    <GenericReactionForm
      onAddReaction={onAddReaction}
      reactionType="TERNARY_CHEMICAL_ACTIVATION"
    />
  )
}
