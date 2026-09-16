import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Lightbulb } from 'lucide-react'
import { hydrateInitialConditions } from '../../utils/hydrateConditions'
import {
  setTemperature,
  setPressure,
  setConcentrations,
  setRateConstants,
  setConcentration,
  markInitialHydrated,
} from '../../redux/slices/conditionsSlice'
import { useToast } from '@/hooks/use-toast'
import { LIST_CARD, LIST_CARD_CONTENT, FIELD_LABEL, TEXT_INPUT_SM } from '../Mechanism/fieldStyles'

// Matches EnvironmentTab: the left column fits its content, the right column expands.
const EDITOR_GRID = 'grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr] lg:items-start'

const TEXT_INPUT =
  'w-72 h-9 px-2 border border-gray-400 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent'

/**
 * SpeciesConcentrationTab Component
 * Manages initial species concentrations
 */
export function SpeciesConcentrationTab() {
  const dispatch = useDispatch()
  const { toast } = useToast()
  const initial = useSelector((state) => state.conditions.initial)
  const conditions = useSelector((state) => state.conditions.conditions)
  const hydratedExampleId = useSelector((state) => state.conditions.hydration.initialExampleId)
  const currentExample = useSelector((state) => state.mechanism.currentExample)
  const selectedMechanism = useSelector((state) => state.mechanism.selectedMechanism)
  const mechanismSpecies = useSelector((state) => state.mechanism.species)

  const [newSpecies, setNewSpecies] = useState('')
  const [newConcentration, setNewConcentration] = useState('')
  const [selectedSpecies, setSelectedSpecies] = useState(new Set())
  const [showMissing, setShowMissing] = useState(false)
  const [speciesSearch, setSpeciesSearch] = useState('')

  useEffect(() => {
    const exampleId = currentExample?.id

    if (!exampleId || hydratedExampleId === exampleId) {
      return
    }

    const hydrated = hydrateInitialConditions(conditions)
    if (hydrated.temperature !== null) dispatch(setTemperature(hydrated.temperature))
    if (hydrated.pressure !== null) dispatch(setPressure(hydrated.pressure))
    dispatch(setConcentrations(hydrated.concentrations))
    dispatch(setRateConstants(hydrated.rateConstants))
    dispatch(markInitialHydrated(exampleId))
  }, [currentExample, dispatch, conditions, hydratedExampleId])

  const speciesEntries = Object.entries(initial.concentrations)

  const speciesQuery = speciesSearch.trim().toLowerCase()
  const visibleSpeciesEntries = speciesQuery
    ? speciesEntries.filter(([species]) => species.toLowerCase().includes(speciesQuery))
    : speciesEntries

  // Species with no initial concentration default to 0 mol m-3, 
  // which may be intentional but is worth flagging.
  const missingSpecies = mechanismSpecies
    .map((species) => species.name)
    .filter((name) => initial.concentrations[name] === undefined)

  const handleAdd = () => {
    const species = newSpecies.trim()
    const concentrationIsBlank = newConcentration.trim() === ''

    if (!species || concentrationIsBlank) {
      toast({
        title: 'Invalid Input',
        description: 'Species name and concentration are required',
        variant: 'destructive',
      })
      return
    }

    const value = parseFloat(newConcentration)
    if (isNaN(value)) {
      toast({
        title: 'Invalid Input',
        description: 'Concentration must be a valid number',
        variant: 'destructive',
      })
      return
    }

    if (initial.concentrations[species] !== undefined) {
      toast({
        title: 'Duplicate Species',
        description: `Species "${species}" already exists`,
        variant: 'destructive',
      })
      return
    }

    dispatch(setConcentration({ species, value }))
    toast({
      title: 'Species Added',
      description: `Added ${species} at concentration ${value}`,
      variant: 'success',
    })
    setNewSpecies('')
    setNewConcentration('')
  }

  const handleConcentrationChange = (species, value) => {
    const parsed = parseFloat(value)
    if (!isNaN(parsed)) {
      dispatch(setConcentration({ species, value: parsed }))
    }
  }

  const toggleSelected = (species) => {
    setSelectedSpecies((prev) => {
      const next = new Set(prev)
      if (next.has(species)) {
        next.delete(species)
      } else {
        next.add(species)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedSpecies((prev) =>
      prev.size === visibleSpeciesEntries.length
        ? new Set()
        : new Set(visibleSpeciesEntries.map(([species]) => species))
    )
  }

  const handleRemoveSelected = () => {
    if (selectedSpecies.size === 0) return

    const removedCount = selectedSpecies.size
    const nextConcentrations = Object.fromEntries(
      speciesEntries.filter(([species]) => !selectedSpecies.has(species))
    )
    dispatch(setConcentrations(nextConcentrations))

    toast({
      title: removedCount === 1 ? 'Species Removed' : 'Species Removed',
      description: `Removed ${removedCount} species`,
      variant: 'delete',
    })

    setSelectedSpecies(new Set())
  }

  return (
    <div className={EDITOR_GRID}>
      <Card className="w-fit">
        <CardHeader>
          <CardTitle>Species concentration</CardTitle>
          <CardDescription>Set initial concentrations for chemical species</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-72 mx-auto">
            <label className={FIELD_LABEL}>Species</label>
            <input
              type="text"
              value={newSpecies}
              onChange={(e) => setNewSpecies(e.target.value)}
              placeholder="e.g., O2"
              className={TEXT_INPUT}
            />
          </div>

          <div className="w-72 mx-auto">
            <label className={FIELD_LABEL}>Concentration (mol m-3)</label>
            <input
              type="text"
              inputMode="decimal"
              value={newConcentration}
              onChange={(e) => setNewConcentration(e.target.value)}
              placeholder="1e-8"
              className={TEXT_INPUT}
            />
          </div>

          <div className="h-0.5" />
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleAdd}
              variant="assistSecondary"
              className="h-9 px-8 text-base">
              Add species
            </Button>
          </div>

          {missingSpecies.length > 0 && (
            <div className="w-72 mx-auto">
              <button
                type="button"
                onClick={() => setShowMissing((prev) => !prev)}
                className="w-full text-xs font-semibold px-2 py-1 rounded-full border border-border bg-surface-alt text-muted hover:bg-surface-hover"
              >
                {missingSpecies.length} not set (default to 0)
              </button>
              {showMissing && (
                <div className="mt-2 p-3 border border-border bg-surface-alt rounded-lg text-xs text-ink">
                  <p className="font-semibold mb-1.5">Not set, default to 0 mol m-3:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {missingSpecies.map((name) => (
                      <span
                        key={name}
                        className="px-2 py-0.5 rounded-full bg-white border border-border font-mono"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={LIST_CARD}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{speciesEntries.length} species</CardTitle>
            </div>
            {selectedSpecies.size > 0 && (
              <Button
                variant="glass"
                size="sm"
                onClick={handleRemoveSelected}
                className="rounded-lg bg-white text-red-600 hover:bg-red-50 flex-shrink-0"
              >
                Remove selected ({selectedSpecies.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className={LIST_CARD_CONTENT}>
          <input
            type="text"
            value={speciesSearch}
            onChange={(e) => setSpeciesSearch(e.target.value)}
            placeholder="Search species by name"
            className={`w-full mb-3 ${TEXT_INPUT_SM}`}
          />

          {speciesEntries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No species configured. Add species on the left.
            </p>
          ) : visibleSpeciesEntries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No species match "{speciesSearch}".
            </p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-assist-secondary text-assist-secondary-foreground">
                  <tr>
                    <th className="w-10 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedSpecies.size === visibleSpeciesEntries.length}
                        onChange={toggleSelectAll}
                        aria-label="Select all species"
                        className="accent-green-700"
                      />
                    </th>
                    <th className="text-left px-4 py-2 font-semibold">Species</th>
                    <th className="text-left px-4 py-2 font-semibold">Concentration (mol m-3)</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSpeciesEntries.map(([species, concentration]) => (
                    <tr key={species} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedSpecies.has(species)}
                          onChange={() => toggleSelected(species)}
                          aria-label={`Select ${species}`}
                          className="accent-green-700"
                        />
                      </td>
                      <td className="px-4 py-2 font-mono font-semibold">{species}</td>
                      <td className="px-4 py-2 font-mono">
                        <input
                          type="text"
                          value={concentration}
                          onChange={(e) => handleConcentrationChange(species, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 bg-white rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-action"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="lg:col-span-2 bg-surface-alt backdrop-blur-lg border border-border rounded-lg p-3 text-xs text-ink">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Tips:
        </p>
        <ul className="space-y-0.5 ml-4">
          <li>• Use scientific notation for small values (e.g., 1e-8)</li>
          <li>• Concentrations are in mol m-3 (molar concentration)</li>
          <li>
            • Species must exist in the selected mechanism
            {selectedMechanism ? `: ${selectedMechanism}` : ''}
          </li>
        </ul>
      </div>
    </div>
  )
}

export default SpeciesConcentrationTab
