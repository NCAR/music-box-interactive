import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { loadConditions } from '../redux/slices/conditionsSlice'
import { setSelectedMechanism, setCurrentExample, mechanismSlice } from '../redux/slices/mechanismSlice'
import { clearSimulation } from '../redux/slices/simulationSlice'

import { addSpecies, addReaction, setMechanism } from '../redux/slices/mechanismSlice'
import { setDuration, setTimeStep, setOutputFrequency, setConditions, setExampleLoaded, setSourceFile } from '../redux/slices/conditionsSlice'
import { v4 as uuidv4 } from 'uuid'

const API_URL = 'http://localhost:3001/api'

import { resetMechanism } from '../redux/slices/mechanismSlice'
import { resetConditions } from '../redux/slices/conditionsSlice'
import { resetSimulation } from '../redux/slices/simulationSlice'

import { MusicBox, parseCsvToBlock } from '@ncar/music-box';


import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' };
import analyticalConfig from '@ncar/music-box/examples/analytical/my_config.json' with { type: 'json' };
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' };
import flowTubeConfig from '@ncar/music-box/examples/flow_tube/my_config.json' with { type: 'json' };
import carbonBond5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' };
import chapmanInitialConcentrationsCsv from '@ncar/music-box/examples/chapman/initial_concentrations.csv?raw';
import chapmanConditionsBoulderCsv from '@ncar/music-box/examples/chapman/conditions_Boulder.csv?raw';
import ts1InitialConditionsCsv from '@ncar/music-box/examples/ts1/initial_conditions.csv?raw';
import flowTubeInitialConcentrationsCsv from '@ncar/music-box/examples/flow_tube/initial_concentrations.csv?raw';
import flowTubeInitialReactionRatesCsv from '@ncar/music-box/examples/flow_tube/initial_reaction_rates.csv?raw';
import carbonBond5InitialConcentrationsCsv from '@ncar/music-box/examples/carbon_bond_5/initial_concentrations.csv?raw';
import carbonBond5InitialReactionRatesCsv from '@ncar/music-box/examples/carbon_bond_5/initial_reaction_rates.csv?raw';


/**
 * ExampleLoader Component
 * Loads pre-configured example simulations
 */
