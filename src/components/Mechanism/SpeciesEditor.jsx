import { useState, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useNotify } from '@/hooks/use-notify'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Toggle } from '../ui/toggle'
import {
  addSpecies,
  updateSpecies,
  removeSpecies,
  removeReaction,
  selectNamedReactions,
} from '../../redux/slices/mechanismSlice'
import { reactionsUsingSpecies } from '../../services/mechanism/speciesIds'
import { RemoveSpeciesDialog } from './RemoveSpeciesDialog'
import { Dropdown } from '../ui/dropdown'
import { AddRowDialog } from './table/AddRowDialog'
import { RemoveRowButton } from './table/RemoveRowButton'
import { DataTable } from './table/DataTable'
import { EditableCell } from './table/EditableCell'
import { addSpeciesIfValid } from './speciesUtils'
import { ADD_BUTTON, ADD_INPUT, EDITOR_COLUMN, LIST_CARD_CONTENT, TABLE_CARD, TEXT_INPUT_SM } from './fieldStyles'
import { SPECIES_PROPERTIES } from '../../services/simulation/local/speciesProperties'
import { withPhaseInfo } from '../../services/simulation/local/mechanism'

const CONCENTRATION_PILL = 'Constant concentration'
const CUSTOM_PILL_MAX_LENGTH = 512
// The "New phase…" item of the add row's phase dropdown.
const NEW_PHASE = '__new_phase__'

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
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <label htmlFor="add-pill-input" className="block text-sm font-medium text-ink mb-1">
          {label}
        </label>
        <input
          id="add-pill-input"
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

// Numbers in exponential notation only where it helps, as in the reactions table.
const formatPropertyValue = (value) => {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'number') return String(value)
  if (value === 0) return '0'
  const magnitude = Math.abs(value)
  return magnitude < 1e-3 || magnitude >= 1e6 ? value.toExponential(2) : String(value)
}

