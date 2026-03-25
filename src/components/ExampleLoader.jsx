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

import { MusicBox } from '@ncar/music-box';

// Can't be imported and therefore we have no way to change its values if desired
// import chapmanConditionsBoulder from '@ncar/music-box/examples/chapman/conditions_Boulder.csv' with { type: 'csv' };

import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' };
import analyticalConfig from '@ncar/music-box/examples/analytical/my_config.json' with { type: 'json' };
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' };
import flowTubeConfig from '@ncar/music-box/examples/flow_tube/my_config.json' with { type: 'json' };
import carbonBond5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' };


/**
 * ExampleLoader Component
 * Loads pre-configured example simulations
 */
export function ExampleLoader() {
  const navigate = useNavigate();

  async function handleClick() {
    const box = MusicBox.fromJson(flowTubeConfig);
    const results = await box.solve();
    console.log(results);
    // const response = await axios.get(`${API_URL}/examples/chapman`)
    // const solverConfig = response.data?.example?.solverConfig

    // if (!solverConfig) {
    //   throw new Error('Missing solverConfig from backend example response')
    // }

    // const box = MusicBox.fromJson(solverConfig);
    // const results = await box.solve();
    // console.log(results);
  }

  // const [examples, setExamples] = useState([])
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
        mechanism: chapmanConfig,
    },
    {
        id: 'Flow-Tube Wall Loss',
        name: 'Flow-Tube Wall Loss',
        description: 'A simple characterization of wall loss of a-Pinene oxidation products in a flow-tube reactor. ',
        mechanism_name: flowTubeConfig.mechanism.name,
        mechanism: flowTubeConfig,
    },
    {
        id: 'Full Gas-Phase Mechanism',
        name: 'Full Gas-Phase Mechanism',
        description: 'A variant of the Carbon Bond 5 chemical mechanism used in the MONARCH global/regional chemical weather prediction system. The description of the modified version of CB-05 used in MONARCH',
        mechanism_name: carbonBond5Config.mechanism.name,
        mechanism: carbonBond5Config,
    },
    {
        id: 'Troposphere-Stratosphere mechanism (TS1)',
        name: 'Troposphere-Stratosphere mechanism (TS1)',
        description: 'A comprehensive model of the chemistry in the troposphere and stratosphere. Read about its formulation in this paper.',
        mechanism_name: ts1Config.mechanism.name,
        mechanism: ts1Config,
    },
  ]

  // Fetch available examples on component mount
  // useEffect(() => {
  //   fetchExamples()
  // }, [])

  // const fetchExamples = async () => {
  //   try {
  //     const response = await axios.get(`${API_URL}/examples`)
  //     setExamples(response.data.examples)
  //   } catch (err) {
  //     console.error('Error fetching examples:', err)
  //     setError('Failed to load examples')
  //   }
  // }

  // const loadExample = async (exampleId) => {
  //   setLoading(true)
  //   setError(null)

  //   try {
  //     const response = await axios.get(`${API_URL}/examples/${exampleId}`)
  //     const exampleData = response.data.example

  //     // Find the example metadata from the list
  //     const exampleMetadata = examples.find(ex => ex.id === exampleId)

  //     // CRITICAL: Clear old simulation results before loading new example
  //     // This ensures Simulation Status shows the new example info, not old results
  //     dispatch(clearSimulation())

  //     // Update Redux store with example configuration
  //     dispatch(setSelectedMechanism(exampleData.mechanism))
  //     dispatch(loadConditions(exampleData.conditions))
  //     dispatch(setCurrentExample({
  //       id: exampleId,
  //       name: exampleData.name,
  //       description: exampleData.description || exampleMetadata?.description,
  //     }))

  //     console.log(`Loaded example: ${exampleData.name}`)

  //     // Call callback to notify parent that example was selected
  //     if (onExampleSelected) {
  //       onExampleSelected()
  //     }
  //   } catch (err) {
  //     console.error('Error loading example:', err)
  //     setError(`Failed to load example: ${exampleId}`)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const reactionJsonToString = (arr = []) => {
    return arr
      .map(item => {
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

      const normalizedReactants = reactionJsonToString(reaction.reactants ?? []).toUpperCase();
      const normalizedProducts = reactionJsonToString(reaction.products ?? []).toUpperCase();

      const newReaction = {
        id: uuidv4(),
        type: reaction.type,
        "A": reaction.A,
        "B": reaction.B,
        "C": reaction.C,
        "D": reaction.D,
        "E": reaction.E,
        "reactants": reaction.reactants,
        "products": reaction.products,
        "gas phase": reaction["gas phase"],
        "name": normalizedProducts
          ? `${normalizedReactants} → ${normalizedProducts}`
          : `${normalizedReactants} → (removed)`,
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

        <button onClick={handleClick}>
          Click Me
        </button>

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
