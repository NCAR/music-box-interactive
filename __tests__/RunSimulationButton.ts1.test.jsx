import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mechanismReducer, { setMechanism, setCurrentExample, addSpecies, addReaction } from '../src/redux/slices/mechanismSlice';
import conditionsReducer, { setConditions, setDuration, setTimeStep, setOutputFrequency, setExampleFiles, setExampleLoaded, setSourceFile } from '../src/redux/slices/conditionsSlice';
import simulationReducer from '../src/redux/slices/simulationSlice';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { RunSimulationButton } from '../src/components/RunSimulationButton';

// TS1 Example Imports
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' };
import ts1InitialConditionsCsv from '@ncar/music-box/examples/ts1/initial_conditions.csv?raw';
import { parseCsvToBlock } from '@ncar/music-box';
import { durationSeconds, stepSeconds } from './helpers/boxModelOptions';

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

// TS1 is the only bundled mechanism with SURFACE reactions, so it is the only one that
// exercises tracer injection into 'gas-phase products' and the molecular-weight requirement
// that comes with it. A real solve is slow. See solverPayloadContract.test.js for the cheap
// schema-only coverage.
import { vi } from 'vitest';

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
        molecular_weight_kg_mol: species['molecular weight [kg mol-1]'],
        properties: {},
      }));
    });
    (ts1Example.mechanism.mechanism.reactions || []).forEach((reaction) => {
      store.dispatch(addReaction({ ...reaction, id: reaction.id || 'test' }));
    });
    const options = ts1Example.mechanism["box model options"] || {};
    store.dispatch(setDuration(durationSeconds(options)));
    store.dispatch(setTimeStep(stepSeconds(options, "chemistry time step")));
    store.dispatch(setOutputFrequency(stepSeconds(options, "output time step")));
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
    }, { timeout: 120000 });
  }, 120000);
});
