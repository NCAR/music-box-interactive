import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSelector, useDispatch } from 'react-redux'
import { parseRateColumnKey } from '../../services/conditions/rateColumns'
import { useNotify } from '@/hooks/use-notify'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Dropdown } from '../ui/dropdown'
import { addReaction, removeReaction, updateReaction, selectNamedReactions } from '../../redux/slices/mechanismSlice'
import { buildGeneratedReactionName, parseReactionString } from './reactions/reactionUtils'
import {
  RATE_UNIT_NOTE,
  getReactionComponents,
  isOrderDependentUnit,
  getReactionParameters,
  getReactionTypeLabel,
  reactionRegistry,
} from './reactions/reactionRegistry'
import {
  REACTION_COMPONENT_KEYS,
  getReactionSpeciesNames,
} from '../../services/simulation/local/mechanism'
import {
  formatComponents,
  formatReactionEquation,
  reactionMatchesQuery,
} from '../../services/mechanism/reactionText'
import {
  ADD_BUTTON,
  ADD_INPUT,
  EDITOR_COLUMN,
  TABLE_CARD,
  LIST_CARD_CONTENT,
  TEXT_INPUT_SM,
} from './fieldStyles'
import { AddRowDialog } from './table/AddRowDialog'
import { RemoveRowButton } from './table/RemoveRowButton'
import { DataTable } from './table/DataTable'
import { EditableCell } from './table/EditableCell'
import { EMPTY_ARRAY } from '../../utils/emptyArray'

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

// The text of an editable species cell. parseReactionString reads it back.
const componentsToInput = (components) =>
  Array.isArray(components) && components.length > 0 ? formatComponents(components) : ''

// Species fields vary by reaction type. SURFACE stores its reactant as a bare gas-phase species
// string rather than an array, so it needs separate handling to remain editable.
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

const LAMBDA_FUNCTION_KEY = 'lambda function'

const NON_PARAMETER_KEYS = new Set([
  'id',
  'type',
  'name',
  'gas phase',
  'gas-phase species',
  ...REACTION_COMPONENT_KEYS,
])

// Show every rate parameter the type supports, including unset ones so solver defaults can be filled
// in later. Append unlisted parameters to ensure values loaded from mechanism files remain visible.
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

