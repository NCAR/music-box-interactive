import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { addSpecies, updateSpecies, removeSpecies } from '../../redux/slices/mechanismSlice'
import { addSpeciesIfValid } from './speciesUtils'
import { SPECIES_PROPERTIES } from '../../services/simulation/local/speciesProperties'

// Fixed phase segments; anything else is entered as a custom "Others" phase
const FIXED_PHASE_OPTIONS = ['Gas', 'Aqueous']
const DISABLED_PHASE_OPTIONS = ['Aqueous']

const CUSTOM_PILL_MAX_LENGTH = 512

// Shared text-input styling in two sizes: a roomy variant for the add-species form,
// and a compact variant for the search box and per-species value fields.
const TEXT_INPUT =
  'w-full px-4 py-3 border-2 border-gray-400 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-xl text-base font-mono focus:outline-none focus:border-green-700'
const TEXT_INPUT_SM =
  'px-3 py-2 border-2 border-gray-400 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-lg text-sm font-mono focus:outline-none focus:border-green-700'


// Shared pill styling for the phase and property selectors.
function pillClassName(active, compact, disabled = false) {
  const base = `${
    compact ? 'px-2.5 py-1 text-[11px]' : 'px-4 py-2 text-[15px]'
  } font-semibold rounded-full border whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 flex items-center gap-1.5`

  if (active) {
    return `${base} bg-green-50 border-green-300 text-green-800`
  }
  if (disabled) {
    return `${base} bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed`
  }
  return `${base} bg-white border-gray-300 text-gray-700 hover:bg-gray-50`
}

