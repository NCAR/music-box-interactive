import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { setResults, setStatus, setMetadata } from '../redux/slices/simulationSlice'
import { Loader2, Play } from 'lucide-react'
import { MusicBox } from '@ncar/music-box';

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

  async function handleRunSimulation() {
    const mechanismLabel = mechanismData.currentExample?.name
      || mechanismData.currentExample?.mechanism_name
      || mechanismData.mechanism?.mechanism?.name
      || 'local'

    function downloadJSON(data, filename = "data.json") {
      // Convert object to JSON string
      const jsonString = JSON.stringify(data, null, 2);

      // Create a blob
      const blob = new Blob([jsonString], { type: "application/json" });

      // Create a temporary URL
      const url = URL.createObjectURL(blob);

      // Create a temporary anchor element
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }


    const buildSolverConditions = () => {
      const source = conditions.conditions || {}
      const { filepaths, ...sourceWithoutFilepaths } = source

      const reduxInitial = conditions.initial || {}
      const sourceInitial = source.initial || {}
      const initial = {
        temperature: sourceInitial.temperature ?? reduxInitial.temperature,
        pressure: sourceInitial.pressure ?? reduxInitial.pressure,
        concentrations: {
          ...(reduxInitial.concentrations || {}),
          ...(sourceInitial.concentrations || {}),
        },
      }

      const rateConstants = {
        ...(conditions.rateConstants || {}),
        ...(source.rateConstants || {}),
      }

      const evolving = source.evolving || conditions.evolving || {}

      const initialHeaders = ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa']
      const initialRow = [
        0,
        initial.temperature ?? 298.15,
        initial.pressure ?? 101325,
      ]

      Object.entries(initial.concentrations || {}).forEach(([species, value]) => {
        initialHeaders.push(`CONC.${species}.mol m-3`)
        initialRow.push(value)
      })

      Object.entries(rateConstants).forEach(([name, value]) => {
        initialHeaders.push(name)
        initialRow.push(value)
      })

      const blocks = [{ headers: initialHeaders, rows: [initialRow] }]

      if (evolving.enabled && Array.isArray(evolving.times) && evolving.times.length > 0) {
        const additionalSeries = evolving.additionalSeries || {}
        const additionalHeaders = Object.keys(additionalSeries)

        const envHeaders = ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa', ...additionalHeaders]
        const envRows = evolving.times.map((time, i) => [
          time,
          evolving.temperature?.[i] ?? initial.temperature ?? 298.15,
          evolving.pressure?.[i] ?? initial.pressure ?? 101325,
          ...additionalHeaders.map((header) => additionalSeries[header]?.[i] ?? null),
        ])
        blocks.push({ headers: envHeaders, rows: envRows })
      }

      return {
        ...sourceWithoutFilepaths,
        data: blocks,
      }
    }

    const normalizeReactionComponents = (components = []) => {
      return (components || []).map((component) => {
        if (!component || typeof component !== 'object') return component

        if (component['species name'] || !component.name) {
          return component
        }

        const { name, ...rest } = component
        return {
          ...rest,
          'species name': name,
        }
      })
    }

    function serializeReaction(reaction) {
      if (!reaction || typeof reaction !== 'object') {
        return reaction
      }

      const { id, ...serialized } = reaction

      if (serialized.type === 'SURFACE_REACTION') {
        serialized.type = 'SURFACE'
      }

      if (serialized.type === 'BRANCHED') {
        serialized.type = 'BRANCHED_NO_RO2'
      }

      if (serialized.scalingFactor !== undefined && serialized['scaling factor'] === undefined) {
        serialized['scaling factor'] = serialized.scalingFactor
      }
      delete serialized.scalingFactor

      if (serialized.reactants) {
        serialized.reactants = normalizeReactionComponents(serialized.reactants)
      }

      if (serialized.products) {
        serialized.products = normalizeReactionComponents(serialized.products)
      }

      if (serialized['gas-phase products']) {
        serialized['gas-phase products'] = normalizeReactionComponents(serialized['gas-phase products'])
      }

      if (serialized['alkoxy products']) {
        serialized['alkoxy products'] = normalizeReactionComponents(serialized['alkoxy products'])
      }

      if (serialized['nitrate products']) {
        serialized['nitrate products'] = normalizeReactionComponents(serialized['nitrate products'])
      }

      // UI surface reactions are authored as reactants/products; v1 expects gas-phase fields.
      if (serialized.type === 'SURFACE') {
        if (serialized['gas-phase species'] === undefined && Array.isArray(serialized.reactants) && serialized.reactants.length > 0) {
          const firstReactant = serialized.reactants[0]
          serialized['gas-phase species'] = firstReactant?.['species name'] || firstReactant?.name || firstReactant
        }

        if (!serialized['gas-phase products'] && Array.isArray(serialized.products)) {
          serialized['gas-phase products'] = normalizeReactionComponents(serialized.products)
        }

        delete serialized.reactants
        delete serialized.products
      }

      return serialized
    }

    const serializeSpecies = (species) => {
      if (!species || typeof species !== 'object') {
        return species
      }

      const { id, molecular_weight_kg_mol, properties, ...serialized } = species

      if (serialized['molecular weight [kg mol-1]'] === undefined && molecular_weight_kg_mol !== undefined) {
        serialized['molecular weight [kg mol-1]'] = molecular_weight_kg_mol
      }

      return serialized
    }

    const sourceMechanism = mechanismData.mechanism?.mechanism || {}
    const species = mechanismData.species.length > 0
      ? mechanismData.species.map(serializeSpecies)
      : (sourceMechanism.species || []).map(serializeSpecies)

    let reactions = mechanismData.reactions.length > 0
      ? mechanismData.reactions.map(serializeReaction)
      : (sourceMechanism.reactions || []).map(serializeReaction)



    // Track the actual new product species names and their corresponding CONC keys
    const productSpeciesToAdd = [];
    const productConcentrationKeys = [];
    reactions.forEach((reaction) => {
      let prodName = '';
      if (typeof reaction.name === 'string' && reaction.name.length > 0) {
        prodName = reaction.name.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '').toUpperCase();
      } else {
        prodName = 'REACT_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      }
      if (Array.isArray(reaction.products)) {
        reaction.products.push({ 'species name': prodName, coefficient: 1 });
        productSpeciesToAdd.push(prodName);
        // Track the expected concentration key for this species
        productConcentrationKeys.push(`CONC.${prodName}.mol m-3`);
      }
    });

    // Add new product species to species array if not already present
    productSpeciesToAdd.forEach((prodName) => {
      if (!species.some((sp) => sp.name === prodName)) {
        species.push({ name: prodName, 'molecular weight [kg mol-1]': 0.029 });
      }
    });


    let phases = [];
    if (Array.isArray(sourceMechanism.phases) && sourceMechanism.phases.length > 0) {
      // Deep copy to avoid mutating the original
      phases = sourceMechanism.phases.map(phase => ({
        ...phase,
        species: Array.isArray(phase.species)
          ? [
              ...phase.species.filter(
                (sp) => species.some((s) => s.name === (sp.name || sp))
              ),
              ...species
                .filter((sp) =>
                  !phase.species.some((s) => (s.name || s) === sp.name)
                )
                .map((sp) => ({ name: sp.name }))
            ]
          : species.map((sp) => ({ name: sp.name })),
      }));
    } else {
      phases = [
        {
          name: 'gas',
          species: species.map((sp) => ({ name: sp.name })),
        },
      ];
    }

    const finalMechanism = {
      "box model options": {
        "grid": "box",
        "chemistry time step [sec]": conditions.basic.timeStep,
        "output time step [sec]": conditions.basic.outputFrequency,
        "simulation length [sec]": conditions.basic.duration
      },

      "conditions": buildSolverConditions(),

      "mechanism": {
        ...sourceMechanism,
        "name": sourceMechanism.name || mechanismData.currentExample?.name || mechanismData.currentExample || 'custom',
        "reactions": reactions,
        "species": species,
        "phases": phases,
        "version": sourceMechanism.version || '1.0.0'
      }
    };

    if (!finalMechanism.mechanism || !Array.isArray(finalMechanism.mechanism.species) || !Array.isArray(finalMechanism.mechanism.reactions)) {
      throw new Error('Invalid mechanism payload: expected mechanism.species[] and mechanism.reactions[] before solve()')
    }

    if (!Array.isArray(finalMechanism.conditions?.data) || finalMechanism.conditions.data.length === 0) {
      throw new Error('Invalid conditions payload: expected conditions.data[] with at least one block')
    }

    console.log('Final mechanism config:', finalMechanism);
    const box = MusicBox.fromJson(finalMechanism);
    const results = await box.solve();
    console.log('Results from final mechanism config:', results);
    // downloadJSON(finalMechanism, 'final_mechanism.json')

    dispatch(setResults(results))
    dispatch(setMetadata({
      mechanism: mechanismLabel,
      duration: conditions.basic.duration || 0,
    }))
    dispatch(setStatus('succeeded'))
    navigate('/plots')


    // Exclude new product species (from reaction names) from results before plotting, using the actual CONC keys
    const excludeConcentrationKeys = new Set(productConcentrationKeys);

    // Filters
    const normalizedPoints = normalizeManualResults(results);
    const filteredResults = [];
    const excludedResults = [];
    for (const point of normalizedPoints) {
      if (!point || typeof point !== 'object' || !point.concentrations) {
        filteredResults.push(point);
        excludedResults.push({});
        continue;
      }
      const filteredConcentrations = {};
      const excludedConcentrations = {};
      for (const [key, value] of Object.entries(point.concentrations)) {
        if (excludeConcentrationKeys.has(key)) {
          excludedConcentrations[key] = value;
        } else {
          filteredConcentrations[key] = value;
        }
      }
      filteredResults.push({ ...point, concentrations: filteredConcentrations });
      excludedResults.push({ time: point.time, concentrations: excludedConcentrations });
    }

    if (filteredResults.length > 0) {
      dispatch(setResults(filteredResults))
      dispatch(setMetadata({
        mechanism: mechanismLabel,
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