export function SpeciesEditor() {
  const dispatch = useDispatch()
  const storedSpecies = useSelector((state) => state.mechanism.config.mechanism?.species)
  const phases = useSelector((state) => state.mechanism.config.mechanism?.phases)
  const species = useMemo(() => withPhaseInfo(storedSpecies ?? [], phases), [storedSpecies, phases])
  // A mechanism with no phase yet gets "gas" when its first species is added.
  const phaseNames = useMemo(() => (phases?.length ? phases.map((p) => p.name) : ['gas']), [phases])
  const notify = useNotify()

  // The add row at the top of the table. Properties are keyed by pill name (see addSpeciesIfValid).
  const [newSpeciesName, setNewSpeciesName] = useState('')
  const [newSpeciesPhase, setNewSpeciesPhase] = useState('')
  const [newSpeciesProperties, setNewSpeciesProperties] = useState({})
  const [newPhaseDialogOpen, setNewPhaseDialogOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [speciesSearch, setSpeciesSearch] = useState('')
  const speciesQuery = speciesSearch.trim().toLowerCase()
  // Sorted case-insensitively with natural numeric ordering (e.g., C2H6 before C10H22).
  const filteredSpecies = species
    .filter((sp) => sp.name.toLowerCase().startsWith(speciesQuery))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

  const handleAddSpecies = () => {
    const rawConcentration = newSpeciesProperties[CONCENTRATION_PILL]
    const trimmedConcentration =
      typeof rawConcentration === 'string' ? rawConcentration.trim() : ''
    if (trimmedConcentration !== '') {
      const parsedConcentration = Number(trimmedConcentration)
      if (Number.isNaN(parsedConcentration)) {
        notify.invalidInput('Constant concentration must be a valid number.')
        return
      }
    }

    const added = addSpeciesIfValid({
      species,
      newSpeciesName,
      newSpeciesPhase,
      newSpeciesProperties,
      speciesProperties: SPECIES_PROPERTIES,
      dispatch,
      notify,
      addSpecies,
    })

    if (added) {
      setNewSpeciesName('')
      setNewSpeciesProperties({})
    }
  }

  // Remove asks first (see RemoveSpeciesDialog). The reactions that use the species go too,
  // and their conditions go with them (see conditionsSlice).
  const [pendingRemoval, setPendingRemoval] = useState(null)
  const storedReactions = useSelector((state) => state.mechanism.config.mechanism?.reactions)
  const namedReactions = useSelector(selectNamedReactions)

  const handleRemoveSpecies = (removed) => {
    const usingIds = new Set(reactionsUsingSpecies(storedReactions ?? [], removed.id).map((r) => r.id))
    setPendingRemoval({
      species: removed,
      reactions: namedReactions.filter((reaction) => usingIds.has(reaction.id)),
    })
  }

  const confirmRemoveSpecies = () => {
    const { species: removed, reactions: removedReactions } = pendingRemoval
    removedReactions.forEach((reaction) => dispatch(removeReaction(reaction.id)))
    dispatch(removeSpecies(removed.id))
    setPendingRemoval(null)
    notify.removed(
      'Species Removed',
      `"${removed.name}" was removed from the mechanism` +
        (removedReactions.length === 0
          ? '.'
          : `, with the ${removedReactions.length} ${removedReactions.length === 1 ? 'reaction' : 'reactions'} that used it.`)
    )
  }

  // Saves any numeric field on a species -- a top-level key like molecular weight, or a named
  // entry under `properties`. Clearing the input removes the field rather than storing NaN.
  // Species are found by their UI-only id (see services/mechanism/speciesIds).
  const handleFieldSave = (speciesId, field, rawValue) => {
    const existingSpecies = species.find((sp) => sp.id === speciesId)

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
      notify.invalidInput(`${field.label} must be a valid number.`)
      return
    }

    updatedSpecies[field.key] = parsedValue
    dispatch(updateSpecies(updatedSpecies))
  }

  const handlePhaseSave = (speciesId, phaseValue) => {
    const existingSpecies = species.find((sp) => sp.id === speciesId)

    if (!existingSpecies) {
      return
    }

    dispatch(
      updateSpecies({
        ...existingSpecies,
        phase: phaseValue || 'gas',
      })
    )
  }

  // A rename is safe: everything refers to the species by its id (see speciesIds).
  const handleNameSave = (renamed, rawValue) => {
    const name = rawValue.trim()
    if (!name) {
      notify.invalidInput('Species name cannot be empty.')
      return
    }
    if (species.some((sp) => sp.id !== renamed.id && sp.name === name)) {
      notify.invalidInput(`A species named "${name}" already exists.`)
      return
    }
    dispatch(updateSpecies({ ...renamed, name }))
  }

  const columns = [
    {
      id: 'name',
      label: 'Name',
      hideable: false,
      sortValue: (sp) => sp.name,
      render: (sp) => (
        <EditableCell
          value={sp.name}
          label={`Name of ${sp.name}`}
          onCommit={(raw) => handleNameSave(sp, raw)}
        />
      ),
    },
    {
      id: 'phase',
      label: 'Phase',
      sortValue: (sp) => sp.phase ?? '',
      render: (sp) => (
        <div className="min-w-[7rem]">
          <Dropdown
            value={sp.phase ?? ''}
            onChange={(phase) => handlePhaseSave(sp.id, phase)}
            className="h-8"
            options={phaseNames.map((name) => ({ value: name, label: name }))}
          />
        </div>
      ),
    },
    ...SPECIES_PROPERTIES.map((field) => ({
      id: field.key,
      label: field.label,
      sortValue: (sp) => (field.type === 'boolean' ? (sp[field.key] ? 1 : 0) : sp[field.key]),
      render: (sp) =>
        field.type === 'boolean' ? (
          <Toggle
            label={sp[field.key] ? 'Yes' : 'No'}
            checked={sp[field.key] === true}
            size="sm"
            onChange={(checked) => handleFieldSave(sp.id, field, checked)}
          />
        ) : (
          <EditableCell
            value={formatPropertyValue(sp[field.key])}
            placeholder={field.placeholder ?? ''}
            label={`${field.label} of ${sp.name}`}
            onCommit={(raw) => handleFieldSave(sp.id, field, raw)}
          />
        ),
    })),
    {
      id: 'actions',
      label: '',
      hideable: false,
      className: 'w-0',
      render: (sp) => (
        <RemoveRowButton label={`Remove ${sp.name}`} onClick={() => handleRemoveSpecies(sp)} />
      ),
    },
  ]

  // A phase that the user has typed but that no species uses yet still shows in the add row.
  const addPhase = newSpeciesPhase || phaseNames[0]
  const addPhaseOptions = [
    ...phaseNames.map((name) => ({ value: name, label: name })),
    ...(phaseNames.includes(addPhase) ? [] : [{ value: addPhase, label: addPhase }]),
    { value: NEW_PHASE, label: 'New phase…' },
  ]

  const addOnEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSpecies()
    }
  }

  const renderAddCell = (column) => {
    if (column.id === 'name') {
      return (
        <input
          type="text"
          value={newSpeciesName}
          onChange={(e) => setNewSpeciesName(e.target.value)}
          onKeyDown={addOnEnter}
          placeholder="species name"
          aria-label="New species name"
          className={ADD_INPUT}
        />
      )
    }
    if (column.id === 'phase') {
      return (
        <div className="min-w-[7rem]">
          <Dropdown
            value={addPhase}
            onChange={(phase) =>
              phase === NEW_PHASE ? setNewPhaseDialogOpen(true) : setNewSpeciesPhase(phase)
            }
            className="h-8"
            options={addPhaseOptions}
          />
        </div>
      )
    }
    const field = SPECIES_PROPERTIES.find((f) => f.key === column.id)
    if (!field) return null
    const value = newSpeciesProperties[field.pill]
    const setValue = (next) => setNewSpeciesProperties((prev) => ({ ...prev, [field.pill]: next }))
    return field.type === 'boolean' ? (
      <Toggle label={value ? 'Yes' : 'No'} checked={value === true} size="sm" onChange={setValue} />
    ) : (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={addOnEnter}
        placeholder={field.placeholder}
        aria-label={`New species ${field.label}`}
        className={ADD_INPUT}
      />
    )
  }

  const addColumns = [
    { id: 'name', label: 'Name' },
    { id: 'phase', label: 'Phase' },
    ...SPECIES_PROPERTIES.map((field) => ({ id: field.key, label: field.label })),
  ]

  return (
    <div className={EDITOR_COLUMN}>
      <Card className={TABLE_CARD}>
        <CardContent className={`${LIST_CARD_CONTENT} p-4`}>
          <DataTable
            tableId="species"
            columns={columns}
            rows={filteredSpecies}
            rowKey={(sp) => sp.id ?? sp.name}
            emptyMessage={species.length === 0 ? 'No species defined yet.' : 'No matching species found.'}
            toolbar={
              // One line: the count, then the search.
              <div className="flex items-center gap-3">
                <h2 className="whitespace-nowrap text-base font-semibold text-heading">
                  {`${species.length} species`}
                </h2>
                <input
                  type="text"
                  value={speciesSearch}
                  onChange={(e) => setSpeciesSearch(e.target.value)}
                  placeholder="Search species by name"
                  className={`w-full ${TEXT_INPUT_SM.replace('text-center', 'text-left')}`}
                />
              </div>
            }
            actions={
              <Button size="sm" className={ADD_BUTTON} onClick={() => setAddOpen(true)}>
                Add species
              </Button>
            }
          />
        </CardContent>
      </Card>
      {addOpen && (
        <AddRowDialog
          title="Add species"
          columns={addColumns}
          render={renderAddCell}
          onAdd={handleAddSpecies}
          onClose={() => setAddOpen(false)}
        />
      )}
      {newPhaseDialogOpen && (
        <AddPillDialog
          label="Add phase"
          onCancel={() => setNewPhaseDialogOpen(false)}
          onAdd={(phase) => {
            setNewSpeciesPhase(phase)
            setNewPhaseDialogOpen(false)
          }}
        />
      )}
      {pendingRemoval && (
        <RemoveSpeciesDialog
          species={pendingRemoval.species}
          reactions={pendingRemoval.reactions}
          onCancel={() => setPendingRemoval(null)}
          onConfirm={confirmRemoveSpecies}
        />
      )}
    </div>
  )
}

export default SpeciesEditor