function AddPillDialog({ label, onCancel, onAdd }) {
  const [draft, setDraft] = useState('')
  const trimmed = draft.trim()

  const handleAdd = useCallback(() => {
    if (trimmed) {
      onAdd(trimmed)
    }
  }, [trimmed, onAdd])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="block text-sm font-medium text-green-700 mb-1">{label}</label>
        <input
          type="text"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          maxLength={CUSTOM_PILL_MAX_LENGTH}
          className="w-full border-0 border-b-2 border-green-600 bg-transparent px-0 py-1.5 text-base text-gray-900 focus:outline-none"
        />
        <div className="mt-1 text-right text-xs text-gray-500">
          {draft.length}/{CUSTOM_PILL_MAX_LENGTH}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!trimmed}
            className={`rounded px-4 py-2 text-sm font-medium ${
              trimmed ? 'text-green-700 hover:bg-green-50' : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            Add
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function PhaseSelector({ value, onChange, size = 'default', allowCustom = true }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  // Keeps custom phase pills visible when switching between phases.
  const [savedCustoms, setSavedCustoms] = useState(() =>
    value && !FIXED_PHASE_OPTIONS.includes(value) ? [value] : []
  )

  useEffect(() => {
    if (value && !FIXED_PHASE_OPTIONS.includes(value)) {
      setSavedCustoms((prev) => (prev.includes(value) ? prev : [...prev, value]))
    }
  }, [value])

  const handleAddCustom = (phase) => {
    onChange(phase)
    setDialogOpen(false)
  }

  const compact = size === 'compact'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {FIXED_PHASE_OPTIONS.map((phase) => {
        const selected = value === phase
        const disabled = DISABLED_PHASE_OPTIONS.includes(phase)
        return (
          <button
            key={phase}
            type="button"
            disabled={disabled}
            title={disabled && !selected ? `${phase} phase is not available yet` : undefined}
            onClick={() => onChange(phase)}
            className={pillClassName(selected, compact, disabled)}
          >
            {phase}
          </button>
        )
      })}

      {savedCustoms.map((custom) => (
        <button
          key={custom}
          type="button"
          onClick={() => onChange(custom)}
          className={pillClassName(value === custom, compact)}
        >
          {custom}
        </button>
      ))}

      {allowCustom && (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className={pillClassName(false, compact)}
        >
          Others
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
        </button>
      )}

      {allowCustom && dialogOpen && (
        <AddPillDialog
          label="Add phase"
          onCancel={() => setDialogOpen(false)}
          onAdd={handleAddCustom}
        />
      )}
    </div>
  )
}

// On/off switch for boolean species properties.
function Toggle({ checked, label, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded text-sm font-semibold text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      {label}
      <span
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-green-700' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

function PropertySelector({ properties, onChange }) {
  const togglePill = (field) => {
    const next = { ...properties }
    if (field.pill in next) {
      delete next[field.pill]
    } else {
      next[field.pill] = field.type === 'boolean' ? false : ''
    }
    onChange(next)
  }

  const setPropertyValue = (pill, value) => {
    onChange({ ...properties, [pill]: value })
  }

  const selectedFields = SPECIES_PROPERTIES.filter((field) => field.pill in properties)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {SPECIES_PROPERTIES.map((field) => (
          <button
            key={field.pill}
            type="button"
            onClick={() => togglePill(field)}
            className={pillClassName(field.pill in properties, false)}
          >
            {field.pill}
          </button>
        ))}
      </div>

      {selectedFields.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {selectedFields.map((field) =>
            field.type === 'boolean' ? (
              <Toggle
                key={field.pill}
                label={field.label}
                checked={properties[field.pill] === true}
                onChange={(checked) => setPropertyValue(field.pill, checked)}
              />
            ) : (
              <div key={field.pill}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={properties[field.pill]}
                  onChange={(e) => setPropertyValue(field.pill, e.target.value)}
                  placeholder={field.placeholder}
                  className={TEXT_INPUT}
                />
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

function getSpeciesFields(species) {
  return SPECIES_PROPERTIES.filter(
    (field) => species[field.key] !== undefined && species[field.key] !== null
  ).map((field) => ({ ...field, value: species[field.key] }))
}

// A species renders as a collapsed chip showing only its name. Clicking it unfolds the phase
// and property values in place; an expanded chip claims a full row of the wrapping list so its
// controls have room. Expansion is local state -- opening one leaves the others alone.
function SpeciesChip({ species, onPhaseChange, onFieldSave, onRemove }) {
  const [expanded, setExpanded] = useState(false)

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 py-2 text-[15px] font-semibold text-gray-700 whitespace-nowrap transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        {species.name}
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
      </button>
    )
  }

  return (
    <div className="w-full rounded-2xl border border-gray-300 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1.5 rounded text-base font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          {species.name}
          <ChevronUp className="w-4 h-4 flex-shrink-0" />
        </button>

        <Button
          variant="glass"
          size="sm"
          onClick={() => onRemove(species.name)}
          className="rounded-lg bg-white text-red-600 hover:bg-red-50"
        >
          Remove
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wide text-gray-700">
            Phase
          </label>
          {/* No "Others" pill here: editing a species picks among existing phases rather than
              defining new ones. New phases are created in the Add species form. */}
          <PhaseSelector
            value={species.phase}
            onChange={(phase) => onPhaseChange(species.name, phase)}
            size="compact"
            allowCustom={false}
          />
        </div>

        {getSpeciesFields(species).map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wide text-gray-700">
              {field.label}
            </label>
            {field.type === 'boolean' ? (
              <Toggle
                label={field.value ? 'Yes' : 'No'}
                checked={field.value === true}
                onChange={(checked) => onFieldSave(species.name, field, checked)}
              />
            ) : (
              <input
                type="text"
                defaultValue={field.value ?? ''}
                onBlur={(e) => onFieldSave(species.name, field, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
                placeholder={field.placeholder}
                className={`w-full max-w-xs ${TEXT_INPUT_SM}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SpeciesEditor() {
  const dispatch = useDispatch()
  const species = useSelector((state) => state.mechanism.species)
  const { toast } = useToast()

  const [newSpeciesName, setNewSpeciesName] = useState('')
  const [newSpeciesPhase, setNewSpeciesPhase] = useState('')
  const [newSpeciesProperties, setNewSpeciesProperties] = useState({})
  const [speciesSearch, setSpeciesSearch] = useState('')
  const speciesQuery = speciesSearch.trim().toLowerCase()
  // Sorted case-insensitively with natural numeric ordering (e.g., C2H6 before C10H22).
  const filteredSpecies = species
    .filter((sp) => sp.name.toLowerCase().startsWith(speciesQuery))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

  const handleAddSpecies = () => {
    const added = addSpeciesIfValid({
      species,
      newSpeciesName,
      newSpeciesPhase,
      newSpeciesProperties,
      speciesProperties: SPECIES_PROPERTIES,
      dispatch,
      toast,
      addSpecies,
    })

    if (added) {
      setNewSpeciesName('')
      // Keep the selected property pills, but clear their values for the next species
      setNewSpeciesProperties((prev) =>
        Object.fromEntries(Object.keys(prev).map((name) => [name, '']))
      )
    }
  }

  const handleRemoveSpecies = (speciesName) => {
    dispatch(removeSpecies(speciesName))
    toast({
      title: 'Species Removed',
      description: `"${speciesName}" has been removed from the mechanism`,
      variant: 'delete',
    })
  }

  // Saves any numeric field on a species -- a top-level key like molecular weight, or a named
  // entry under `properties`. Clearing the input removes the field rather than storing NaN.
  const handleFieldSave = (speciesName, field, rawValue) => {
    const existingSpecies = species.find((sp) => sp.name === speciesName)

    if (!existingSpecies) {
      return
    }

    const updatedSpecies = { ...existingSpecies }

    if (field.type === 'boolean') {
      if (rawValue) {
        updatedSpecies[field.key] = true
      } else {
        delete updatedSpecies[field.key]
      }
      dispatch(updateSpecies(updatedSpecies))
      return
    }

    const trimmedValue = rawValue.trim()

    // Clearing the input removes the property, which is how "not set" is expressed.
    if (!trimmedValue) {
      delete updatedSpecies[field.key]
      dispatch(updateSpecies(updatedSpecies))
      return
    }

    const parsedValue = Number.parseFloat(trimmedValue)

    if (Number.isNaN(parsedValue)) {
      toast({
        title: 'Error',
        description: `${field.label} must be a valid number`,
        variant: 'destructive',
      })
      return
    }

    updatedSpecies[field.key] = parsedValue
    updatedSpecies.phase = updatedSpecies.phase || 'Gas'
    dispatch(updateSpecies(updatedSpecies))
  }

  const handlePhaseSave = (speciesName, phaseValue) => {
    const existingSpecies = species.find((sp) => sp.name === speciesName)

    if (!existingSpecies) {
      return
    }

    dispatch(
      updateSpecies({
        ...existingSpecies,
        phase: phaseValue || 'Gas',
      })
    )
  }

  const speciesChips = (
    <div className="flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-y-auto">
      {filteredSpecies.length === 0 ? (
        <p className="w-full text-center text-gray-500 py-8">No matching species found.</p>
      ) : (
        filteredSpecies.map((sp) => (
          <SpeciesChip
            key={sp.name}
            species={sp}
            onPhaseChange={handlePhaseSave}
            onFieldSave={handleFieldSave}
            onRemove={handleRemoveSpecies}
          />
        ))
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Add form and species list are separate cards, side by side on wide screens. They
          stack below lg, where two columns would leave neither enough room. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Add species</CardTitle>
            <CardDescription>Define a new species for the mechanism</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-7">
              <div>
                <label className="block text-base font-semibold text-gray-800 mb-2">
                  Choose a phase
                </label>
                <PhaseSelector value={newSpeciesPhase} onChange={setNewSpeciesPhase} />
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-800 mb-2">
                  Species name
                </label>
                <input
                  type="text"
                  value={newSpeciesName}
                  onChange={(e) => setNewSpeciesName(e.target.value)}
                  placeholder="e.g., N2"
                  className={TEXT_INPUT}
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-800 mb-2">
                  Add properties
                </label>
                <PropertySelector
                  properties={newSpeciesProperties}
                  onChange={setNewSpeciesProperties}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleAddSpecies}
                variant="assistSecondary"
                size="lg"
                className="text-base"
              >
                Add species
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col lg:h-[56rem]">
          <CardHeader>
            <CardTitle>{`${species.length} species`}</CardTitle>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col">
            {/* Search Bar */}
            <input
              type="text"
              value={speciesSearch}
              onChange={(e) => setSpeciesSearch(e.target.value)}
              placeholder="Search species by name"
              className={`w-full mb-5 ${TEXT_INPUT_SM}`}
            />

            {species.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No species defined. Add your first species above.
              </p>
            ) : (
              speciesChips
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SpeciesEditor
