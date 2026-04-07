import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mechanismReducer, { setMechanism, setCurrentExample, addSpecies, addReaction } from '../src/redux/slices/mechanismSlice';
import conditionsReducer, { setConditions, setDuration, setTimeStep, setOutputFrequency, setExampleFiles, setExampleLoaded, setSourceFile } from '../src/redux/slices/conditionsSlice';
import simulationReducer from '../src/redux/slices/simulationSlice';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { RunSimulationButton } from '../src/components/RunSimulationButton';
import { vi } from 'vitest';

// Flow-Tube Example Imports
import flowTubeConfig from '@ncar/music-box/examples/flow_tube/my_config.json' with { type: 'json' };
import flowTubeInitialConcentrationsCsv from '@ncar/music-box/examples/flow_tube/initial_concentrations.csv?raw';
import flowTubeInitialReactionRatesCsv from '@ncar/music-box/examples/flow_tube/initial_reaction_rates.csv?raw';
import { parseCsvToBlock } from '@ncar/music-box';

function withInlineConditionData(config, csvContents = []) {
  const existingData = Array.isArray(config?.conditions?.data) ? config.conditions.data : [];
  const parsedBlocks = csvContents
    .filter((content) => typeof content === 'string' && content.trim().length > 0)
    .map((content) => parseCsvToBlock(content));
  return {
    ...config,
    conditions: {
      ...(config.conditions || {}),
      data: [...existingData, ...parsedBlocks],
    },
  };
}

// Mock MusicBox to avoid actual computation
vi.mock('@ncar/music-box', () => ({
  parseCsvToBlock: vi.fn((...args) => args[0]), // simple passthrough for test
  MusicBox: {
    fromJson: vi.fn().mockReturnValue({
      solve: vi.fn().mockResolvedValue([{ time: 0, concentrations: { O3: 1 } }]),
    }),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('RunSimulationButton (Flow-Tube example)', () => {
  it('runs simulation without error using real Flow-Tube example', async () => {
    const store = configureStore({
      reducer: {
        simulation: simulationReducer,
        mechanism: mechanismReducer,
        conditions: conditionsReducer,
      },
    });

    const flowTubeExample = {
      id: 'flow-tube',
      name: 'Flow-Tube Wall Loss',
      description: 'A simple characterization of wall loss of a-Pinene oxidation products in a flow-tube reactor. ',
      mechanism_name: flowTubeConfig.mechanism.name,
      csv: { initial_concentrations: flowTubeInitialConcentrationsCsv, initial_reaction_rates: flowTubeInitialReactionRatesCsv },
      mechanism: withInlineConditionData(flowTubeConfig, [flowTubeInitialConcentrationsCsv, flowTubeInitialReactionRatesCsv]),
    };
    store.dispatch(setMechanism(flowTubeExample.mechanism));
    store.dispatch(setCurrentExample({
      id: flowTubeExample.id,
      name: flowTubeExample.name,
      description: flowTubeExample.description,
      mechanism_name: flowTubeExample.mechanism_name,
      csv: flowTubeExample.csv,
    }));
    (flowTubeExample.mechanism.mechanism.species || []).forEach((species) => {
      store.dispatch(addSpecies({
        name: species.name,
        molecular_weight_kg_mol: 0.048,
        properties: {},
      }));
    });
    (flowTubeExample.mechanism.mechanism.reactions || []).forEach((reaction) => {
      store.dispatch(addReaction({ ...reaction, id: reaction.id || 'test' }));
    });
    const options = flowTubeExample.mechanism["box model options"] || {};
    if (options["simulation length [sec]"]) store.dispatch(setDuration(options["simulation length [sec]"]));
    if (options["chemistry time step [sec]"]) store.dispatch(setTimeStep(options["chemistry time step [sec]"]));
    if (options["output time step [sec]"]) store.dispatch(setOutputFrequency(options["output time step [sec]"]));
    store.dispatch(setConditions(flowTubeExample.mechanism.conditions));
    store.dispatch(setExampleFiles({ ...flowTubeExample.csv, data: flowTubeExample.mechanism.conditions?.data || [] }));
    store.dispatch(setExampleLoaded(false));
    store.dispatch(setSourceFile(flowTubeExample.mechanism["__source file"] || null));

    render(
      <Provider store={store}>
        <RunSimulationButton />
      </Provider>
    );

    const button = screen.getByRole('button', { name: /run simulation/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(store.getState().simulation.status).toBe('succeeded');
    });
  });
});
