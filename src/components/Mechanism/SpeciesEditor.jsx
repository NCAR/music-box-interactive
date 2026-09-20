import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Toggle } from '../ui/toggle'
import { addSpecies, updateSpecies, removeSpecies } from '../../redux/slices/mechanismSlice'
import { addSpeciesIfValid } from './speciesUtils'
import {
  FIELD_LABEL,
  ITEM_CHIP,
  ITEM_LIST,
  ITEM_PANEL,
  LIST_CARD,
  LIST_CARD_CONTENT,
  TEXT_INPUT,
  TEXT_INPUT_SM,
  DROPDOWN_WRAPPER,
  DROPDOWN_BUTTON,
} from './fieldStyles'
import { UnitDropdown } from '../Plots/UnitDropdown'
import { CONCENTRATION_UNITS, airDensityMolM3, toMolM3, fromMolM3 } from '../../utils/concentrationUnits'

// The one property with a unit choice; its key is fixed to mol m-3, so ppb input is converted
// before it's stored or saved.
const CONCENTRATION_PILL = 'Constant concentration'
import { SPECIES_PROPERTIES } from '../../services/simulation/local/speciesProperties'

// Fixed phase segments; anything else is entered as a custom "Others" phase
const FIXED_PHASE_OPTIONS = ['Gas', 'Aqueous']
const DISABLED_PHASE_OPTIONS = ['Aqueous']

const CUSTOM_PILL_MAX_LENGTH = 512

// The add form width is determined by the widest property row.
const SPECIES_EDITOR_GRID =
  'grid grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start'

// Use a two-column layout to size the add card based on the two widest pills.
const PROPERTY_PILL_GRID = 'grid grid-cols-1 sm:grid-cols-2 justify-items-start gap-2'

