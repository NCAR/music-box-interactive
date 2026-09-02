import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { setCurrentExample, setSelectedMechanism } from '../redux/slices/mechanismSlice'

import { addSpecies, addReaction, setMechanism } from '../redux/slices/mechanismSlice'
import {
  setDuration,
  setTimeStep,
  setOutputFrequency,
  setConditions,
  setExampleFiles,
  setExampleLoaded,
  setSourceFile,
} from '../redux/slices/conditionsSlice'
import { v4 as uuidv4 } from 'uuid'

import { resetMechanism } from '../redux/slices/mechanismSlice'
import { resetConditions } from '../redux/slices/conditionsSlice'
import { resetSimulation } from '../redux/slices/simulationSlice'

import { parseCsvToBlock } from '@ncar/music-box'
import { buildGeneratedReactionName } from './Mechanism/reactions/reactionUtils'
import {
  PHASE_PROPERTY_KEYS,
  SPECIES_PROPERTY_KEYS,
  pickDeclared,
} from '../services/simulation/local/speciesProperties'

import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' }
import analyticalConfig from '@ncar/music-box/examples/analytical/my_config.json' with { type: 'json' }
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' }
import flowTubeConfig from '@ncar/music-box/examples/flow_tube/my_config.json' with { type: 'json' }
import carbonBond5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' }
import chapmanInitialConcentrationsCsv from '@ncar/music-box/examples/chapman/initial_concentrations.csv?raw'
import chapmanConditionsBoulderCsv from '@ncar/music-box/examples/chapman/conditions_Boulder.csv?raw'
import ts1InitialConditionsCsv from '@ncar/music-box/examples/ts1/initial_conditions.csv?raw'
import flowTubeInitialConcentrationsCsv from '@ncar/music-box/examples/flow_tube/initial_concentrations.csv?raw'
import flowTubeInitialReactionRatesCsv from '@ncar/music-box/examples/flow_tube/initial_reaction_rates.csv?raw'
import carbonBond5InitialConcentrationsCsv from '@ncar/music-box/examples/carbon_bond_5/initial_concentrations.csv?raw'
import carbonBond5InitialReactionRatesCsv from '@ncar/music-box/examples/carbon_bond_5/initial_reaction_rates.csv?raw'
import analyticalInitialConditionsCsv from '@ncar/music-box/examples/analytical/initial_conditions.csv?raw'

/**
 * ExampleLoader Component
 * Loads pre-configured example simulations
 */
