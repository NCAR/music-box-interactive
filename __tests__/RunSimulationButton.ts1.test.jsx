import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mechanismReducer, { setMechanism, setCurrentExample, addSpecies, addReaction } from '../src/redux/slices/mechanismSlice';
import conditionsReducer, { setConditions, setDuration, setTimeStep, setOutputFrequency, setExampleFiles, setExampleLoaded, setSourceFile } from '../src/redux/slices/conditionsSlice';
import simulationReducer from '../src/redux/slices/simulationSlice';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { RunSimulationButton } from '../src/components/RunSimulationButton';
import { vi } from 'vitest';

// TS1 Example Imports
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' };
import ts1InitialConditionsCsv from '@ncar/music-box/examples/ts1/initial_conditions.csv?raw';
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

describe('RunSimulationButton (TS1 example)', () => {
  it('runs simulation without error using real TS1 example', async () => {
    const store = configureStore({
      reducer: {
        simulation: simulationReducer,
        mechanism: mechanismReducer,
        conditions: conditionsReducer,
      },
    });

    const ts1Example = {
      id: 'ts1',
      name: 'Troposphere-Stratosphere mechanism (TS1)',
      description: 'A comprehensive model of the chemistry in the troposphere and stratosphere. Read about its formulation in this paper.',
      mechanism_name: ts1Config.mechanism.name,
      csv: { initial_conditions: ts1InitialConditionsCsv },
      mechanism: withInlineConditionData(ts1Config, [ts1InitialConditionsCsv]),
    };
    store.dispatch(setMechanism(ts1Example.mechanism));
    store.dispatch(setCurrentExample({
      id: ts1Example.id,
      name: ts1Example.name,
      description: ts1Example.description,
      mechanism_name: ts1Example.mechanism_name,
      csv: ts1Example.csv,
    }));
    (ts1Example.mechanism.mechanism.species || []).forEach((species) => {
      store.dispatch(addSpecies({
        name: species.name,
        molecular_weight_kg_mol: 0.048,
        properties: {},
      }));
    });
    (ts1Example.mechanism.mechanism.reactions || []).forEach((reaction) => {
      store.dispatch(addReaction({ ...reaction, id: reaction.id || 'test' }));
    });
    const options = ts1Example.mechanism["box model options"] || {};
    if (options["simulation length [sec]"]) store.dispatch(setDuration(options["simulation length [sec]"]));
    if (options["chemistry time step [sec]"]) store.dispatch(setTimeStep(options["chemistry time step [sec]"]));
    if (options["output time step [sec]"]) store.dispatch(setOutputFrequency(options["output time step [sec]"]));
    store.dispatch(setConditions(ts1Example.mechanism.conditions));
    store.dispatch(setExampleFiles({ ...ts1Example.csv, data: ts1Example.mechanism.conditions?.data || [] }));
    store.dispatch(setExampleLoaded(false));
    store.dispatch(setSourceFile(ts1Example.mechanism["__source file"] || null));

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
