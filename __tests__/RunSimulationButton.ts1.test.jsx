import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mechanismReducer from '../src/redux/slices/mechanismSlice';
import conditionsReducer from '../src/redux/slices/conditionsSlice';
import simulationReducer from '../src/redux/slices/simulationSlice';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { RunSimulationButton } from '../src/components/RunSimulationButton';
import { loadMusicBoxConfig } from '../src/services/config/loadMusicBoxConfig';

// TS1 Example Imports
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' };
import ts1InitialConditionsCsv from '@ncar/music-box/examples/ts1/initial_conditions.csv?raw';
import { parseCsvToBlock } from '@ncar/music-box';
import { expectedInitialConcentrations } from './helpers/initialConcentrations';

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
    await loadMusicBoxConfig(ts1Example.mechanism, {
      dispatch: store.dispatch,
      navigate: vi.fn(),
      meta: {
        id: ts1Example.id,
        name: ts1Example.name,
        description: ts1Example.description,
        mechanism_name: ts1Example.mechanism_name,
      },
    });

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

    const results = store.getState().simulation.results;
    expect(results.length).toBeGreaterThan(1);

    // Unlike the other examples, TS1's initial_conditions.csv timestamps its single row at
    // t=1000s rather than t=0, so the run legitimately starts from zero concentrations and is
    // seeded partway through. Asserting that explicitly keeps the difference visible.
    const expectedInitial = expectedInitialConcentrations(ts1Config, [ts1InitialConditionsCsv]);
    expect(Object.keys(expectedInitial)).toHaveLength(0);
    expect(Object.values(results[0].concentrations).every((value) => value === 0)).toBe(true);

    // The seeding and the integration must both have happened.
    // At least one solved concentration differs from its initial value.
    const finalConcentrations = results[results.length - 1].concentrations;
    expect(Object.values(finalConcentrations).every(Number.isFinite)).toBe(true);
    expect(Object.values(finalConcentrations).filter((value) => value > 0).length).toBeGreaterThan(100);
    expect(
      Object.entries(finalConcentrations).some(([key, value]) => value !== results[0].concentrations[key])
    ).toBe(true);
  }, 120000);
});
