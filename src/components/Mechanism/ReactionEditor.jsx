import { Fragment, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Dropdown } from '../ui/dropdown'
import { addReaction, removeReaction, updateReaction } from '../../redux/slices/mechanismSlice'
import { hasDeclaredName, parseReactionString } from './reactions/reactionUtils'
import {
  canonicalReactionType,
  getReactionDefinition,
  getReactionParameters,
  getReactionTypeLabel,
  reactionRegistry,
} from './reactions/reactionRegistry'
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
const GAS_PHASE_SPECIES_KEY = 'gas-phase species'

const COMPONENT_LABELS = {
  reactants: 'Reactants',
  // Display label only; the key stays as the solver spells it.
  [GAS_PHASE_SPECIES_KEY]: 'Gas-phase reactant',
  products: 'Products',
  'gas-phase products': 'Gas-phase products',
  'alkoxy products': 'Alkoxy products',
  'nitrate products': 'Nitrate products',
}

// The editable text for a component array, in the same "2NO2 + OH" form the add form accepts, so
// it round-trips back through parseReactionString.
const componentsToInput = (components) =>
  Array.isArray(components) && components.length > 0 ? formatReactionComponents(components) : ''

// The species fields this reaction actually carries; the set differs by type. SURFACE names its
// reactant in `gas-phase species` as a bare string rather than an array, so it needs handling of
// its own -- without it a surface reaction's reactant has no field and cannot be edited.
const componentFields = (reaction) => {
  const fields = []

  if (typeof reaction[GAS_PHASE_SPECIES_KEY] === 'string') {
    fields.push({
      key: GAS_PHASE_SPECIES_KEY,
      label: COMPONENT_LABELS[GAS_PHASE_SPECIES_KEY],
      value: reaction[GAS_PHASE_SPECIES_KEY],
      single: true,
    })
  }

  for (const key of REACTION_COMPONENT_KEYS) {
    if (Array.isArray(reaction[key])) {
      fields.push({
        key,
        label: COMPONENT_LABELS[key] ?? key,
        value: componentsToInput(reaction[key]),
      })
    }
  }

  return fields
}

const NON_PARAMETER_KEYS = new Set([
  'id',
  'type',
  'name',
  'gas phase',
  'gas-phase species',
  ...REACTION_COMPONENT_KEYS,
])

// Every rate parameter the type can carry, whether or not this reaction sets one: an omitted
// parameter is left to the solver's default, and showing it blank is what lets it be filled in
// afterwards. Anything the reaction carries that the registry does not list is appended, so a
// value loaded from a mechanism file is never hidden.
const rateParameters = (reaction) => {
  const declared = getReactionParameters(reaction.type)
  const declaredKeys = declared.map((field) => field.key)

  const carried = Object.entries(reaction).filter(
    ([key, value]) =>
      !NON_PARAMETER_KEYS.has(key) &&
      !key.startsWith('__') &&
      value !== undefined &&
      value !== null &&
      value !== ''
  )

  return [
    ...declared.map((field) => ({ ...field, value: reaction[field.key] })),
    ...carried
      .filter(([key]) => !declaredKeys.includes(key))
      .map(([key, value]) => ({ key, value })),
  ]
}

