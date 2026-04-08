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

  async function handleRunSimulation() {
    const mechanismLabel = mechanismData.currentExample?.name
      || mechanismData.currentExample?.mechanism_name
      || mechanismData.mechanism?.mechanism?.name
      || 'local'

    const buildSolverConditions = () => {
      const source = conditions.conditions || {};
      const { filepaths, ...sourceWithoutFilepaths } = source;

      // 1) If the example/config already contains valid inline blocks, use them as-is.
      // This is the correct path for bundled examples like Chapman.
      if (Array.isArray(source.data) && source.data.length > 0) {
        return {
          ...sourceWithoutFilepaths,
          data: source.data,
        };
      }

      // 2) Otherwise, fall back to rebuilding from the UI state.
      const reduxInitial = conditions.initial || {};
      const sourceInitial = source.initial || {};

      const initial = {
        temperature: sourceInitial.temperature ?? reduxInitial.temperature ?? 298.15,
        pressure: sourceInitial.pressure ?? reduxInitial.pressure ?? 101325,
        concentrations: {
          ...(reduxInitial.concentrations || {}),
          ...(sourceInitial.concentrations || {}),
        },
      };

      const rateConstants = {
        ...(conditions.rateConstants || {}),
        ...(source.rateConstants || {}),
      };

      const evolving = source.evolving || conditions.evolving || {};
      const additionalSeries = evolving.additionalSeries || {};

      const dataBlocks = [];

      // Initial block
      const initialHeaders = ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'];
      const initialRow = [0, initial.temperature, initial.pressure];

      Object.entries(initial.concentrations).forEach(([species, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          initialHeaders.push(`CONC.${species}.mol m-3`);
          initialRow.push(value);
        }
      });

      Object.entries(rateConstants).forEach(([name, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          initialHeaders.push(name);
          initialRow.push(value);
        }
      });

      dataBlocks.push({
        headers: initialHeaders,
        rows: [initialRow],
      });

      // Evolving block
      if (evolving.enabled && Array.isArray(evolving.times) && evolving.times.length > 0) {
        const evolvingHeaders = ['time.s'];

        if (Array.isArray(evolving.temperature) && evolving.temperature.length > 0) {
          evolvingHeaders.push('ENV.temperature.K');
        }

        if (Array.isArray(evolving.pressure) && evolving.pressure.length > 0) {
          evolvingHeaders.push('ENV.pressure.Pa');
        }

        const additionalHeaders = Object.keys(additionalSeries).filter((key) => {
          const arr = additionalSeries[key];
          return Array.isArray(arr) && arr.length > 0;
        });

        evolvingHeaders.push(...additionalHeaders);

        const evolvingRows = evolving.times.map((time, i) => {
          return evolvingHeaders.map((header) => {
            if (header === 'time.s') return time;
            if (header === 'ENV.temperature.K') {
              return evolving.temperature?.[i] ?? initial.temperature;
            }
            if (header === 'ENV.pressure.Pa') {
              return evolving.pressure?.[i] ?? initial.pressure;
            }
            if (Object.prototype.hasOwnProperty.call(additionalSeries, header)) {
              return additionalSeries[header]?.[i] ?? 0;
            }
            return 0;
          });
        });

        dataBlocks.push({
          headers: evolvingHeaders,
          rows: evolvingRows,
        });
      }

      return {
        ...sourceWithoutFilepaths,
        data: dataBlocks,
      };
    };


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

      if (serialized.type === 'LAMBDA_RATE') {
        serialized.type = 'LAMBDA_RATE_CONSTANT'
      }

      if (serialized.scalingFactor !== undefined && serialized['scaling factor'] === undefined) {
        serialized['scaling factor'] = serialized.scalingFactor
      }
      delete serialized.scalingFactor

      if (serialized.lambdaFunction !== undefined && serialized['lambda function'] === undefined) {
        serialized['lambda function'] = serialized.lambdaFunction
      }
      delete serialized.lambdaFunction

      // Lambda callbacks are registered by label "Lambda.<name>" in MUSICA.
      if (serialized.type === 'LAMBDA_RATE_CONSTANT' && (!serialized.name || !String(serialized.name).trim())) {
        const lhs = Array.isArray(serialized.reactants)
          ? serialized.reactants
              .map((component) => component?.['species name'] || component?.name)
              .filter(Boolean)
              .join('_')
          : 'rxn'
        const rhs = Array.isArray(serialized.products)
          ? serialized.products
              .map((component) => component?.['species name'] || component?.name)
              .filter(Boolean)
              .join('_')
          : 'prod'
        serialized.name = `${lhs}_to_${rhs}`
      }

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
        "species": species.map(sp => {
          const { ["molecular weight [kg mol-1]"]: _omit, ...rest } = sp;
          return {
            ...rest,
            "is third body": Object.prototype.hasOwnProperty.call(rest, 'is third body') ? rest['is third body'] : false
          };
        }),
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
    const rawResults = await MusicBox.fromJson(finalMechanism).solve()
    const normalizedResults = normalizeManualResults(rawResults)
    console.log('Results from final mechanism config:', rawResults);

    if (normalizedResults.length > 0) {
      dispatch(setResults(normalizedResults))
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

  // Allow running whenever an actual mechanism payload is present.
  // selectedMechanism may be null for some loaded examples.
  const sourceMechanism = mechanismData.mechanism?.mechanism || {}
  const payloadSpeciesCount = mechanismData.species.length > 0
    ? mechanismData.species.length
    : Array.isArray(sourceMechanism.species) ? sourceMechanism.species.length : 0
  const payloadReactionCount = mechanismData.reactions.length > 0
    ? mechanismData.reactions.length
    : Array.isArray(sourceMechanism.reactions) ? sourceMechanism.reactions.length : 0
  const hasValidMechanism = payloadSpeciesCount > 0 && payloadReactionCount > 0

  const isPredefinedMechanism = mechanism && mechanism !== 'custom'
  const isCustomMechanism = mechanism === 'custom'
  const isDisabled = simulation.status === 'running' || !hasValidMechanism

  // Generate helpful tooltip message
  const getTooltip = () => {
    if (simulation.status === 'running') return 'Simulation is currently running...'
    if (payloadSpeciesCount === 0) return 'Add or load species to run simulation'
    if (payloadReactionCount === 0) return 'Add or load reactions to run simulation'
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
