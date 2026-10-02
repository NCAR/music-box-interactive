import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { buildGeneratedReactionName } from './reactions/reactionUtils'

const MAX_LISTED = 10

// Asks before a species is removed. A reaction that uses the species cannot work without it,
// so those reactions are removed too, and the dialog lists them first.
//   reactions - the reactions that use the species, with species names (see withSpeciesNames)
export function RemoveSpeciesDialog({ species, reactions, onCancel, onConfirm }) {
  const listed = reactions.slice(0, MAX_LISTED)
  const more = reactions.length - listed.length

  return (
    <Dialog
      title={`Remove ${species.name}?`}
      onClose={onCancel}
      className="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {reactions.length === 0
              ? 'Remove species'
              : `Remove species and ${reactions.length} ${reactions.length === 1 ? 'reaction' : 'reactions'}`}
          </Button>
        </>
      }
    >
      {reactions.length === 0 ? (
        <p className="text-sm text-ink">No reaction uses {species.name}.</p>
      ) : (
        <>
          <p className="text-sm text-ink">
            {reactions.length === 1
              ? `1 reaction uses ${species.name}. It will also be removed:`
              : `${reactions.length} reactions use ${species.name}. They will also be removed:`}
          </p>
          <ul className="mt-2 space-y-1 font-mono text-sm text-ink">
            {listed.map((reaction) => (
              <li key={reaction.id}>
                {reaction.name ? `${reaction.name}: ` : ''}
                {buildGeneratedReactionName(reaction)}
              </li>
            ))}
            {more > 0 && <li className="font-sans text-muted">and {more} more</li>}
          </ul>
        </>
      )}
      <p className="mt-3 text-xs text-muted">The conditions set for them are removed too.</p>
    </Dialog>
  )
}

export default RemoveSpeciesDialog