export function ExampleLoader() {
  const navigate = useNavigate()

  const toExampleCsvJson = (content) => {
    if (typeof content !== 'string' || content.trim().length === 0) {
      return {}
    }

    return parseCsvToBlock(content)
  }

  const buildExampleCsvJson = ({
    initial_conditions = '',
    initial_concentrations = '',
    initial_reaction_rates = '',
    boulder = '',
  } = {}) => ({
    initial_conditions: toExampleCsvJson(initial_conditions),
    initial_concentrations: toExampleCsvJson(initial_concentrations),
    initial_reaction_rates: toExampleCsvJson(initial_reaction_rates),
    boulder: toExampleCsvJson(boulder),
  })

  const withInlineConditionData = (config, csvContents = []) => {
    const existingData = Array.isArray(config?.conditions?.data) ? config.conditions.data : []
    const parsedBlocks = csvContents
      .filter((content) => typeof content === 'string' && content.trim().length > 0)
      .map((content) => parseCsvToBlock(content))

    return {
      ...config,
      conditions: {
        ...(config.conditions || {}),
        data: [...existingData, ...parsedBlocks],
      },
    }
  }

  const [loading] = useState(false)
  const [error] = useState(null)
  const dispatch = useDispatch()

  const examples = [
    {
      id: 'analytical',
      name: 'Analytical Mechanism',
      description: 'A simple analytical model for demonstration purposes',
      mechanism_name: analyticalConfig.mechanism.name,
      csv: buildExampleCsvJson({
        initial_conditions: analyticalInitialConditionsCsv,
      }),
      mechanism: withInlineConditionData(analyticalConfig, [analyticalInitialConditionsCsv]),
    },
    {
      id: 'chapman',
      name: 'Chapman Mechanism',
      description: 'Stratospheric oxygen chemistry with photolysis',
      mechanism_name: chapmanConfig.mechanism.name,
      csv: buildExampleCsvJson({
        initial_concentrations: chapmanInitialConcentrationsCsv,
        boulder: chapmanConditionsBoulderCsv,
      }),
      mechanism: withInlineConditionData(chapmanConfig, [
        chapmanInitialConcentrationsCsv,
        chapmanConditionsBoulderCsv,
      ]),
    },
    {
      id: 'Flow-Tube Wall Loss',
      name: 'Flow-Tube Wall Loss',
      description:
        'A simple characterization of wall loss of a-Pinene oxidation products in a flow-tube reactor. ',
      mechanism_name: flowTubeConfig.mechanism.name,
      csv: buildExampleCsvJson({
        initial_concentrations: flowTubeInitialConcentrationsCsv,
        initial_reaction_rates: flowTubeInitialReactionRatesCsv,
      }),
      mechanism: withInlineConditionData(flowTubeConfig, [
        flowTubeInitialConcentrationsCsv,
        flowTubeInitialReactionRatesCsv,
      ]),
    },
    {
      id: 'Full Gas-Phase Mechanism',
      name: 'Full Gas-Phase Mechanism',
      description:
        'A variant of the Carbon Bond 5 chemical mechanism used in the MONARCH global/regional chemical weather prediction system. The description of the modified version of CB-05 used in MONARCH',
      mechanism_name: carbonBond5Config.mechanism.name,
      csv: buildExampleCsvJson({
        initial_concentrations: carbonBond5InitialConcentrationsCsv,
        initial_reaction_rates: carbonBond5InitialReactionRatesCsv,
      }),
      mechanism: withInlineConditionData(carbonBond5Config, [
        carbonBond5InitialConcentrationsCsv,
        carbonBond5InitialReactionRatesCsv,
      ]),
    },
    {
      id: 'Troposphere-Stratosphere mechanism (TS1)',
      name: 'Troposphere-Stratosphere mechanism (TS1)',
      description:
        'A comprehensive model of the chemistry in the troposphere and stratosphere. Read about its formulation in this paper.',
      mechanism_name: ts1Config.mechanism.name,
      csv: buildExampleCsvJson({
        initial_conditions: ts1InitialConditionsCsv,
      }),
      mechanism: withInlineConditionData(ts1Config, [ts1InitialConditionsCsv]),
    },
  ]

  const loadExample = async (example) => {
    dispatch(resetMechanism())
    dispatch(resetConditions())
    dispatch(resetSimulation())

    const exampleConfig = example.mechanism
    const mechanismConfig = exampleConfig?.mechanism || {}

    dispatch(setMechanism(exampleConfig))

    // Diffusion coefficient and density belong to PhaseSpecies, so collect them by name
    // for placement under phases[].species[].
    const phaseProperties = new Map()
    for (const phase of Array.isArray(mechanismConfig.phases) ? mechanismConfig.phases : []) {
      for (const entry of Array.isArray(phase.species) ? phase.species : []) {
        if (!entry || typeof entry !== 'object' || !entry.name) {
          continue
        }
        const carried = pickDeclared(entry, PHASE_PROPERTY_KEYS)
        if (Object.keys(carried).length > 0) {
          phaseProperties.set(entry.name, { ...phaseProperties.get(entry.name), ...carried })
        }
      }
    }

    const mechanismSpecies = Array.isArray(mechanismConfig.species) ? mechanismConfig.species : []
    mechanismSpecies.forEach((species) => {
      // Only include declared properties; defaults would make unspecified values look configured.
      dispatch(
        addSpecies({
          name: species.name,
          phase: species.phase || 'Gas',
          ...pickDeclared(species, SPECIES_PROPERTY_KEYS),
          ...(phaseProperties.get(species.name) ?? {}),
        })
      )
    })

    const mechanismReactions = Array.isArray(mechanismConfig.reactions)
      ? mechanismConfig.reactions
      : []
    mechanismReactions.forEach((reaction) => {
      // FlowGraph identifies reaction nodes by name, so one is filled in where the mechanism does
      // not declare one. The editor uses buildGeneratedReactionName to tell the two apart.
      const declaredName =
        typeof reaction.name === 'string' && reaction.name.trim().length > 0 ? reaction.name : null

      dispatch(
        addReaction({
          ...reaction,
          id: uuidv4(),
          name: declaredName ?? buildGeneratedReactionName(reaction),
        })
      )
    })

    const options = exampleConfig['box model options'] || {}

    if (options['simulation length [day]'] != null) {
      dispatch(setDuration(options['simulation length [day]'] * 24 * 3600))
    } else if (options['simulation length [hour]'] != null) {
      dispatch(setDuration(options['simulation length [hour]'] * 3600))
    } else if (options['simulation length [hr]'] != null) {
      dispatch(setDuration(options['simulation length [hr]'] * 3600))
    } else if (options['simulation length [sec]'] != null) {
      dispatch(setDuration(options['simulation length [sec]']))
    }

    if (options['chemistry time step [min]'] != null) {
      dispatch(setTimeStep(options['chemistry time step [min]'] * 60))
    } else if (options['chemistry time step [sec]'] != null) {
      dispatch(setTimeStep(options['chemistry time step [sec]']))
    }

    if (options['output time step [min]'] != null) {
      dispatch(setOutputFrequency(options['output time step [min]'] * 60))
    } else if (options['output time step [sec]'] != null) {
      dispatch(setOutputFrequency(options['output time step [sec]']))
    }

    if (exampleConfig['__source file'] != null) {
      dispatch(setSourceFile(exampleConfig['__source file']))
    } else {
      dispatch(setSourceFile(null))
    }

    dispatch(setConditions(exampleConfig.conditions))
    dispatch(
      setExampleFiles({
        ...example.csv,
        data: exampleConfig.conditions?.data || [],
      })
    )
    dispatch(
      setCurrentExample({
        id: example.id,
        name: example.name,
        description: example.description,
        mechanism_name: example.mechanism_name,
        csv: example.csv,
      })
    )
    dispatch(setSelectedMechanism(example.mechanism_name || example.id || 'custom'))
    dispatch(setExampleLoaded(false))

    navigate('/mechanism')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Example Simulations</CardTitle>
        <CardDescription>
          Load pre-configured example simulations to get started quickly
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="bg-red-900/20 backdrop-blur-lg border border-red-400/30 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid gap-3">
          {examples.map((example) => (
            <div
              key={example.id}
              className="flex items-center justify-between p-4 border border-white/20 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{example.name}</h4>
                <p className="text-xs text-gray-700 mt-1">{example.description}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-white/5 backdrop-blur-lg border border-white/20 text-gray-900 text-xs font-bold rounded">
                  {example.mechanism_name}
                </span>
              </div>

              <Button
                variant="glass"
                size="sm"
                onClick={() => loadExample(example)}
                disabled={loading}
                className="rounded-2xl ml-4"
              >
                {loading ? 'Loading...' : 'Load'}
              </Button>
            </div>
          ))}
        </div>

        {examples.length === 0 && !error && (
          <p className="text-center text-gray-500 py-4">No examples available</p>
        )}
      </CardContent>
    </Card>
  )
}

export default ExampleLoader
