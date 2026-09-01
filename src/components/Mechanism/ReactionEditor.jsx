import { Fragment, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { addReaction, removeReaction } from '../../redux/slices/mechanismSlice'
import { getReactionDefinition, reactionRegistry } from './reactions/reactionRegistry'
import {
  REACTION_COMPONENT_KEYS,
  getReactionSpeciesNames,
  resolveReactionSpeciesNames,
} from '../../services/simulation/local/mechanism'
import {
  EDITOR_GRID,
  ITEM_CHIP,
  ITEM_LIST,
  ITEM_PANEL,
  LIST_CARD,
  LIST_CARD_CONTENT,
  TEXT_INPUT,
  TEXT_INPUT_SM,
} from './fieldStyles'

const formatReactionComponents = (components) => {
  if (!Array.isArray(components) || components.length === 0) {
    return '∅'
  }

  return components
    .map((component) => {
      if (typeof component === 'string') {
        return component
      }

      const name = component['species name'] || component.name || ''
      const coefficient = Number(component.coefficient)
      const coeffPrefix = Number.isFinite(coefficient) && coefficient > 1 ? coefficient : ''

      return `${coeffPrefix}${name}`
    })
    .join(' + ')
}

const formatReactionDisplay = (reaction) => {
  const reactants = reaction.reactants || reaction['gas-phase species'] || []
  const products =
    reaction.products || reaction['gas-phase products'] || reaction['alkoxy products'] || []

  const reactantStr = formatReactionComponents(Array.isArray(reactants) ? reactants : [reactants])
  const productStr = formatReactionComponents(Array.isArray(products) ? products : [products])

  return `${reactantStr} → ${productStr}`
}

// Structural fields. All other fields are rate parameters that vary by reaction type.
// Deriving them from the object reflects what the reaction actually defines and requires
// no changes when new reaction types are added.
const NON_PARAMETER_KEYS = new Set([
  'id',
  'type',
  'name',
  'gas phase',
  'gas-phase species',
  ...REACTION_COMPONENT_KEYS,
])

const rateParameters = (reaction) =>
  Object.entries(reaction).filter(
    ([key, value]) =>
      !NON_PARAMETER_KEYS.has(key) &&
      !key.startsWith('__') &&
      value !== undefined &&
      value !== null &&
      value !== ''
  )

// Use exponential notation only where it helps: rate constants span many orders of magnitude,
// while values like B = 0 or D = 300 are clearer in plain notation.
const formatParameterValue = (value) => {
  if (typeof value !== 'number') {
    return String(value)
  }
  if (value === 0) {
    return '0'
  }
  const magnitude = Math.abs(value)
  return magnitude < 1e-3 || magnitude >= 1e6 ? value.toExponential(2) : String(value)
}

// A reaction renders as a collapsed chip. Clicking it unfolds its type, rate parameter, and name.
function ReactionChip({ reaction, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const formula = formatReactionDisplay(reaction)
  const parameters = rateParameters(reaction)

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className={`${ITEM_CHIP} font-mono`}>
        {formula}
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
      </button>
    )
  }

  return (
    <div className={ITEM_PANEL}>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1.5 rounded text-base font-semibold font-mono text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          {formula}
          <ChevronUp className="w-4 h-4 flex-shrink-0" />
        </button>

        <Button
          variant="glass"
          size="sm"
          onClick={() => onRemove(reaction.id)}
          className="rounded-lg bg-white text-red-600 hover:bg-red-50"
        >
          Remove
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] uppercase tracking-wide text-gray-700">Type</label>
          <p className="text-sm text-gray-700">{reaction.type}</p>
        </div>

        {parameters.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wide text-gray-700">Parameters</label>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm font-mono text-gray-700">
              {parameters.map(([key, value]) => (
                <Fragment key={key}>
                  <dt className="text-gray-500">{key}</dt>
                  <dd className="break-all">{formatParameterValue(value)}</dd>
                </Fragment>
              ))}
            </dl>
          </div>
        )}

        {reaction.name && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wide text-gray-700">Name</label>
            <p className="text-sm text-gray-700">{reaction.name}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function ReactionEditor() {
  const dispatch = useDispatch()
  const { toast } = useToast()
  const reactions = useSelector((state) => state.mechanism.reactions)
  const species = useSelector((state) => state.mechanism.species)

  const [reactionType, setReactionType] = useState(reactionRegistry[0].type)
  const [reactionSearch, setReactionSearch] = useState('')

  const activeReactionDefinition = getReactionDefinition(reactionType)
  const ActiveReactionForm = activeReactionDefinition.component

  // Reactions have no single name to search, so the query matches anywhere in the formula.
  // Typing species name finds every reaction it appears in. Order is preserved because reactions are
  // indexed elsewhere and mechanism order reflects authoring intent.
  const reactionQuery = reactionSearch.trim().toLowerCase()
  const filteredReactions = reactions.filter((reaction) => {
    if (!reactionQuery) {
      return true
    }
    const haystack = `${formatReactionDisplay(reaction)} ${reaction.name ?? ''}`.toLowerCase()
    return haystack.includes(reactionQuery)
  })

  const handleAddReaction = (newReaction) => {
    // Predicts solver build failures when reactions reference undefined species by validating exact
    // mechanism names, matching validateMechanismPayload. Since reaction input is upper-cased, first
    // map names back to the mechanism's spelling so lower-case species can be referenced.
    const definedNames = species.map((sp) => sp.name).filter(Boolean)
    const resolved = resolveReactionSpeciesNames(newReaction, definedNames)

    const defined = new Set(definedNames)
    const unknown = [...new Set(getReactionSpeciesNames(resolved))].filter(
      (name) => !defined.has(name)
    )

    if (unknown.length > 0) {
      toast({
        title: unknown.length === 1 ? 'Unknown species' : 'Unknown species',
        description: `${unknown.join(', ')} ${
          unknown.length === 1 ? 'is not' : 'are not'
        } defined in this mechanism. Add ${
          unknown.length === 1 ? 'it' : 'them'
        } in the Species tab first.`,
        variant: 'destructive',
      })
      return
    }

    dispatch(addReaction(resolved))
    toast({
      title: 'Reaction Added',
      description: `Successfully added reaction: ${newReaction.name || formatReactionDisplay(newReaction)}`,
      variant: 'success',
    })
  }

  const handleRemoveReaction = (reactionId) => {
    const reaction = reactions.find((r) => r.id === reactionId)
    dispatch(removeReaction(reactionId))
    toast({
      title: 'Reaction Removed',
      description: `Removed reaction: ${reaction?.name || 'Unknown'}`,
      variant: 'delete',
    })
  }

  const reactionChips = (
    <div className={ITEM_LIST}>
      {filteredReactions.length === 0 ? (
        <p className="w-full text-center text-gray-500 py-8">No matching reactions found.</p>
      ) : (
        filteredReactions.map((reaction) => (
          <ReactionChip key={reaction.id} reaction={reaction} onRemove={handleRemoveReaction} />
        ))
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className={EDITOR_GRID}>
        <Card>
          <CardHeader>
            <CardTitle>Add reaction</CardTitle>
            <CardDescription>Define a reaction for the mechanism</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-7">
              <div>
                <label className="block text-base font-semibold text-gray-800 mb-2">
                  Choose a reaction
                </label>
                <select
                  value={reactionType}
                  onChange={(e) => setReactionType(e.target.value)}
                  className={TEXT_INPUT}
                >
                  {reactionRegistry.map((type) => (
                    <option key={type.type} value={type.type}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <ActiveReactionForm
                onAddReaction={handleAddReaction}
                {...(activeReactionDefinition.componentProps || {})}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={LIST_CARD}>
          <CardHeader>
            <CardTitle>{`${reactions.length} reactions`}</CardTitle>
          </CardHeader>

          <CardContent className={LIST_CARD_CONTENT}>
            <input
              type="text"
              value={reactionSearch}
              onChange={(e) => setReactionSearch(e.target.value)}
              placeholder="Search reactions by species"
              className={`w-full mb-5 ${TEXT_INPUT_SM}`}
            />

            {reactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No reactions defined. Add your first reaction above.
              </p>
            ) : (
              reactionChips
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-3 text-xs text-gray-700">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Reaction Editor Notes:
        </p>
        <ul className="space-y-0.5 ml-4">
          <li>• Use "+" to separate multiple reactants or products</li>
          <li>• Use numbers for stoichiometric coefficients (e.g., "2NO2")</li>
          <li>• Arrhenius reactions require rate constant A</li>
          <li>• Photolysis reactions will use user-defined rate parameters</li>
        </ul>
      </div>
    </div>
  )
}

export default ReactionEditor
