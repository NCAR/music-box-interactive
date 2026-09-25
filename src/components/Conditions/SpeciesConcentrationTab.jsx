import { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
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
import {
  LIST_CARD,
  LIST_CARD_CONTENT,
  FIELD_LABEL,
  TEXT_INPUT,
  TEXT_INPUT_SM,
  DROPDOWN_WRAPPER,
  DROPDOWN_BUTTON,
} from '../Mechanism/fieldStyles'
import { UnitDropdown } from '../Plots/UnitDropdown'
import { CONCENTRATION_UNITS, airDensityMolM3, toMolM3, fromMolM3 } from '../../utils/concentrationUnits'
import { EMPTY_ARRAY } from '../../utils/emptyArray'

// Matches EnvironmentTab: the left column fits its content, the right column expands.
const EDITOR_GRID = 'grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr] lg:items-start'

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
  const mechanismSpecies = useSelector(
    (state) => state.mechanism.config.mechanism?.species || EMPTY_ARRAY
  )

  const [newSpecies, setNewSpecies] = useState('')
  const [newConcentration, setNewConcentration] = useState('')
  const [concentrationUnitId, setConcentrationUnitId] = useState('mol_m3')
  const [selectedSpecies, setSelectedSpecies] = useState(new Set())
  const [justUpdatedSpecies, setJustUpdatedSpecies] = useState(null)
  const [rowDrafts, setRowDrafts] = useState({})
  const [speciesSearch, setSpeciesSearch] = useState('')
  const concentrationInputRef = useRef(null)

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

  const mechanismSpeciesNames = new Set(mechanismSpecies.map((species) => species.name))

  const airDensity = airDensityMolM3(initial.pressure, initial.temperature)

  // Species with no initial concentration default to 0,
  // which may be intentional but is worth flagging.
  const missingSpecies = mechanismSpecies
    .map((species) => species.name)
    .filter((name) => initial.concentrations[name] === undefined)

  const newSpeciesQuery = newSpecies.trim().toLowerCase()
  const visibleMissingSpecies = newSpeciesQuery
    ? missingSpecies.filter((name) => name.toLowerCase().includes(newSpeciesQuery))
    : missingSpecies

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

    if (!mechanismSpeciesNames.has(species)) {
      toast({
        title: 'Unknown Species',
        description: `"${species}" is not in the selected mechanism`,
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

    if (value < 0) {
      toast({
        title: 'Invalid Input',
        description: 'Concentration must be zero or greater',
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

    const unitLabel = CONCENTRATION_UNITS.find((u) => u.id === concentrationUnitId)?.label
    dispatch(setConcentration({ species, value: toMolM3(value, concentrationUnitId, airDensity) }))
    toast({
      title: 'Species Added',
      description: `Added ${species} at concentration ${value} ${unitLabel}`,
      variant: 'success',
    })
    setNewSpecies('')
    setNewConcentration('')
  }

  const handleSelectMissing = (species) => {
    setNewSpecies(species)
    concentrationInputRef.current?.focus()
  }

  const handleConcentrationChange = (species, value) => {
    setRowDrafts((prev) => ({ ...prev, [species]: value }))
  }

  // Brief visual confirmation that a row's edit was committed
  const flashUpdated = (species) => {
    setJustUpdatedSpecies(species)
    setTimeout(() => {
      setJustUpdatedSpecies((current) => (current === species ? null : current))
    }, 600)
  }

  const commitConcentration = (species, rawValue) => {
    const parsed = parseFloat(rawValue)
    if (isNaN(parsed) || parsed < 0) {
      toast({
        title: 'Invalid Input',
        description: 'Concentration must be a valid number zero or greater',
        variant: 'destructive',
      })
      return
    }
    dispatch(setConcentration({ species, value: toMolM3(parsed, concentrationUnitId, airDensity) }))
    setRowDrafts((prev) => {
      const next = { ...prev }
      delete next[species]
      return next
    })
    flashUpdated(species)
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

  const allVisibleSelected =
    visibleSpeciesEntries.length > 0 &&
    visibleSpeciesEntries.every(([species]) => selectedSpecies.has(species))

  const toggleSelectAll = () => {
    setSelectedSpecies((prev) => {
      const next = new Set(prev)
      visibleSpeciesEntries.forEach(([species]) => {
        if (allVisibleSelected) {
          next.delete(species)
        } else {
          next.add(species)
        }
      })
      return next
    })
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
      <Card className="w-[26rem]">
        <CardHeader>
          <CardTitle>Species concentration</CardTitle>
          <CardDescription className="whitespace-nowrap">
            Set initial concentrations for chemical species
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full">
            <label className={FIELD_LABEL}>Species</label>
            <input
              type="text"
              value={newSpecies}
              onChange={(e) => setNewSpecies(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  concentrationInputRef.current?.focus()
                }
              }}
              placeholder="Search or enter species name"
              className={TEXT_INPUT}
            />
          </div>

          {missingSpecies.length > 0 && (
            <div className="p-3 border border-border bg-surface-alt rounded-lg text-xs text-ink">
              <p className="font-semibold mb-1.5 text-center">
                {missingSpecies.length} not set, default to 0
              </p>
              {visibleMissingSpecies.length === 0 ? (
                <p className="text-muted">No matches for "{newSpecies.trim()}".</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {visibleMissingSpecies.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectMissing(name)}
                      className="px-2 py-0.5 rounded-full bg-white border border-border font-mono hover:bg-action hover:text-white hover:border-action transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="w-full">
            <label className={FIELD_LABEL}>Concentration</label>
            <div className="flex flex-col gap-2">
              <UnitDropdown
                unitId={concentrationUnitId}
                onChange={(id) => {
                  setConcentrationUnitId(id)
                  setRowDrafts({})
                }}
                units={CONCENTRATION_UNITS}
                wrapperClassName={DROPDOWN_WRAPPER}
                buttonClassName={DROPDOWN_BUTTON}
                centerLabel
              />
              <input
                ref={concentrationInputRef}
                type="text"
                inputMode="decimal"
                value={newConcentration}
                onChange={(e) => setNewConcentration(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAdd()
                  }
                }}
                placeholder="1e-8"
                className={TEXT_INPUT}
              />
            </div>
          </div>

          <div className="h-0.5" />
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleAdd}
              variant="assistSecondary"
              className="h-11 px-8 text-base rounded-lg bg-assist-secondary text-assist-secondary-foreground hover:bg-assist-secondary-hover">
              Add species
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={LIST_CARD}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{speciesEntries.length} species</CardTitle>
            </div>
            {/* Always mounted (just hidden) so the header's height never shifts when the
                first checkbox is checked */}
            <Button
              variant="glass"
              size="sm"
              onClick={handleRemoveSelected}
              className={`rounded-lg bg-white text-red-600 hover:bg-red-50 flex-shrink-0 ${
                selectedSpecies.size === 0 ? 'invisible' : ''
              }`}
            >
              Remove selected ({selectedSpecies.size})
            </Button>
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
              <table className="w-full table-fixed text-sm">
                <thead className="bg-assist-secondary text-assist-secondary-foreground">
                  <tr>
                    <th className="w-10 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all species"
                        className="accent-action"
                      />
                    </th>
                    <th className="w-1/2 text-left px-4 py-2 font-semibold">Species</th>
                    <th className="text-left px-4 py-2 font-semibold">
                      Concentration (
                      {CONCENTRATION_UNITS.find((u) => u.id === concentrationUnitId)?.label})
                    </th>
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
                          className="accent-action"
                        />
                      </td>
                      <td className="px-4 py-2 font-mono font-semibold">{species}</td>
                      <td className="px-4 py-2 font-mono">
                        <input
                          type="text"
                          value={
                            rowDrafts[species] ??
                            fromMolM3(concentration, concentrationUnitId, airDensity)
                          }
                          onChange={(e) => handleConcentrationChange(species, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              commitConcentration(species, e.target.value)
                              e.target.blur()
                            }
                          }}
                          onBlur={(e) => commitConcentration(species, e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-action transition-colors duration-300 ${
                            justUpdatedSpecies === species
                              ? 'border-action bg-assist-secondary'
                              : 'border-gray-300 bg-white'
                          }`}
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
    </div>
  )
}

export default SpeciesConcentrationTab