// Shared pill styling for the phase and property selectors.
function pillClassName(active, compact, disabled = false) {
  const base = `${
    compact ? 'px-2.5 py-1 text-[11px]' : 'px-4 py-2 text-[15px]'
  } rounded-full border whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-assist-secondary-ring flex items-center gap-1.5`

  if (active) {
    return `${base} bg-assist-secondary border-assist-secondary-border text-assist-secondary-foreground`
  }
  if (disabled) {
    return `${base} bg-surface-alt border-border text-muted cursor-not-allowed`
  }
  return `${base} bg-white border-border text-ink hover:bg-surface-hover`
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
        <label className="block text-sm font-medium text-ink mb-1">{label}</label>
        <input
          type="text"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          maxLength={CUSTOM_PILL_MAX_LENGTH}
          className="w-full border-0 border-b-2 border-action bg-transparent px-0 py-1.5 text-base text-ink focus:outline-none"
        />
        <div className="mt-1 text-right text-xs text-muted">
          {draft.length}/{CUSTOM_PILL_MAX_LENGTH}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm font-medium text-ink hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!trimmed}
            className={`rounded px-4 py-2 text-sm font-medium ${
              trimmed ? 'text-action hover:bg-surface-hover' : 'text-muted cursor-not-allowed'
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

function PropertySelector({ properties, onChange, concentrationUnitId, onConcentrationUnitChange }) {
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
      <div className={PROPERTY_PILL_GRID}>
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
            ) : field.pill === CONCENTRATION_PILL ? (
              <div key={field.pill}>
                {/* No unit in the label here -- the dropdown is the unit now. */}
                <label className={FIELD_LABEL}>{field.pill}</label>
                <div className="flex flex-col gap-2">
                  <UnitDropdown
                    unitId={concentrationUnitId}
                    onChange={onConcentrationUnitChange}
                    units={CONCENTRATION_UNITS}
                    wrapperClassName={DROPDOWN_WRAPPER}
                    buttonClassName={DROPDOWN_BUTTON}
                    centerLabel
                  />
                  <input
                    type="text"
                    value={properties[field.pill]}
                    onChange={(e) => setPropertyValue(field.pill, e.target.value)}
                    placeholder={field.placeholder}
                    className={TEXT_INPUT.replace('text-center', 'text-left')}
                  />
                </div>
              </div>
            ) : (
              <div key={field.pill}>
                <label className={FIELD_LABEL}>
                  {field.label}
                </label>
                <input
                  type="text"
                  value={properties[field.pill]}
                  onChange={(e) => setPropertyValue(field.pill, e.target.value)}
                  placeholder={field.placeholder}
                  className={TEXT_INPUT.replace('text-center', 'text-left')}
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
function SpeciesChip({ species, onPhaseChange, onFieldSave, onRemove, airDensity }) {
  const [expanded, setExpanded] = useState(false)
  // Its own unit choice: display only, converted back to the stored mol m-3 value on save.
  const [concentrationUnitId, setConcentrationUnitId] = useState('mol_m3')

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`${ITEM_CHIP} whitespace-nowrap`}
      >
        {species.name}
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
      </button>
    )
  }

  return (
    // Width is capped by the property fields’ max-w-xs
    <div className={`${ITEM_PANEL} max-w-xs`}>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1.5 rounded text-base text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-assist-secondary-ring"
        >
          {species.name}
          <ChevronUp className="w-4 h-4 flex-shrink-0" />
        </button>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemove(species.name)}
          className="h-auto px-2.5 py-1 text-[11px]"
        >
          Remove
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">
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

        {getSpeciesFields(species).map((field) =>
          field.type === 'boolean' ? (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wide text-muted">
                {field.label}
              </label>
              <Toggle
                label={field.value ? 'Yes' : 'No'}
                checked={field.value === true}
                onChange={(checked) => onFieldSave(species.name, field, checked)}
              />
            </div>
          ) : field.pill === CONCENTRATION_PILL ? (
            <div key={field.key} className="flex flex-col gap-1">
              {/* No unit in the label here -- the dropdown is the unit now. */}
              <label className="text-[11px] uppercase tracking-wide text-muted">
                {field.pill}
              </label>
              <div className="flex flex-col gap-2 max-w-xs">
                <UnitDropdown
                  unitId={concentrationUnitId}
                  onChange={setConcentrationUnitId}
                  units={CONCENTRATION_UNITS}
                  wrapperClassName={DROPDOWN_WRAPPER}
                  buttonClassName={DROPDOWN_BUTTON}
                  centerLabel
                />
                <input
                  // Remounts on unit change so the displayed value re-converts instead of
                  // keeping whatever was last typed under the previous unit.
                  key={concentrationUnitId}
                  type="text"
                  defaultValue={fromMolM3(field.value, concentrationUnitId, airDensity) ?? ''}
                  onBlur={(e) => {
                    const raw = e.target.value.trim()
                    if (!raw) {
                      onFieldSave(species.name, field, '')
                      return
                    }
                    const parsed = Number.parseFloat(raw)
                    onFieldSave(
                      species.name,
                      field,
                      Number.isNaN(parsed)
                        ? raw
                        : String(toMolM3(parsed, concentrationUnitId, airDensity))
                    )
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  placeholder={field.placeholder}
                  className={TEXT_INPUT_SM.replace('text-center', 'text-left')}
                />
              </div>
            </div>
          ) : (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wide text-muted">
                {field.label}
              </label>
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
                className={`w-full max-w-xs ${TEXT_INPUT_SM.replace('text-center', 'text-left')}`}
              />
            </div>
          )
        )}
      </div>
    </div>
  )
}

export function SpeciesEditor() {
  const dispatch = useDispatch()
  const species = useSelector((state) => state.mechanism.species)
  const initialConditions = useSelector((state) => state.conditions.initial)
  const { toast } = useToast()
  const airDensity = airDensityMolM3(initialConditions.pressure, initialConditions.temperature)

  const [newSpeciesName, setNewSpeciesName] = useState('')
  const [newSpeciesPhase, setNewSpeciesPhase] = useState('')
  const [newSpeciesProperties, setNewSpeciesProperties] = useState({})
  const [addFormConcentrationUnitId, setAddFormConcentrationUnitId] = useState('mol_m3')
  const [speciesSearch, setSpeciesSearch] = useState('')
  const speciesQuery = speciesSearch.trim().toLowerCase()
  // Sorted case-insensitively with natural numeric ordering (e.g., C2H6 before C10H22).
  const filteredSpecies = species
    .filter((sp) => sp.name.toLowerCase().startsWith(speciesQuery))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

  const handleAddSpecies = () => {
    // Constant concentration is the one property with a unit choice; its key is fixed to
    // mol m-3, so a ppb entry is converted here, before the generic parseFloat in
    // addSpeciesIfValid. A non-numeric value is passed through so that still reports its
    // own "must be a valid number" error rather than silently becoming NaN.
    const rawConcentration = newSpeciesProperties[CONCENTRATION_PILL]
    const parsedConcentration =
      typeof rawConcentration === 'string' ? Number.parseFloat(rawConcentration.trim()) : NaN
    const convertedProperties =
      addFormConcentrationUnitId === 'ppb' && !Number.isNaN(parsedConcentration)
        ? {
            ...newSpeciesProperties,
            [CONCENTRATION_PILL]: String(
              toMolM3(parsedConcentration, addFormConcentrationUnitId, airDensity)
            ),
          }
        : newSpeciesProperties

    const added = addSpeciesIfValid({
      species,
      newSpeciesName,
      newSpeciesPhase,
      newSpeciesProperties: convertedProperties,
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
    <div className={ITEM_LIST}>
      {filteredSpecies.length === 0 ? (
        <p className="w-full text-center text-muted py-8">No matching species found.</p>
      ) : (
        filteredSpecies.map((sp) => (
          <SpeciesChip
            key={sp.name}
            species={sp}
            onPhaseChange={handlePhaseSave}
            onFieldSave={handleFieldSave}
            onRemove={handleRemoveSpecies}
            airDensity={airDensity}
          />
        ))
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Add form and species list are separate cards, side by side on wide screens. They
          stack below lg, where two columns would leave neither enough room. */}
      <div className={SPECIES_EDITOR_GRID}>
        <Card>
          <CardHeader>
            <CardTitle>Add species</CardTitle>
            <CardDescription>Define a new species for the mechanism</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-7">
              <div>
                <label className="block text-base font-semibold text-ink mb-2">
                  Choose a phase
                </label>
                <PhaseSelector value={newSpeciesPhase} onChange={setNewSpeciesPhase} />
              </div>

              <div>
                <label className="block text-base font-semibold text-ink mb-2">
                  Type species
                </label>
                <input
                  type="text"
                  value={newSpeciesName}
                  onChange={(e) => setNewSpeciesName(e.target.value)}
                  placeholder="species name"
                  className={TEXT_INPUT.replace('text-center', 'text-left')}
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-ink mb-2">
                  Add properties
                </label>
                <PropertySelector
                  properties={newSpeciesProperties}
                  onChange={setNewSpeciesProperties}
                  concentrationUnitId={addFormConcentrationUnitId}
                  onConcentrationUnitChange={setAddFormConcentrationUnitId}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleAddSpecies}
                variant="primary"
                size="lg"
                className="text-base font-normal border-0 bg-assist-secondary text-assist-secondary-foreground hover:bg-assist-secondary-hover hover:text-assist-secondary-foreground"
              >
                Add species
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={LIST_CARD}>
          <CardHeader>
            <CardTitle>{`${species.length} species`}</CardTitle>
          </CardHeader>

          <CardContent className={LIST_CARD_CONTENT}>
            {/* Search Bar */}
            <input
              type="text"
              value={speciesSearch}
              onChange={(e) => setSpeciesSearch(e.target.value)}
              placeholder="Search species by name"
              className={`w-[90%] mb-5 ${TEXT_INPUT_SM.replace('text-center', 'text-left')}`}
            />

            {species.length === 0 ? (
              <p className="text-center text-muted py-8">
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
