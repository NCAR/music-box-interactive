import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { addSpecies, updateSpecies, removeSpecies } from '../../redux/slices/mechanismSlice'
import { useToast } from '@/hooks/use-toast'
import { Info, Plus, Atom, Lightbulb } from 'lucide-react'
import { addSpeciesIfValid } from './speciesUtils'

// visual editor for species in the mechanism
export function SpeciesEditor() {
  const dispatch = useDispatch()
  const species = useSelector((state) => state.mechanism.species)
  const selectedMechanism = useSelector((state) => state.mechanism.selectedMechanism)
  const { toast } = useToast()

  const [newSpeciesName, setNewSpeciesName] = useState('')
  const [newMolWeight, setNewMolWeight] = useState('')
  const [newDiffusionCoefficient, setNewDiffusionCoefficient] = useState('')
  const [newSpeciesPhase, setNewSpeciesPhase] = useState('Gas')
  const [speciesSearch, setSpeciesSearch] = useState('')
  // Filtered and sorted species list based on search
  const filteredSpecies = species
    .filter((sp) => sp.name.toLowerCase().includes(speciesSearch.toLowerCase()))
    .sort((a, b) => {
      const search = speciesSearch.trim().toLowerCase()
      if (!search) return 0
      const aExact = a.name.toLowerCase() === search
      const bExact = b.name.toLowerCase() === search
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
      newMolWeight,
      newDiffusionCoefficient,
      newSpeciesPhase,
      dispatch,
      toast,
      addSpecies,
    })

    if (added) {
      setNewSpeciesName('')
      setNewMolWeight('')
      setNewDiffusionCoefficient('')
      setNewSpeciesPhase('Gas')
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

  const handleDiffusionCoefficientSave = (speciesName, rawValue) => {
    const existingSpecies = species.find((sp) => sp.name === speciesName)

    if (!existingSpecies) {
      return
    }

    const trimmedValue = rawValue.trim()
    const updatedSpecies = { ...existingSpecies }

    if (!trimmedValue) {
      delete updatedSpecies['diffusion coefficient [m2 s-1]']
      dispatch(updateSpecies(updatedSpecies))
      return
    }

    const parsedValue = Number.parseFloat(trimmedValue)

    if (Number.isNaN(parsedValue)) {
      toast({
        title: 'Error',
        description: 'Diffusion coefficient must be a valid number',
        variant: 'destructive',
      })
      return
    }

    updatedSpecies['diffusion coefficient [m2 s-1]'] = parsedValue
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
                <div className="text-sm text-gray-300">Species Count</div>
                <div className="text-2xl font-bold text-blue-600">{isPredefined.species}</div>
              </div>
              <div className="bg-white/0 backdrop-blur-lg rounded-lg p-3 border border-white/20">
                <div className="text-sm text-gray-300">Reactions Count</div>
                <div className="text-2xl font-bold text-blue-600">{isPredefined.reactions}</div>
              </div>
            </div>
            <div className="bg-white/0 backdrop-blur-lg border border-white/20 rounded-lg p-3 text-sm text-gray-300">
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

      <Card>
        <CardHeader>
          <CardTitle>Species Editor</CardTitle>
          <CardDescription>
            {isPredefined
              ? `Viewing ${isPredefined.name} mechanism - species are pre-configured`
              : 'Add, edit, or remove chemical species in the mechanism'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
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

          {/* Add New Species Form (shown for all mechanisms) */}
          <div className="p-4 bg-white/0 backdrop-blur-lg rounded-xl border-2 border-white/20">
            <h4 className="font-bold text-sm mb-3 text-blue-100 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Species
            </h4>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-blue-100 mb-1">
                  Species Name
                </label>
                <input
                  type="text"
                  value={newSpeciesName}
                  onChange={(e) => setNewSpeciesName(e.target.value)}
                  placeholder="e.g., OH, NO2, O3"
                  className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-100 mb-1">
                  Molecular Weight (optional)
                </label>
                <input
                  type="text"
                  value={newMolWeight}
                  onChange={(e) => setNewMolWeight(e.target.value)}
                  placeholder="Leave empty for default (0.029 kg/mol)"
                  className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-100 mb-1">
                  Diffusion Coefficient (optional, m2/s)
                </label>
                <input
                  type="text"
                  value={newDiffusionCoefficient}
                  onChange={(e) => setNewDiffusionCoefficient(e.target.value)}
                  placeholder="e.g., 1e-5"
                  className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-100 mb-1">
                  Species Phase
                </label>
                <select
                  value={newSpeciesPhase}
                  onChange={(e) => setNewSpeciesPhase(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-white/30 bg-white/10 text-white rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Gas" className="text-black">
                    Gas
                  </option>
                  <option value="Aqueous" className="text-black">
                    Aqueous
                  </option>
                  <option value="Surface" className="text-black">
                    Surface
                  </option>
                </select>
              </div>
            </div>

            <Button
              onClick={handleAddSpecies}
              variant="secondary"
              size="default"
              className="mt-3 rounded-2xl"
            >
              Add Species
            </Button>
          </div>

          {/* Species List with Search */}
          <div>
            <h4 className="font-semibold text-sm mb-2">
              {isPredefined
                ? `${isPredefined.name} Mechanism Species (${isPredefined.species} pre-configured${species.length > 0 ? ` + ${species.length} custom` : ''})`
                : `Species List (${species.length} total)`}
            </h4>

            {/* Search Bar */}
            <input
              type="text"
              value={speciesSearch}
              onChange={(e) => setSpeciesSearch(e.target.value)}
              placeholder="Search species by name"
              className="w-full mb-3 px-3 py-2 border-2 border-white/30 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />

            {isPredefined && species.length === 0 ? (
              <div className="text-center py-8 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20">
                <div className="flex justify-center mb-2">
                  <Atom className="w-16 h-16" />
                </div>
                <p className="text-blue-100 font-medium mb-1">
                  {isPredefined.species} species are pre-configured in this mechanism
                </p>
                <p className="text-xs text-gray-400 mb-2">
                  Species definitions are loaded from the mechanism config file
                </p>
                <p className="text-xs text-blue-300">
                  Add custom species above to extend the mechanism
                </p>
              </div>
            ) : isPredefined && species.length > 0 ? (
              <div>
                <div className="text-center py-4 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 mb-3">
                  <p className="text-blue-100 font-medium text-sm mb-1">
                    {isPredefined.species} pre-configured + {species.length} custom species
                  </p>
                  <p className="text-xs text-gray-400">Custom species shown below</p>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredSpecies.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No matching species found.</p>
                  ) : (
                    filteredSpecies.map((sp) => (
                      <div
                        key={sp.name}
                        className="flex items-center justify-between p-3 border border-white/20 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h5 className="font-semibold text-sm">{sp.name}</h5>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] uppercase tracking-wide text-blue-100">
                                Phase
                              </span>
                              <select
                                value={sp.phase || 'Gas'}
                                onChange={(e) => handlePhaseSave(sp.name, e.target.value)}
                                className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                              >
                                <option value="Gas" className="text-black">
                                  Gas
                                </option>
                                <option value="Aqueous" className="text-black">
                                  Aqueous
                                </option>
                                <option value="Surface" className="text-black">
                                  Surface
                                </option>
                              </select>
                            </div>
                          </div>
                          <p className="text-xs text-gray-300">
                            MW: {sp.molecular_weight_kg_mol} kg/mol
                          </p>
                          <div className="mt-2 flex flex-col gap-1">
                            <label className="text-[11px] uppercase tracking-wide text-gray-300">
                              Diffusion Coefficient (m2/s)
                            </label>
                            <input
                              type="text"
                              defaultValue={sp['diffusion coefficient [m2 s-1]'] ?? ''}
                              onBlur={(e) =>
                                handleDiffusionCoefficientSave(sp.name, e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur()
                                }
                              }}
                              placeholder="e.g., 1e-5"
                              className="w-full max-w-xs px-3 py-2 border-2 border-white/20 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                          </div>
                        </div>

                        <Button
                          variant="glass"
                          size="sm"
                          onClick={() => handleRemoveSpecies(sp.name)}
                          className="rounded-lg text-red-600 hover:bg-red-900/20 backdrop-blur-lg"
                        >
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : species.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No species defined. Add your first species above.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredSpecies.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No matching species found.</p>
                ) : (
                  filteredSpecies.map((sp) => (
                    <div
                      key={sp.name}
                      className="flex items-center justify-between p-3 border border-white/20 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h5 className="font-semibold text-sm">{sp.name}</h5>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] uppercase tracking-wide text-blue-100">
                              Phase
                            </span>
                            <select
                              value={sp.phase || 'Gas'}
                              onChange={(e) => handlePhaseSave(sp.name, e.target.value)}
                              className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                              <option value="Gas" className="text-black">
                                Gas
                              </option>
                              <option value="Aqueous" className="text-black">
                                Aqueous
                              </option>
                              <option value="Surface" className="text-black">
                                Surface
                              </option>
                            </select>
                          </div>
                        </div>
                        <p className="text-xs text-gray-300">
                          MW: {sp.molecular_weight_kg_mol} kg/mol
                        </p>
                        <div className="mt-2 flex flex-col gap-1">
                          <label className="text-[11px] uppercase tracking-wide text-gray-300">
                            Diffusion Coefficient (m2/s)
                          </label>
                          <input
                            type="text"
                            defaultValue={sp['diffusion coefficient [m2 s-1]'] ?? ''}
                            onBlur={(e) => handleDiffusionCoefficientSave(sp.name, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                            placeholder="e.g., 1e-5"
                            className="w-full max-w-xs px-3 py-2 border-2 border-white/20 bg-white/10 text-white placeholder:text-gray-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => handleRemoveSpecies(sp.name)}
                        className="rounded-lg text-red-600 hover:bg-red-900/20 backdrop-blur-lg"
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-3 text-xs text-gray-300">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Species Editor Notes:
        </p>
        <ul className="space-y-0.5 ml-4">
          <li>• Species names must be unique within the mechanism</li>
          <li>• Species in this editor are treated as gas phase</li>
          <li>• Molecular weight is in kg/mol (e.g., O2 = 0.032 kg/mol)</li>
          <li>• Diffusion coefficient is editable in m2/s</li>
          <li>• Removing a species will also remove it from all reactions</li>
          <li>• Common atmospheric species: M (air), O2, N2, H2O, CO2</li>
        </ul>
      </div>
    </div>
  )
}

export default SpeciesEditor
