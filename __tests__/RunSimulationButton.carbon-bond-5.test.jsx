import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import mechanismReducer, { setMechanism, setCurrentExample, addSpecies, addReaction } from '../src/redux/slices/mechanismSlice';
import conditionsReducer, { setConditions, setDuration, setTimeStep, setOutputFrequency, setExampleFiles, setExampleLoaded, setSourceFile } from '../src/redux/slices/conditionsSlice';
import simulationReducer from '../src/redux/slices/simulationSlice';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { RunSimulationButton } from '../src/components/RunSimulationButton';
import { vi } from 'vitest';

// Carbon-Bond-5 Example Imports
import carbonBond5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' };
import carbonBond5InitialConcentrationsCsv from '@ncar/music-box/examples/carbon_bond_5/initial_concentrations.csv?raw';
import carbonBond5InitialReactionRatesCsv from '@ncar/music-box/examples/carbon_bond_5/initial_reaction_rates.csv?raw';
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('RunSimulationButton (Carbon-Bond-5 example)', () => {
  it('runs simulation without error using real Carbon-Bond-5 example', async () => {
    const store = configureStore({
      reducer: {
        simulation: simulationReducer,
        mechanism: mechanismReducer,
        conditions: conditionsReducer,
      },
    });

    const carbonBond5Example = {
      id: 'carbon-bond-5',
      name: 'Full Gas-Phase Mechanism',
      description: 'A variant of the Carbon Bond 5 chemical mechanism used in the MONARCH global/regional chemical weather prediction system. The description of the modified version of CB-05 used in MONARCH',
      mechanism_name: carbonBond5Config.mechanism.name,
      csv: { initial_concentrations: carbonBond5InitialConcentrationsCsv, initial_reaction_rates: carbonBond5InitialReactionRatesCsv },
      mechanism: withInlineConditionData(carbonBond5Config, [carbonBond5InitialConcentrationsCsv, carbonBond5InitialReactionRatesCsv]),
    };
    store.dispatch(setMechanism(carbonBond5Example.mechanism));
    store.dispatch(setCurrentExample({
      id: carbonBond5Example.id,
      name: carbonBond5Example.name,
      description: carbonBond5Example.description,
      mechanism_name: carbonBond5Example.mechanism_name,
      csv: carbonBond5Example.csv,
    }));
    (carbonBond5Example.mechanism.mechanism.species || []).forEach((species) => {
      store.dispatch(addSpecies({
        name: species.name,
        molecular_weight_kg_mol: species['molecular weight [kg mol-1]'],
        properties: {},
      }));
    });
    (carbonBond5Example.mechanism.mechanism.reactions || []).forEach((reaction) => {
      store.dispatch(addReaction({ ...reaction, id: reaction.id || 'test' }));
    });
    const options = carbonBond5Example.mechanism["box model options"] || {};
    store.dispatch(setDuration(durationSeconds(options)));
    store.dispatch(setTimeStep(stepSeconds(options, "chemistry time step")));
    store.dispatch(setOutputFrequency(stepSeconds(options, "output time step")));
    store.dispatch(setConditions(carbonBond5Example.mechanism.conditions));
    store.dispatch(setExampleFiles({ ...carbonBond5Example.csv, data: carbonBond5Example.mechanism.conditions?.data || [] }));
    store.dispatch(setExampleLoaded(false));
    store.dispatch(setSourceFile(carbonBond5Example.mechanism["__source file"] || null));

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
