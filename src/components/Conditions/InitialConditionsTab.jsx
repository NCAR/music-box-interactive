import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Lightbulb, Plus } from 'lucide-react'
import { hydrateInitialConditions } from '../../utils/hydrateConditions'
import {
  setTemperature,
  setPressure,
  setConcentrations,
  setRateConstants,
  setConcentration,
  removeConcentration,
  markInitialHydrated,
} from '../../redux/slices/conditionsSlice'
import { useToast } from '@/hooks/use-toast'

/**
 * InitialConditionsTab Component
 * Manages initial species concentrations
 */
export function InitialConditionsTab() {
  const dispatch = useDispatch()
  const { toast } = useToast()
  const initial = useSelector((state) => state.conditions.initial)
  const conditions = useSelector((state) => state.conditions.conditions)
  const hydratedExampleId = useSelector((state) => state.conditions.hydration.initialExampleId)
  const currentExample = useSelector((state) => state.mechanism.currentExample)
  const selectedMechanism = useSelector((state) => state.mechanism.selectedMechanism)

  const [newSpecies, setNewSpecies] = useState('')
  const [newConcentration, setNewConcentration] = useState('')
  const [error, setError] = useState(null)

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

  const handleAddSpecies = () => {
    if (!newSpecies || !newConcentration) {
      setError('Please enter both species name and concentration')
      setTimeout(() => setError(null), 3000)
      toast({
        title: 'Error',
        description: 'Please enter both species name and concentration',
        variant: 'destructive',
      })
      return
    }

    // Automatically convert species name to uppercase to match mechanism species
    const normalizedSpecies = newSpecies.trim()

    const value = parseFloat(newConcentration)
    if (isNaN(value)) {
      setError('Concentration must be a valid number')
      setTimeout(() => setError(null), 3000)
      toast({
        title: 'Error',
        description: 'Concentration must be a valid number',
        variant: 'destructive',
      })
      return
    }

    if (initial.concentrations[normalizedSpecies]) {
      setError(`Species "${normalizedSpecies}" already exists`)
      setTimeout(() => setError(null), 3000)
      toast({
        title: 'Error',
        description: `Species "${normalizedSpecies}" already exists`,
        variant: 'destructive',
      })
      return
    }

    dispatch(setConcentration({ species: normalizedSpecies, value }))
    toast({
      title: 'Species Added',
      description: `Successfully added ${normalizedSpecies} with concentration ${value}`,
      variant: 'success',
    })
    setNewSpecies('')
    setNewConcentration('')
  }

  const handleRemoveSpecies = (species) => {
    dispatch(removeConcentration(species))
    toast({
      title: 'Species Removed',
      description: `Removed ${species} from initial concentrations`,
      variant: 'delete',
    })
  }

  const handleConcentrationChange = (species, value) => {
    const parsed = parseFloat(value)
    if (!isNaN(parsed)) {
      dispatch(setConcentration({ species, value: parsed }))
    }
  }

  return (
    <div className="space-y-4">
      {/* Species Concentrations */}
      <Card>
        <CardHeader>
          <CardTitle>Species Concentrations</CardTitle>
          <CardDescription>Set initial concentrations for chemical species</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Species */}
          <div className="p-4 backdrop-blur-lg rounded-xl border-2 border-border">
            <h4 className="font-bold text-sm mb-3 text-ink flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Species
            </h4>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-xs">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Species name (e.g., OH, NO3)"
                value={newSpecies}
                onChange={(e) => setNewSpecies(e.target.value)}
                className="px-3 py-2 border-2 border-border bg-white text-ink placeholder:text-muted rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Concentration (e.g., 1e-8)"
                value={newConcentration}
                onChange={(e) => setNewConcentration(e.target.value)}
                className="px-3 py-2 border-2 border-border bg-white text-ink placeholder:text-muted rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent"
              />
            </div>

            <Button onClick={handleAddSpecies} variant="primary" size="default" className="mt-3">
              Add Species
            </Button>
          </div>

          {/* Existing Species List */}
          <div className="space-y-2">
            {Object.entries(initial.concentrations).length === 0 ? (
              <p className="text-center text-muted py-8">
                No species configured. Add species above.
              </p>
            ) : (
              Object.entries(initial.concentrations).map(([species, concentration]) => (
                <div
                  key={species}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg bg-surface-alt hover:bg-surface-hover transition-colors"
                >
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-ink mb-1">
                      {species}
                    </label>
                    <input
                      type="text"
                      value={concentration}
                      onChange={(e) => handleConcentrationChange(species, e.target.value)}
                      className="w-full px-2 py-1 border border-border bg-white text-ink placeholder:text-muted rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-action"
                    />
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveSpecies(species)}>
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-surface-alt backdrop-blur-lg border border-border rounded-lg p-3 text-xs text-ink">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Tips:
        </p>
        <ul className="space-y-0.5 ml-4">
          <li>• Use scientific notation for small values (e.g., 1e-8)</li>
          <li>• Concentrations are in mol/mol (mixing ratio)</li>
          <li>
            • Species must exist in the selected mechanism
            {selectedMechanism ? `: ${selectedMechanism}` : ''}
          </li>
        </ul>
      </div>
    </div>
  )
}

export default InitialConditionsTab
