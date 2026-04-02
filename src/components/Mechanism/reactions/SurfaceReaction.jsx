import { GenericReactionForm } from './GenericReaction'

export function SurfaceReactionForm({ onAddReaction }) {
  return <GenericReactionForm onAddReaction={onAddReaction} reactionType="SURFACE_REACTION" />
}
