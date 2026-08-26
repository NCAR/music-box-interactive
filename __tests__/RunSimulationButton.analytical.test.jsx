import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mechanismReducer, { setMechanism, setCurrentExample, addSpecies, addReaction } from '../src/redux/slices/mechanismSlice';
import conditionsReducer, { setConditions, setDuration, setTimeStep, setOutputFrequency, setExampleFiles, setExampleLoaded, setSourceFile } from '../src/redux/slices/conditionsSlice';
import simulationReducer from '../src/redux/slices/simulationSlice';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { RunSimulationButton } from '../src/components/RunSimulationButton';
import { vi } from 'vitest';

// Analytical Example Imports
import analyticalConfig from '@ncar/music-box/examples/analytical/my_config.json' with { type: 'json' };
import analyticalInitialConditionsCsv from '@ncar/music-box/examples/analytical/initial_conditions.csv?raw';
import { parseCsvToBlock } from '@ncar/music-box';

import { durationSeconds, stepSeconds } from './helpers/boxModelOptions';
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
    store.dispatch(setMechanism(analyticalExample.mechanism));
    store.dispatch(setCurrentExample({
      id: analyticalExample.id,
      name: analyticalExample.name,
      description: analyticalExample.description,
      mechanism_name: analyticalExample.mechanism_name,
      csv: analyticalExample.csv,
    }));
    (analyticalExample.mechanism.mechanism.species || []).forEach((species) => {
      store.dispatch(addSpecies({
        name: species.name,
        molecular_weight_kg_mol: species['molecular weight [kg mol-1]'],
        properties: {},
      }));
    });
    (analyticalExample.mechanism.mechanism.reactions || []).forEach((reaction) => {
      store.dispatch(addReaction({ ...reaction, id: reaction.id || 'test' }));
    });
    const options = analyticalExample.mechanism["box model options"] || {};
    store.dispatch(setDuration(durationSeconds(options)));
    store.dispatch(setTimeStep(stepSeconds(options, "chemistry time step")));
    store.dispatch(setOutputFrequency(stepSeconds(options, "output time step")));
    store.dispatch(setConditions(analyticalExample.mechanism.conditions));
    store.dispatch(setExampleFiles({ ...analyticalExample.csv, data: analyticalExample.mechanism.conditions?.data || [] }));
    store.dispatch(setExampleLoaded(false));
    store.dispatch(setSourceFile(analyticalExample.mechanism["__source file"] || null));

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
    // and reached the solver..
    const expectedInitial = expectedInitialConcentrations(analyticalConfig, [analyticalInitialConditionsCsv]);
    expect(Object.keys(expectedInitial)).toHaveLength(3);
    for (const [key, value] of Object.entries(expectedInitial)) {
      expect(results[0].concentrations[key]).toBeCloseTo(value, 12);
    }

    // ...and it must integrate rather than echo the inputs back.
    const finalConcentrations = results[results.length - 1].concentrations;
    expect(Object.values(finalConcentrations).every(Number.isFinite)).toBe(true);
    expect(
      Object.entries(finalConcentrations).some(([key, value]) => value !== results[0].concentrations[key])
    ).toBe(true);
  });
});
