import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { runSimulation, setResults, setStatus, setMetadata, setError } from '../redux/slices/simulationSlice'
import { Loader2, Play } from 'lucide-react'
import { MusicBox } from '@ncar/music-box';
import c5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' };
import { setSpecies } from '../redux/slices/mechanismSlice'
import { useState } from 'react';

/**
 * RunSimulationButton Component
 * Compact button to run simulations from any page
 */
export function RunSimulationButton({ className = '' }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const simulation = useSelector((state) => state.simulation)
  const mechanism = useSelector((state) => state.mechanism.selectedMechanism)
  const mechanismData = useSelector((state) => state.mechanism)
  const currentExample = useSelector((state) => state.mechanism.currentExample)
  const conditions = useSelector((state) => state.conditions)
  const loadedExample = useSelector((state) => state.conditions.exampleLoaded)

  // For testing purposes this just downloads a json file to device
  const downloadJSON = (data) => {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json'; // filename
    a.click();

    URL.revokeObjectURL(url);
  };

  async function handleRunSimulation() {
    function getSpeciesNamesFromReactions(reactions) {
      const names = new Set();

      for (const reaction of reactions || []) {
        for (const reactant of reaction.reactants || []) {
          if (reactant["species name"]) {
            names.add(reactant["species name"]);
          }
        }

        for (const product of reaction.products || []) {
          if (product["species name"]) {
            names.add(product["species name"]);
          }
        }
      }

      return names;
    }

    function getSpeciesNamesFromConditions(conditions) {
      const names = new Set();

      if (conditions?.initial?.concentrations) {
        for (const name of Object.keys(conditions.initial.concentrations)) {
          names.add(name);
        }
      }

      if (conditions?.conditions?.data) {
        for (const block of conditions.conditions.data) {
          for (const header of block.headers || []) {
            if (header.startsWith("CONC.") && header.endsWith(".mol m-3")) {
              const speciesName = header
                .replace("CONC.", "")
                .replace(".mol m-3", "");
              names.add(speciesName);
            }
          }
        }
      }

      return names;
    }


    const finalMechanism = {
      "box model options": {
        "grid": "box",
        "chemistry time step [sec]": conditions.basic.timeStep,
        "output time step [sec]": conditions.basic.outputFrequency,
        "simulation length [sec]": conditions.basic.duration
      },

      "conditions": conditions.conditions,

      "mechanism": {
        "name": mechanismData.currentExample,
        "reactions": mechanismData.reactions.map(reaction => ({
          type: reaction.type,
          A: reaction.A,
          B: reaction.B,
          C: reaction.C,
          D: reaction.D,
          E: reaction.E,
          reactants: reaction.reactants.map(reactant => ({
            "species name": reactant["species name"],
            coefficient: reactant.coefficient
          })),
          products: reaction.products.map(product => ({
            "species name": product["species name"],
            coefficient: product.coefficient
          })),
          "gas phase": reaction["gas phase"]
        })),
        "species": mechanismData.species.map(species => ({
          name: species.name
        })),
        "phases": [
          {
            "name": "gas",
            "species": mechanismData.species.map(species => ({
              name: species.name
            }))
          }
        ],
        "version": "1.0.0"
      }
    };

    // console.log('Final mechanism config:', finalMechanism);
    // const box = MusicBox.fromJson(finalMechanism);
    // const results = await box.solve();
    // console.log('Results from final mechanism config:', results);

    console.log('Final mechanism config:', c5Config);
    const box = MusicBox.fromJson(c5Config);
    const results = await box.solve();
    console.log('Results from final mechanism config:', results);

    dispatch(setResults(results))
    dispatch(setMetadata({
      mechanism: mechanismData.currentExample || mechanismData.mechanism?.mechanism?.name || 'local',
      duration: conditions.basic.duration || 0,
    }))
    dispatch(setStatus('succeeded'))
    navigate('/plots')

    const normalizedResults = normalizeManualResults(results);

    if (normalizedResults.length > 0) {
      dispatch(setResults(normalizedResults))
      dispatch(setMetadata({
        mechanism: mechanismData.currentExample || mechanismData.mechanism?.mechanism?.name || 'local',
        duration: conditions.basic.duration || 0,
      }))
      dispatch(setStatus('succeeded'))
      navigate('/plots')
    } else {
      console.error('No valid results after normalization')
    }
  }

  const normalizeManualResults = (raw) => {
    // Handle new format: { columns: [...], data: { columnName: [...] } }
    if (raw && typeof raw === 'object' && raw.columns && raw.data) {
      const { columns, data } = raw
      const timeColumn = columns[0] // Assume first column is time
      const speciesColumns = columns.slice(1)
      
      if (!data[timeColumn] || !Array.isArray(data[timeColumn])) {
        return []
      }
      
      const timeValues = data[timeColumn]
      const normalized = timeValues.map((time, index) => {
        const concentrations = {}
        speciesColumns.forEach(col => {
          const values = data[col]
          if (Array.isArray(values) && values[index] !== undefined) {
            concentrations[col] = values[index]
          }
        })
        return {
          time: time,
          concentrations: concentrations,
        }
      })
      return normalized
    }

    // Handle existing formats
    const points = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : []
    if (points.length === 0) return []

    const normalized = points
      .map((point, i) => {
        if (!point || typeof point !== 'object') return null

        // If already in expected shape
        if (point.concentrations && typeof point.concentrations === 'object') {
          return {
            time: point.time ?? point.timestamp ?? i,
            concentrations: point.concentrations,
          }
        }

        // Convert from flat species keys (all numeric values except time)
        const outConcentrations = {}
        Object.entries(point).forEach(([key, value]) => {
          if (key === 'time' || key === 'timestamp' || key === 'date') return
          if (key === 'concentrations') return

          // accept numbers or single-value arrays
          if (typeof value === 'number') {
            outConcentrations[key] = value
          } else if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'number') {
            outConcentrations[key] = value[0]
          }
        })

        if (Object.keys(outConcentrations).length > 0) {
          return {
            time: point.time ?? point.timestamp ?? i,
            concentrations: outConcentrations,
          }
        }

        return null
      })
      .filter((pt) => pt !== null)

    return normalized
  }

  // Check if we have a valid mechanism configuration
  // For predefined mechanisms: need example loaded
  // For custom mechanisms: need at least 1 species and 1 reaction
  const isPredefinedMechanism = mechanism && mechanism !== 'custom'
  const isCustomMechanism = mechanism === 'custom'

  const hasValidPredefined = isPredefinedMechanism && currentExample && currentExample.id
  const hasValidCustom = isCustomMechanism && mechanismData.species.length > 0 && mechanismData.reactions.length > 0

  const hasValidMechanism = hasValidPredefined || hasValidCustom
  // const isDisabled = simulation.status === 'running' || !hasValidMechanism
  const isDisabled = loadedExample;

  // Generate helpful tooltip message
  const getTooltip = () => {
    if (simulation.status === 'running') return 'Simulation is currently running...'
    if (isCustomMechanism && mechanismData.species.length === 0) return 'Add at least 1 species to run simulation'
    if (isCustomMechanism && mechanismData.reactions.length === 0) return 'Add at least 1 reaction to run simulation'
    if (isPredefinedMechanism && !currentExample) return 'Please select an example mechanism'
    return 'Run atmospheric chemistry simulation'
  }

  return (
    <Button
      onClick={handleRunSimulation}
      disabled={isDisabled}
      variant="apple"
      size="lg"
      className={`rounded-2xl mt-2 mb-2 ${className}`}
      title={getTooltip()}
    >
      {simulation.status === 'running' ? (
        <>
          <Loader2 className="w-full h-4 mr-2 animate-spin" />
          Running...
        </>
      ) : (
        <>
          <Play className="w-full h-4 mr-2" />
          Run Simulation
        </>
      )}
    </Button>
  )
}

export default RunSimulationButton
