import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mechanismReducer from '../src/redux/slices/mechanismSlice';
import conditionsReducer from '../src/redux/slices/conditionsSlice';
import simulationReducer from '../src/redux/slices/simulationSlice';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { RunSimulationButton } from '../src/components/RunSimulationButton';
import { loadMusicBoxConfig } from '../src/services/config/loadMusicBoxConfig';
import { vi } from 'vitest';

// Analytical Example Imports
import analyticalConfig from '@ncar/music-box/examples/analytical/my_config.json' with { type: 'json' };
import analyticalInitialConditionsCsv from '@ncar/music-box/examples/analytical/initial_conditions.csv?raw';
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('RunSimulationButton (Analytical example)', () => {
  it('runs simulation without error using real Analytical example', async () => {
    const store = configureStore({
      reducer: {
        simulation: simulationReducer,
        mechanism: mechanismReducer,
        conditions: conditionsReducer,
      },
    });

    const analyticalExample = {
      id: 'analytical',
      name: 'Analytical Mechanism',
      description: 'A simple analytical model for demonstration purposes',
      mechanism_name: analyticalConfig.mechanism.name,
      csv: { initial_conditions: analyticalInitialConditionsCsv },
      mechanism: withInlineConditionData(analyticalConfig, [analyticalInitialConditionsCsv]),
    };
    loadMusicBoxConfig(analyticalExample.mechanism, {
      dispatch: store.dispatch,
      navigate: vi.fn(),
      meta: {
        id: analyticalExample.id,
        name: analyticalExample.name,
        description: analyticalExample.description,
        mechanism_name: analyticalExample.mechanism_name,
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
    });

    const results = store.getState().simulation.results;
    expect(results.length).toBeGreaterThan(1);

    // The run must start from the example's own conditions, which proves the CSVs were parsed
    // and reached the solver.
    const expectedInitial = expectedInitialConcentrations(analyticalConfig, [analyticalInitialConditionsCsv]);
    expect(Object.keys(expectedInitial)).toHaveLength(3);
    for (const [key, value] of Object.entries(expectedInitial)) {
      expect(results[0].concentrations[key]).toBeCloseTo(value, 12);
    }

    // At least one solved concentration differs from its initial value.
    const finalConcentrations = results[results.length - 1].concentrations;
    expect(Object.values(finalConcentrations).every(Number.isFinite)).toBe(true);
    expect(
      Object.entries(finalConcentrations).some(([key, value]) => value !== results[0].concentrations[key])
    ).toBe(true);
  });
});
