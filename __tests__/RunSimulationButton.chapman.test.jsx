import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mechanismReducer from '../src/redux/slices/mechanismSlice';
import conditionsReducer from '../src/redux/slices/conditionsSlice';
import simulationReducer from '../src/redux/slices/simulationSlice';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { RunSimulationButton } from '../src/components/RunSimulationButton';
import { loadMusicBoxConfig } from '../src/services/config/loadMusicBoxConfig';

// Import the real Chapman example and CSVs as in ExampleLoader
import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' };
import chapmanInitialConcentrationsCsv from '@ncar/music-box/examples/chapman/initial_concentrations.csv?raw';
import chapmanConditionsBoulderCsv from '@ncar/music-box/examples/chapman/conditions_Boulder.csv?raw';
import { parseCsvToBlock } from '@ncar/music-box';
import { expectedInitialConcentrations } from './helpers/initialConcentrations';

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

import { vi } from 'vitest';

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
    await loadMusicBoxConfig(chapmanExample.mechanism, {
      dispatch: store.dispatch,
      navigate: vi.fn(),
      meta: {
        id: chapmanExample.id,
        name: chapmanExample.name,
        description: chapmanExample.description,
        mechanism_name: chapmanExample.mechanism_name,
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
    const expectedInitial = expectedInitialConcentrations(chapmanConfig, [chapmanInitialConcentrationsCsv, chapmanConditionsBoulderCsv]);
    expect(Object.keys(expectedInitial)).toHaveLength(5);
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