// Use exponential notation only where it helps: rate constants span many orders of magnitude,
// while values like B = 0 or D = 300 are clearer in plain notation.
const formatParameterValue = (value) => {
  if (value === undefined || value === null) {
    return ''
  }
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
function ReactionChip({ reaction, onRemove, onComponentsSave, onParameterSave }) {
  const [expanded, setExpanded] = useState(false)
  const formula = formatReactionDisplay(reaction)
  const parameters = rateParameters(reaction)
  // Size the name column to the longest name this reaction actually has, so "A" does not reserve
  // room for "reaction probability" and "reaction probability" does not wrap. The names render in
  // a monospace font, where 1ch is exactly one character.
  const nameColumnWidth = parameters.length
    ? `${Math.max(...parameters.map((field) => field.key.length))}ch`
    : undefined

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

        {componentFields(reaction).map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wide text-gray-700">
              {field.label}
            </label>
            <input
              type="text"
              // Uncontrolled: the value is re-derived from the store on save, and a controlled
              // input would fight the user while a partial formula is being typed.
              key={field.value}
              defaultValue={field.value}
              onBlur={(e) => onComponentsSave(reaction, field, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              placeholder="e.g., O1D + N2"
              className={`w-full ${TEXT_INPUT_SM} font-mono`}
            />
          </div>
        ))}

        {parameters.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-wide text-gray-700">Parameters</label>
            {parameters.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <span
                  className="flex-shrink-0 whitespace-nowrap text-sm font-mono text-gray-500"
                  style={{ width: nameColumnWidth }}
                >
                  {field.key}
                </span>
                <input
                  type="text"
                  key={`${field.key}-${field.value}`}
                  defaultValue={formatParameterValue(field.value)}
                  // The placeholder is the value the solver applies when this is left unset.
                  placeholder={field.placeholder}
                  onBlur={(e) => onParameterSave(reaction, field.key, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  className={`w-full ${TEXT_INPUT_SM} font-mono`}
                />
              </div>
            ))}
          </div>
        )}

        {hasDeclaredName(reaction) && (
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
  const [typeFilter, setTypeFilter] = useState('')

  const activeReactionDefinition = getReactionDefinition(reactionType)
  const ActiveReactionForm = activeReactionDefinition.component

  // Reactions have no single name to search, so the query matches anywhere in the formula.
  // Typing species name finds every reaction it appears in. Order is preserved because reactions are
  // indexed elsewhere and mechanism order reflects authoring intent.
  // Grouped by canonical type: a surface reaction added here and one loaded from a mechanism
  // file are spelled differently but are the same kind, and belong under one option.
  const typeCounts = reactions.reduce((counts, reaction) => {
    const type = canonicalReactionType(reaction.type || 'UNKNOWN')
    counts[type] = (counts[type] || 0) + 1
    return counts
  }, {})
  const availableTypes = Object.keys(typeCounts).sort()

  // If the selection is stale after a mechanism change, show all items instead of
  // silently showing an empty list.
  const activeType = availableTypes.includes(typeFilter) ? typeFilter : ''

  // Filters combine: select a type to narrow the list, then search by species within it.
  const reactionQuery = reactionSearch.trim().toLowerCase()
  const filteredReactions = reactions.filter((reaction) => {
    if (activeType && canonicalReactionType(reaction.type) !== activeType) {
      return false
    }
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

  // Edits go through the same resolution and validation as adding, so an edit cannot introduce a
  // species reference that a newly added reaction would have been rejected for.
  const saveReaction = (candidate) => {
    const definedNames = species.map((sp) => sp.name).filter(Boolean)
    const resolved = resolveReactionSpeciesNames(candidate, definedNames)

    const defined = new Set(definedNames)
    const unknown = [...new Set(getReactionSpeciesNames(resolved))].filter(
      (name) => !defined.has(name)
    )

    if (unknown.length > 0) {
      toast({
        title: 'Unknown species',
        description: `${unknown.join(', ')} ${
          unknown.length === 1 ? 'is not' : 'are not'
        } defined in this mechanism.`,
        variant: 'destructive',
      })
      return false
    }

    dispatch(updateReaction(resolved))
    return true
  }

  const handleComponentsSave = (reaction, field, rawValue) => {
    const parsed = parseReactionString(rawValue)

    if (parsed.length === 0) {
      toast({
        title: 'Error',
        description: `${field.label} cannot be empty.`,
        variant: 'destructive',
      })
      return
    }

    // `gas-phase species` holds one species as a plain string, not a component array.
    if (field.single) {
      if (parsed.length > 1) {
        toast({
          title: 'Error',
          description: `${field.label} must be a single species.`,
          variant: 'destructive',
        })
        return
      }
      saveReaction({ ...reaction, [field.key]: parsed[0]['species name'] })
      return
    }

    saveReaction({ ...reaction, [field.key]: parsed })
  }

  const handleParameterSave = (reaction, key, rawValue) => {
    const trimmedValue = rawValue.trim()
    const updated = { ...reaction }

    // Clearing a parameter removes it, which is how "not set" is expressed.
    if (!trimmedValue) {
      delete updated[key]
      saveReaction(updated)
      return
    }

    const parsedValue = Number.parseFloat(trimmedValue)

    if (Number.isNaN(parsedValue)) {
      toast({
        title: 'Error',
        description: `${key} must be a valid number.`,
        variant: 'destructive',
      })
      return
    }

    updated[key] = parsedValue
    saveReaction(updated)
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
          <ReactionChip
            key={reaction.id}
            reaction={reaction}
            onRemove={handleRemoveReaction}
            onComponentsSave={handleComponentsSave}
            onParameterSave={handleParameterSave}
          />
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
                <Dropdown
                  value={reactionType}
                  onChange={setReactionType}
                  className="px-4 py-3 rounded-xl text-base"
                  options={reactionRegistry.map((type) => ({
                    value: type.type,
                    label: type.label,
                  }))}
                />
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
            <Dropdown
              value={activeType}
              onChange={setTypeFilter}
              className="mb-3 h-10"
              options={[
                { value: '', label: `All reaction types (${reactions.length})` },
                ...availableTypes.map((type) => ({
                  value: type,
                  label: `${getReactionTypeLabel(type)} (${typeCounts[type]})`,
                })),
              ]}
            />

            <input
              type="text"
              value={reactionSearch}
              onChange={(e) => setReactionSearch(e.target.value)}
              placeholder="Search reactions by species"
              className={`w-full mb-5 h-10 ${TEXT_INPUT_SM}`}
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
    </div>
  )
}

export default ReactionEditor