export function ReactionEditor() {
  const dispatch = useDispatch()
  const notify = useNotify()
  const reactions = useSelector(selectNamedReactions)
  const species = useSelector((state) => state.mechanism.config.mechanism?.species || EMPTY_ARRAY)
  const conditionColumns = useSelector((state) => state.conditions?.table?.columns)

  const [reactionSearch, setReactionSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  // The Add card: the type of the new reaction, and the typed text by field key ('name', a
  // species field or `param:<key>`).
  const [addType, setAddType] = useState(reactionRegistry[0].type)
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState({})

  // Group reactions by canonical type so registry and solver spellings map to the same option.
  // Preserve mechanism order within a type.
  const typeCounts = reactions.reduce((counts, reaction) => {
    const type = reaction.type || 'UNKNOWN'
    counts[type] = (counts[type] || 0) + 1
    return counts
  }, {})
  const availableTypes = Object.keys(typeCounts).sort()

  // If the selection is stale after a mechanism change, show all items instead of
  // silently showing an empty list.
  const activeType = availableTypes.includes(typeFilter) ? typeFilter : ''

  // Filters combine: select a type to narrow the list, then search by name or species within it
  // (see reactionMatchesQuery).
  const filteredReactions = reactions.filter(
    (reaction) =>
      (!activeType || reaction.type === activeType) && reactionMatchesQuery(reaction, reactionSearch)
  )

  // Returns whether the reaction was added.
  const handleAddReaction = (newReaction) => {
    // Rejects a reaction that references an undefined species, which would fail the solver build.
    // Species names are case-sensitive.
    const defined = new Set(species.map((sp) => sp.name).filter(Boolean))
    const unknown = [...new Set(getReactionSpeciesNames(newReaction))].filter(
      (name) => !defined.has(name)
    )

    if (unknown.length > 0) {
      notify.error(unknown.length === 1 ? 'Unknown Species' : 'Unknown Species', `${unknown.join(', ')} ${
          unknown.length === 1 ? 'is not' : 'are not'
        } defined in this mechanism. Add ${
          unknown.length === 1 ? 'it' : 'them'
        } in the Species tab first.`)
      return false
    }

    dispatch(addReaction(newReaction))
    notify.success('Reaction Added', `Successfully added reaction: ${newReaction.name || formatReactionEquation(newReaction)}.`)
    return true
  }

  // Builds a reaction of the Add card's type from its fields, with the same checks as an edit.
  const handleAddFromRow = () => {
    const newReaction = { id: uuidv4(), type: addType, 'gas phase': 'gas' }
    const name = (draft.name ?? '').trim()
    if (name) newReaction.name = name

    for (const field of getReactionComponents(addType)) {
      const label = COMPONENT_LABELS[field.key] ?? field.key
      const parsed = parseReactionString(draft[field.key] ?? '')
      if (parsed.length === 0) {
        if (field.required) {
          notify.invalidInput(`${label} cannot be empty.`)
          return
        }
        newReaction[field.key] = []
        continue
      }
      if (field.single) {
        if (parsed.length > 1) {
          notify.invalidInput(`${label} must be a single species.`)
          return
        }
        newReaction[field.key] = parsed[0].name
        continue
      }
      newReaction[field.key] = parsed
    }

    for (const field of getReactionParameters(addType)) {
      const raw = (draft[`param:${field.key}`] ?? '').trim()
      if (!raw) continue
      if (field.key === LAMBDA_FUNCTION_KEY) {
        newReaction[field.key] = raw
        continue
      }
      const value = Number.parseFloat(raw)
      if (Number.isNaN(value)) {
        notify.invalidInput(`${field.key} must be a valid number.`)
        return
      }
      newReaction[field.key] = value
    }

    if (handleAddReaction(newReaction)) setDraft({})
  }

  // Edits go through the same validation as adding, so an edit cannot introduce a species
  // reference that a newly added reaction would have been rejected for.
  const saveReaction = (candidate) => {
    const defined = new Set(species.map((sp) => sp.name).filter(Boolean))
    const unknown = [...new Set(getReactionSpeciesNames(candidate))].filter(
      (name) => !defined.has(name)
    )

    if (unknown.length > 0) {
      notify.error('Unknown Species', `${unknown.join(', ')} ${
          unknown.length === 1 ? 'is not' : 'are not'
        } defined in this mechanism.`)
      return false
    }

    dispatch(updateReaction(candidate))
    return true
  }

  const handleComponentsSave = (reaction, field, rawValue) => {
    const parsed = parseReactionString(rawValue)

    if (parsed.length === 0) {
      notify.invalidInput(`${field.label} cannot be empty.`)
      return
    }

    // `gas-phase species` holds one species as a plain string, not a component array.
    if (field.single) {
      if (parsed.length > 1) {
        notify.invalidInput(`${field.label} must be a single species.`)
        return
      }
      saveReaction({ ...reaction, [field.key]: parsed[0].name })
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

    // The lambda function is code, not a number.
    if (key === LAMBDA_FUNCTION_KEY) {
      updated[key] = trimmedValue
      saveReaction(updated)
      return
    }

    const parsedValue = Number.parseFloat(trimmedValue)

    if (Number.isNaN(parsedValue)) {
      notify.invalidInput(`${key} must be a valid number.`)
      return
    }

    updated[key] = parsedValue
    saveReaction(updated)
  }

  // An empty name removes it: a reaction without a configured name shows its equation.
  const handleNameSave = (reaction, rawValue) => {
    const name = rawValue.trim()
    const updated = { ...reaction }
    if (name) updated.name = name
    else delete updated.name
    saveReaction(updated)
  }

  const handleRemoveReaction = (reactionId) => {
    const reaction = reactions.find((r) => r.id === reactionId)
    // The conditions slice removes the reaction's rate-parameter columns with it.
    const hadConditions = Object.keys(conditionColumns || {}).some(
      (key) => parseRateColumnKey(key)?.reactionId === reactionId
    )
    dispatch(removeReaction(reactionId))
    notify.removed(
      'Reaction Removed',
      `Removed reaction: ${reaction?.name || (reaction && buildGeneratedReactionName(reaction)) || 'Unknown'}.` +
        (hadConditions ? ' Its rate parameter conditions were removed too.' : '')
    )
  }

  // The species and parameter columns depend on the reaction type, so they show only when the
  // type filter selects one type. Their union over the reactions of that type is used, so
  // values loaded from a mechanism file stay visible.
  const reactionsOfType = activeType ? reactions.filter((r) => r.type === activeType) : []
  const componentColumns = []
  const parameterColumns = []
  reactionsOfType.forEach((reaction) => {
    componentFields(reaction).forEach((field) => {
      if (!componentColumns.some((c) => c.key === field.key)) componentColumns.push(field)
    })
    rateParameters(reaction).forEach((field) => {
      if (!parameterColumns.some((c) => c.key === field.key)) parameterColumns.push(field)
    })
  })

  const reactionLabel = (reaction) => reaction.name || formatReactionEquation(reaction)

  const columns = [
    {
      id: 'name',
      label: 'Name',
      sortValue: (reaction) => reaction.name ?? '',
      render: (reaction) => (
        <EditableCell
          value={reaction.name ?? ''}
          placeholder="no name"
          label={`Name of ${reactionLabel(reaction)}`}
          onCommit={(raw) => handleNameSave(reaction, raw)}
        />
      ),
    },
    {
      id: 'equation',
      label: 'Equation',
      sortValue: formatReactionEquation,
      render: (reaction) => <span className="font-mono">{formatReactionEquation(reaction)}</span>,
    },
    {
      id: 'type',
      label: 'Type',
      sortValue: (reaction) => getReactionTypeLabel(reaction.type),
      render: (reaction) => getReactionTypeLabel(reaction.type),
    },
    ...componentColumns.map((field) => ({
      id: `component:${field.key}`,
      label: field.label,
      render: (reaction) => {
        const own = componentFields(reaction).find((f) => f.key === field.key)
        if (!own) return null
        return (
          <EditableCell
            value={own.value}
            placeholder="O1D + N2"
            label={`${field.label} of ${reactionLabel(reaction)}`}
            onCommit={(raw) => handleComponentsSave(reaction, own, raw)}
          />
        )
      },
    })),
    ...parameterColumns.map((field) => ({
      id: `param:${field.key}`,
      label: field.key,
      unit: field.unit,
      unitTitle: isOrderDependentUnit(field.unit) ? RATE_UNIT_NOTE : undefined,
      className: 'font-mono',
      sortValue: (reaction) => reaction[field.key],
      render: (reaction) => {
        // The placeholder is the value the solver applies when this is left unset.
        const placeholder = getReactionParameters(reaction.type).find((p) => p.key === field.key)
          ?.placeholder
        return (
          <EditableCell
            value={formatParameterValue(reaction[field.key])}
            placeholder={placeholder ?? ''}
            label={`${field.key} of ${reactionLabel(reaction)}`}
            onCommit={(raw) => handleParameterSave(reaction, field.key, raw)}
          />
        )
      },
    })),
    {
      id: 'actions',
      label: '',
      hideable: false,
      className: 'w-0',
      render: (reaction) => (
        <RemoveRowButton
          label={`Remove ${reactionLabel(reaction)}`}
          onClick={() => handleRemoveReaction(reaction.id)}
        />
      ),
    },
  ]

  // The Add card: one field under each column of the chosen type.
  const draftInput = (key, placeholder, label) => (
    <input
      type="text"
      value={draft[key] ?? ''}
      onChange={(e) => setDraft((previous) => ({ ...previous, [key]: e.target.value }))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          handleAddFromRow()
        }
      }}
      placeholder={placeholder}
      aria-label={label}
      className={ADD_INPUT}
    />
  )

  const addComponents = getReactionComponents(addType).map((field) => ({
    ...field,
    label: COMPONENT_LABELS[field.key] ?? field.key,
  }))
  const addParameters = getReactionParameters(addType)
  const addColumns = [
    { id: 'name', label: 'Name' },
    ...addComponents.map((field) => ({ id: `component:${field.key}`, label: field.label })),
    ...addParameters.map((field) => ({
      id: `param:${field.key}`,
      label: field.key,
      unit: field.unit,
      unitTitle: isOrderDependentUnit(field.unit) ? RATE_UNIT_NOTE : undefined,
      className: 'font-mono',
    })),
  ]

  const renderAddCell = (column) => {
    if (column.id === 'name') return draftInput('name', 'name (optional)', 'New reaction name')
    if (column.id.startsWith('component:')) {
      const field = addComponents.find((c) => `component:${c.key}` === column.id)
      return draftInput(field.key, field.single ? 'NO2' : 'O1D + N2', `New reaction ${field.label}`)
    }
    if (column.id.startsWith('param:')) {
      const field = addParameters.find((p) => `param:${p.key}` === column.id)
      return draftInput(`param:${field.key}`, field.placeholder ?? '', `New reaction ${field.key}`)
    }
    return null
  }

  // The type of the new reaction sets the fields of the Add dialog.
  const addTypePicker = (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-ink">Type</span>
      <div className="w-64">
        <Dropdown
          value={addType}
          onChange={(type) => {
            setAddType(type)
            setDraft({})
          }}
          className="h-9"
          options={reactionRegistry.map((entry) => ({
            value: entry.type,
            label: entry.label,
            disabled: entry.type === 'LAMBDA_RATE_CONSTANT',
            title: entry.type === 'LAMBDA_RATE_CONSTANT' ? 'Lambda rate is unavailable' : undefined,
          }))}
        />
      </div>
    </div>
  )

  return (
    <div className={EDITOR_COLUMN}>
      <Card className={TABLE_CARD}>
        <CardContent className={`${LIST_CARD_CONTENT} p-4`}>
          <DataTable
            tableId="reactions"
            columns={columns}
            rows={filteredReactions}
            rowKey={(reaction) => reaction.id}
            emptyMessage={reactions.length === 0 ? 'No reactions defined yet.' : 'No matching reactions found.'}
            toolbar={
              // One line: the count, the search (80% of the rest) and the type filter.
              <div className="flex items-center gap-3">
                <h2 className="whitespace-nowrap text-base font-semibold text-heading">
                  {`${reactions.length} reactions`}
                </h2>
                <input
                  type="text"
                  value={reactionSearch}
                  onChange={(e) => setReactionSearch(e.target.value)}
                  placeholder="Search reactions by name or species (e.g. NO + O3, a -> b)"
                  className={`w-4/5 ${TEXT_INPUT_SM.replace('text-center', 'text-left')}`}
                />
                <div className="w-1/5 min-w-0">
                  <Dropdown
                    value={activeType}
                    onChange={setTypeFilter}
                    className="h-9"
                    options={[
                      { value: '', label: `All reaction types (${reactions.length})` },
                      ...availableTypes.map((type) => ({
                        value: type,
                        label: `${getReactionTypeLabel(type)} (${typeCounts[type]})`,
                      })),
                    ]}
                  />
                </div>
              </div>
            }
            actions={
              <Button size="sm" className={ADD_BUTTON} onClick={() => setAddOpen(true)}>
                Add reaction
              </Button>
            }
            footerNote={
              !activeType && 'Choose one reaction type to see and edit its species and parameters.'
            }
          />
        </CardContent>
      </Card>
      {addOpen && (
        <AddRowDialog
          title="Add reaction"
          columns={addColumns}
          render={renderAddCell}
          onAdd={handleAddFromRow}
          onClose={() => setAddOpen(false)}
          extra={addTypePicker}
        />
      )}
    </div>
  )
}

export default ReactionEditor
