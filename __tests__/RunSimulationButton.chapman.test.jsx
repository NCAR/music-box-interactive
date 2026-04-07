import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mechanismReducer, { setMechanism, setCurrentExample, addSpecies, addReaction } from '../src/redux/slices/mechanismSlice';
import conditionsReducer, { setConditions, setDuration, setTimeStep, setOutputFrequency, setExampleFiles, setExampleLoaded, setSourceFile } from '../src/redux/slices/conditionsSlice';
import simulationReducer, { setResults, setStatus, setMetadata } from '../src/redux/slices/simulationSlice';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { RunSimulationButton } from '../src/components/RunSimulationButton';

// Import the real Chapman example and CSVs as in ExampleLoader
import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' };
import chapmanInitialConcentrationsCsv from '@ncar/music-box/examples/chapman/initial_concentrations.csv?raw';
import chapmanConditionsBoulderCsv from '@ncar/music-box/examples/chapman/conditions_Boulder.csv?raw';
import { parseCsvToBlock } from '@ncar/music-box';

// Helper to build the same data structure as ExampleLoader
function toExampleCsvJson(content) {
  if (typeof content !== 'string' || content.trim().length === 0) {
    return {};
  }
  return parseCsvToBlock(content);
}
function buildExampleCsvJson({ initial_conditions = '', initial_concentrations = '', initial_reaction_rates = '', boulder = '' } = {}) {
  return {
    initial_conditions: toExampleCsvJson(initial_conditions),
    initial_concentrations: toExampleCsvJson(initial_concentrations),
    initial_reaction_rates: toExampleCsvJson(initial_reaction_rates),
    boulder: toExampleCsvJson(boulder),
  };
}
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

const chapmanExample = {
  id: 'chapman',
  name: 'Chapman Mechanism',
  description: 'Stratospheric oxygen chemistry with photolysis',
  mechanism_name: chapmanConfig.mechanism.name,
  csv: buildExampleCsvJson({
    initial_concentrations: chapmanInitialConcentrationsCsv,
    boulder: chapmanConditionsBoulderCsv,
  }),
  mechanism: withInlineConditionData(chapmanConfig, [chapmanInitialConcentrationsCsv, chapmanConditionsBoulderCsv]),
};

// Mock MusicBox to avoid actual computation
import { vi } from 'vitest';

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

describe('RunSimulationButton (Chapman example)', () => {
  it('runs simulation without error using real Chapman example', async () => {
    // Simulate Redux state after selecting Chapman example
    const store = configureStore({
      reducer: {
        simulation: simulationReducer,
        mechanism: mechanismReducer,
        conditions: conditionsReducer,
      },
    });

    // Simulate ExampleLoader's Redux setup
    store.dispatch(setMechanism(chapmanExample.mechanism));
    store.dispatch(setCurrentExample({
      id: chapmanExample.id,
      name: chapmanExample.name,
      description: chapmanExample.description,
      mechanism_name: chapmanExample.mechanism_name,
      csv: chapmanExample.csv,
    }));
    // Add species
    (chapmanExample.mechanism.mechanism.species || []).forEach((species) => {
      store.dispatch(addSpecies({
        name: species.name,
        molecular_weight_kg_mol: 0.048,
        properties: {},
      }));
    });
    // Add reactions
    (chapmanExample.mechanism.mechanism.reactions || []).forEach((reaction) => {
      store.dispatch(addReaction({ ...reaction, id: reaction.id || 'test' }));
    });
    // Set box model options
    const options = chapmanExample.mechanism["box model options"] || {};
    if (options["simulation length [sec]"]) store.dispatch(setDuration(options["simulation length [sec]"]));
    if (options["chemistry time step [sec]"]) store.dispatch(setTimeStep(options["chemistry time step [sec]"]));
    if (options["output time step [sec]"]) store.dispatch(setOutputFrequency(options["output time step [sec]"]));
    store.dispatch(setConditions(chapmanExample.mechanism.conditions));
    store.dispatch(setExampleFiles({ ...chapmanExample.csv, data: chapmanExample.mechanism.conditions?.data || [] }));
    store.dispatch(setExampleLoaded(false));
    store.dispatch(setSourceFile(chapmanExample.mechanism["__source file"] || null));

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
