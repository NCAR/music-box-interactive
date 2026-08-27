import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { addSpecies, updateSpecies, removeSpecies } from '../../redux/slices/mechanismSlice'
import { useToast } from '@/hooks/use-toast'
import { Info, Atom, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import { addSpeciesIfValid } from './speciesUtils'

// Fixed phase segments; anything else is entered as a custom "Others" phase
const FIXED_PHASE_OPTIONS = ['Gas', 'Aqueous']
// Fixed property segments; anything else is entered as a custom "Others" property
const FIXED_PROPERTY_OPTIONS = [
  'Molecular weight',
  'Diffusion coefficient',
  'Density',
  'Absolute tolerance',
]
const PROPERTY_FIELD_CONFIG = {
  'Molecular weight': {
    label: 'Molecular weight (kg/mol)',
    placeholder: 'Default (0.029 kg/mol)',
  },
  'Diffusion coefficient': {
    label: 'Diffusion coefficient (m2/s)',
    placeholder: 'e.g., 1e-5',
  },
  'Density': {
    label: 'Density (kg/m3)',
    placeholder: 'e.g., 1e-5',
  },
  // A solver threshold: it carries the units of the quantity it bounds, not one of its own.
  'Absolute tolerance': {
    label: 'Absolute tolerance',
    placeholder: 'e.g., 1e-12',
  },
}
function getPropertyFieldConfig(name) {
  return PROPERTY_FIELD_CONFIG[name] || { label: `${name}`, placeholder: 'e.g., 1.2' }
}
const CUSTOM_PILL_MAX_LENGTH = 512

// Shared pill styling for the phase and property selectors below.
function pillClassName(active, compact) {
  return `${
    compact ? 'px-2.5 py-1 text-[11px]' : 'px-4 py-2 text-[15px]'
  } font-semibold rounded-full border whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 flex items-center gap-1.5 ${
    active
      ? 'bg-green-50 border-green-300 text-green-800'
      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
  }`
}

// Dialog for entering a custom pill name, styled after Google Calendar's
// "Another office" / "Add location" working-location dialog.
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

// Pill-style phase picker: Gas | Aqueous | (any custom phases) | Others,
// where Others opens a dialog to type a custom phase name (its own pill).
function PhaseSelector({ value, onChange, size = 'default', allowCustom = true }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  // Remembers every custom phase entered so their pills stay even after
  // switching to Gas/Aqueous/another custom phase, instead of disappearing.
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
      <button
        type="button"
        onClick={() => onChange('Gas')}
        className={pillClassName(value === 'Gas', compact)}
      >
        Gas
      </button>
      <button
        type="button"
        onClick={() => onChange('Aqueous')}
        className={pillClassName(value === 'Aqueous', compact)}
      >
        Aqueous
      </button>

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

// Multi-select pill picker for named numeric species properties: Density |
// Absolute tolerance | (custom) | Others. Selecting a pill toggles that
// property on/off and reveals a value input for it; Others adds a new
// custom-named property the same way.
function PropertySelector({ properties, onChange, size = 'default' }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  // Remembers every custom property name entered so its pill stays even
  // after being toggled off, instead of disappearing.
  const [savedCustoms, setSavedCustoms] = useState(() =>
    Object.keys(properties).filter((name) => !FIXED_PROPERTY_OPTIONS.includes(name))
  )

  useEffect(() => {
    setSavedCustoms((prev) => {
      const missing = Object.keys(properties).filter(
        (name) => !FIXED_PROPERTY_OPTIONS.includes(name) && !prev.includes(name)
      )
      return missing.length ? [...prev, ...missing] : prev
    })
  }, [properties])

  const togglePill = (name) => {
    if (name in properties) {
      const next = { ...properties }
      delete next[name]
      onChange(next)
    } else {
      onChange({ ...properties, [name]: '' })
    }
  }

  const handleAddCustom = (name) => {
    onChange({ ...properties, [name]: properties[name] ?? '' })
    setDialogOpen(false)
  }

  const setPropertyValue = (name, val) => {
    onChange({ ...properties, [name]: val })
  }

  const compact = size === 'compact'
  const activeNames = Object.keys(properties)
  const pillOptions = [...FIXED_PROPERTY_OPTIONS, ...savedCustoms]

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {pillOptions.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => togglePill(name)}
            className={pillClassName(name in properties, compact)}
          >
            {name}
          </button>
        ))}

        <button type="button" onClick={() => setDialogOpen(true)} className={pillClassName(false, compact)}>
          Others
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
        </button>

        {dialogOpen && (
          <AddPillDialog
            label="Add property"
            onCancel={() => setDialogOpen(false)}
            onAdd={handleAddCustom}
          />
        )}
      </div>

      {activeNames.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {activeNames.map((name) => {
            const { label, placeholder } = getPropertyFieldConfig(name)
            return (
              <div key={name}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {label}
                </label>
                <input
                  type="text"
                  value={properties[name]}
                  onChange={(e) => setPropertyValue(name, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 border-2 border-gray-400 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-xl text-base font-mono focus:outline-none focus:border-green-700"
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// visual editor for species in the mechanism
// Editable numeric fields a species may carry. Both are optional: species added through the
// form get defaults, but ones loaded from a mechanism config often have only a molecular weight.
const SPECIES_FIELD_CONFIG = {
  molecular_weight_kg_mol: { label: 'Molecular weight (kg/mol)', placeholder: 'e.g., 0.029' },
  'diffusion coefficient [m2 s-1]': {
    label: 'Diffusion coefficient (m2/s)',
    placeholder: 'e.g., 1e-5',
  },
}

// The fields to show for one species: the known top-level ones it actually defines, followed by
// whatever named properties the configuration gave it.
function getSpeciesFields(species) {
  const fields = Object.entries(SPECIES_FIELD_CONFIG)
    .filter(([key]) => species[key] !== undefined && species[key] !== null)
    .map(([key, config]) => ({ key, ...config, value: species[key] }))

  for (const [key, value] of Object.entries(species.properties || {})) {
    const { label, placeholder } = getPropertyFieldConfig(key)
    fields.push({ key, group: 'properties', label, placeholder, value })
  }

  return fields
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
              className="w-full max-w-xs px-3 py-2 border-2 border-gray-400 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-lg text-sm font-mono focus:outline-none focus:border-green-700"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SpeciesEditor() {
  const dispatch = useDispatch()
  const species = useSelector((state) => state.mechanism.species)
  const selectedMechanism = useSelector((state) => state.mechanism.selectedMechanism)
  const { toast } = useToast()

  const [newSpeciesName, setNewSpeciesName] = useState('')
  const [newSpeciesPhase, setNewSpeciesPhase] = useState('')
  const [newSpeciesProperties, setNewSpeciesProperties] = useState({})
  const [speciesSearch, setSpeciesSearch] = useState('')
  // Species matching the search, exact matches first. Matching is on the start of the name, not
  // anywhere within it: searching "I" should offer species beginning with I, not every name that
  // happens to contain one (PI, HNO3I, ...).
  const speciesQuery = speciesSearch.trim().toLowerCase()
  const filteredSpecies = species
    .filter((sp) => sp.name.toLowerCase().startsWith(speciesQuery))
    .sort((a, b) => {
      if (!speciesQuery) return 0
      const aExact = a.name.toLowerCase() === speciesQuery
      const bExact = b.name.toLowerCase() === speciesQuery
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      // Otherwise, keep original order
      return 0
    })

  // check if predefined mech
  const preDefinedMechanisms = {
    chapman: {
      name: 'Chapman',
      species: 5,
      reactions: 6,
      description: 'Stratospheric oxygen chemistry',
    },
    ts1: {
      name: 'TS1',
      species: 209,
      reactions: 512,
      description: '209 species tropospheric mechanism',
    },
    analytical: {
      name: 'Analytical',
      species: 3,
      reactions: 3,
      description: 'Simple test mechanism (A→B→C)',
    },
  }
  const isPredefined = preDefinedMechanisms[selectedMechanism]

  const handleAddSpecies = () => {
    const added = addSpeciesIfValid({
      species,
      newSpeciesName,
      newSpeciesPhase,
      newSpeciesProperties,
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

  // const handleAddSpecies = () => {
  //   if (!newSpeciesName) {
  //     toast({
  //       title: 'Error',
  //       description: 'Please enter a species name',
  //       variant: 'destructive',
  //     })
  //     return
  //   }

  //   // convert to uppercase (chemistry convention)
  //   const normalizedName = newSpeciesName.trim().toUpperCase()

  //   if (species.find(s => s.name === normalizedName)) {
  //     toast({
  //       title: 'Error',
  //       description: `Species "${normalizedName}" already exists`,
  //       variant: 'destructive',
  //     })
  //     return
  //   }

  //   // default to air mol weight if not provided
  //   const molWeight = newMolWeight ? parseFloat(newMolWeight) : 0.029
  //   if (isNaN(molWeight)) {
  //     toast({
  //       title: 'Error',
  //       description: 'Molecular weight must be a valid number',
  //       variant: 'destructive',
  //     })
  //     return
  //   }

  //   dispatch(addSpecies({
  //     name: normalizedName,
  //     molecular_weight_kg_mol: molWeight,
  //     properties: {},
  //   }))

  //   toast({
  //     title: 'Success',
  //     description: `Species "${normalizedName}" added successfully`,
  //     variant: 'success',
  //   })

  //   setNewSpeciesName('')
  //   setNewMolWeight('')
  // }

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

    const trimmedValue = rawValue.trim()
    const updatedSpecies = { ...existingSpecies }

    const write = (value) => {
      if (field.group === 'properties') {
        const nextProperties = { ...(updatedSpecies.properties || {}) }
        if (value === undefined) {
          delete nextProperties[field.key]
        } else {
          nextProperties[field.key] = value
        }
        updatedSpecies.properties = nextProperties
      } else if (value === undefined) {
        delete updatedSpecies[field.key]
      } else {
        updatedSpecies[field.key] = value
      }
    }

    if (!trimmedValue) {
      write(undefined)
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

    write(parsedValue)
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

  return (
    <div className="space-y-4">
      {/* Pre-defined Mechanism Info */}
      {isPredefined && (
        <Card className="border-2 border-white/20">
          <CardHeader>
            <CardTitle>Using Pre-defined Mechanism: {isPredefined.name}</CardTitle>
            <CardDescription>{isPredefined.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/0 backdrop-blur-lg rounded-lg p-3 border border-white/20">
                <div className="text-sm text-gray-700">Species Count</div>
                <div className="text-2xl font-bold text-blue-600">{isPredefined.species}</div>
              </div>
              <div className="bg-white/0 backdrop-blur-lg rounded-lg p-3 border border-white/20">
                <div className="text-sm text-gray-700">Reactions Count</div>
                <div className="text-2xl font-bold text-blue-600">{isPredefined.reactions}</div>
              </div>
            </div>
            <div className="bg-white/0 backdrop-blur-lg border border-white/20 rounded-lg p-3 text-sm text-gray-700">
              <p className="font-semibold mb-1 flex items-center gap-2">
                <Info className="w-4 h-4" />
                About Pre-defined Mechanisms:
              </p>
              <ul className="space-y-0.5 ml-4 text-xs">
                <li>• Species and reactions are loaded from mechanism config files</li>
                <li>• You can modify initial conditions in the Conditions tab</li>
                <li>• Run simulations directly without manual species/reaction setup</li>
                <li>• For custom mechanisms, clear the example and add species manually</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info box for predefined mechanisms */}
      {isPredefined && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 text-sm">
          <p className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Extending Pre-defined Mechanism
          </p>
          <p className="text-blue-700 text-xs">
            You can add custom species to the {isPredefined.name} mechanism. This allows you to
            extend the mechanism with additional species for specialized simulations.
          </p>
        </div>
      )}

      {/* Add form and species list are separate cards, side by side on wide screens. They
          stack below lg, where two columns would leave neither enough room. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Add species</CardTitle>
            <CardDescription>
              {isPredefined
                ? `Extend the ${isPredefined.name} mechanism with a custom species`
                : 'Define a new species for the mechanism'}
            </CardDescription>
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
                  className="w-full px-4 py-3 border-2 border-gray-400 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-xl text-base font-mono focus:outline-none focus:border-green-700"
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
                className="rounded-2xl text-base"
              >
                Add species
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col lg:h-[56rem]">
          <CardHeader>
            <CardTitle>
              {isPredefined
                ? `${isPredefined.name} Mechanism Species (${isPredefined.species} pre-configured${species.length > 0 ? ` + ${species.length} custom` : ''})`
                : `Total ${species.length} species`}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col">
            {/* Search Bar */}
            <input
              type="text"
              value={speciesSearch}
              onChange={(e) => setSpeciesSearch(e.target.value)}
              placeholder="Search species by name"
              className="w-full mb-3 px-3 py-2 border-2 border-gray-400 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-lg text-sm font-mono focus:outline-none focus:border-green-700"
            />

            {isPredefined && species.length === 0 ? (
              <div className="text-center py-8 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20">
                <div className="flex justify-center mb-2">
                  <Atom className="w-16 h-16" />
                </div>
                <p className="text-blue-900 font-medium mb-1">
                  {isPredefined.species} species are pre-configured in this mechanism
                </p>
                <p className="text-xs text-gray-600 mb-2">
                  Species definitions are loaded from the mechanism config file
                </p>
                <p className="text-xs text-blue-700">
                  Add custom species above to extend the mechanism
                </p>
              </div>
            ) : isPredefined && species.length > 0 ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="text-center py-4 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 mb-3">
                  <p className="text-blue-900 font-medium text-sm mb-1">
                    {isPredefined.species} pre-configured + {species.length} custom species
                  </p>
                  <p className="text-xs text-gray-600">Custom species shown below</p>
                </div>
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
              </div>
            ) : species.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No species defined. Add your first species above.
              </p>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SpeciesEditor