export function ExampleLoader() {
  const navigate = useNavigate();

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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const dispatch = useDispatch()

  const examples = [
    {
        id: 'analytical',
        name: 'Analytical Mechanism',
        description: 'A simple analytical model for demonstration purposes',
        mechanism_name: analyticalConfig.mechanism.name,
        mechanism: analyticalConfig,
    },
    {
        id: 'chapman',
        name: 'Chapman Mechanism',
        description: 'Stratospheric oxygen chemistry with photolysis',
        mechanism_name: chapmanConfig.mechanism.name,
      mechanism: withInlineConditionData(chapmanConfig, [chapmanInitialConcentrationsCsv, chapmanConditionsBoulderCsv]),
    },
    {
        id: 'Flow-Tube Wall Loss',
        name: 'Flow-Tube Wall Loss',
        description: 'A simple characterization of wall loss of a-Pinene oxidation products in a flow-tube reactor. ',
        mechanism_name: flowTubeConfig.mechanism.name,
      mechanism: withInlineConditionData(flowTubeConfig, [flowTubeInitialConcentrationsCsv, flowTubeInitialReactionRatesCsv]),
    },
    {
        id: 'Full Gas-Phase Mechanism',
        name: 'Full Gas-Phase Mechanism',
        description: 'A variant of the Carbon Bond 5 chemical mechanism used in the MONARCH global/regional chemical weather prediction system. The description of the modified version of CB-05 used in MONARCH',
        mechanism_name: carbonBond5Config.mechanism.name,
      mechanism: withInlineConditionData(carbonBond5Config, [carbonBond5InitialConcentrationsCsv, carbonBond5InitialReactionRatesCsv]),
    },
    {
        id: 'Troposphere-Stratosphere mechanism (TS1)',
        name: 'Troposphere-Stratosphere mechanism (TS1)',
        description: 'A comprehensive model of the chemistry in the troposphere and stratosphere. Read about its formulation in this paper.',
        mechanism_name: ts1Config.mechanism.name,
      mechanism: withInlineConditionData(ts1Config, [ts1InitialConditionsCsv]),
    },
  ]

  const reactionJsonToString = (arr = []) => {
    return arr
      .map(item => {
        if (typeof item === 'string') {
          return item.trim().toUpperCase();
        }

        if (!item || typeof item !== 'object') {
          return "";
        }

        const name = item["species name"]?.trim()?.toUpperCase() ?? "";
        const coeff = parseFloat(item["coefficient"]);

        if (coeff === 1 || isNaN(coeff)) {
          return name;
        }

        return `${coeff}${name}`;
      })
      .join(" + ");
  };


  const loadExample = async (example) => {
    dispatch(resetMechanism());
    dispatch(resetConditions());
    dispatch(resetSimulation());

    dispatch(setMechanism(example));

    example.mechanism.species.map(species => {
      dispatch(addSpecies({
        name: species.name,
        molecular_weight_kg_mol: 0.048, // Using default value
        properties: {},
      }));
    })

    example.mechanism.reactions.map(reaction => {
      const displayReactants = reaction.reactants
        || reaction['gas-phase species']
        || [];
      const displayProducts = reaction.products
        || reaction['gas-phase products']
        || reaction['alkoxy products']
        || [];

      const normalizedReactants = reactionJsonToString(Array.isArray(displayReactants)
        ? displayReactants
        : [displayReactants]).toUpperCase();
      const normalizedProducts = reactionJsonToString(displayProducts ?? []).toUpperCase();

      const newReaction = {
        ...reaction,
        id: uuidv4(),
        "name": normalizedProducts
          ? `${normalizedReactants} -> ${normalizedProducts}`
          : `${normalizedReactants} -> (removed)`,
      }

      dispatch(addReaction(newReaction));
    })

    const options = example["box model options"];

    if (options["simulation length [day]"] != null) {
      dispatch(setDuration(options["simulation length [day]"] * 24 * 3600))
    } else if (options["simulation length [hour]"] != null || options["simulation length [hr]"] != null) {
      dispatch(setDuration(options["simulation length [hour]"] * 3600))
    } else if (options["simulation length [sec]"] != null) {
      dispatch(setDuration(options["simulation length [sec]"]))
    }

    if (options["chemistry time step [min]"] != null) {
      dispatch(setTimeStep(options["chemistry time step [min]"] * 60))
    } else if (options["chemistry time step [sec]"] != null) {
      dispatch(setTimeStep(options["chemistry time step [sec]"]))
    }

    if (options["output time step [min]"] != null) {
      dispatch(setOutputFrequency(options["output time step [min]"] * 60))
    } else if (options["output time step [sec]"] != null) {
      dispatch(setOutputFrequency(options["output time step [sec]"]))
    }

    // Preserve "__source file" if it exists in the original JSON.
    // This ensures it is carried through Redux and can be re-added
    // when rebuilding the final configuration file.
    if (example["__source file"] != null) {
      dispatch(setSourceFile(example["__source file"]));
    } else {
      dispatch(setSourceFile(null));
    }

    dispatch(setConditions(example.conditions));
    dispatch(setCurrentExample(example.mechanism.name));
    dispatch(setExampleLoaded(false));

    navigate("/mechanism");
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
          <div className="bg-red-900/20 backdrop-blur-lg border border-red-400/30 text-red-400 px-4 py-3 rounded mb-4">
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
                <p className="text-xs text-gray-100 mt-1">{example.description}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-white/5 backdrop-blur-lg border border-white/20 text-white text-xs font-bold rounded">
                  {example.mechanism_name}
                </span>
              </div>

              <Button
                variant="glass"
                size="sm"
                onClick={() => loadExample(example.mechanism)}
                // onClick={() => handleClick()}
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
