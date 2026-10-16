import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import mechanismReducer, { addReaction, addSpecies } from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { ReactionEditor } from '../src/components/Mechanism/ReactionEditor'
import {
  RateParameterUnitContext,
  RATE_UNIT_STORAGE_KEY,
  allRateUnits,
  readRateUnits,
} from '../src/hooks/rateParameterUnitContext'
import {
  AVOGADRO_CONSTANT,
  buildIntervalDivisors,
  fromMolM3,
  toMolM3,
} from '../src/utils/concentrationUnits'
import {
  fromDisplayValue,
  genericRateUnitLabel,
  parameterOrder,
  rateUnitLabel,
  reactionOrder,
  toDisplayValue,
} from '../src/utils/rateParameterUnits'

// The mechanism stores SI rate parameters. The editors show and accept them in the display
// unit of each parameter, which defaults to the molecule unit of the JPL evaluations.

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const MOLECULE_FACTOR = 1e6 / AVOGADRO_CONSTANT

const twoReactants = {
  reactants: [
    { name: 'A', coefficient: 1 },
    { name: 'B', coefficient: 1 },
  ],
  products: [{ name: 'C', coefficient: 1 }],
}

describe('rate parameter order', () => {
  it('sums the reactant coefficients', () => {
    const reaction = { type: 'ARRHENIUS', reactants: [{ name: 'NO2', coefficient: 2 }] }
    expect(reactionOrder(reaction)).toBe(2)
    expect(parameterOrder(reaction, 'A')).toBe(2)
  })

  it('gives k0 of Troe one order more and kinf of ternary chemical activation one order less', () => {
    expect(parameterOrder({ type: 'TROE', ...twoReactants }, 'k0_A')).toBe(3)
    expect(parameterOrder({ type: 'TROE', ...twoReactants }, 'kinf_A')).toBe(2)
    const ternary = { type: 'TERNARY_CHEMICAL_ACTIVATION', ...twoReactants }
    expect(parameterOrder(ternary, 'k0_A')).toBe(2)
    expect(parameterOrder(ternary, 'kinf_A')).toBe(1)
  })

  it('gives no order to a parameter without a concentration unit', () => {
    expect(parameterOrder({ type: 'ARRHENIUS', ...twoReactants }, 'C')).toBeNull()
    expect(parameterOrder({ type: 'PHOTOLYSIS', ...twoReactants }, 'scaling factor')).toBeNull()
  })
})

describe('rate parameter conversion', () => {
  it('converts a second-order SI value to cm3 molecule-1 s-1 and back', () => {
    const shown = toDisplayValue(1, 'molecule', 2)
    expect(shown).toBeCloseTo(MOLECULE_FACTOR, 30)
    expect(fromDisplayValue(shown, 'molecule', 2)).toBeCloseTo(1, 12)
  })

  it('does not change a first-order value or an SI value', () => {
    expect(toDisplayValue(3, 'molecule', 1)).toBe(3)
    expect(toDisplayValue(3, 'si', 2)).toBe(3)
  })

  it('labels the unit of each order', () => {
    expect(rateUnitLabel('molecule', 1)).toBe('s^-1')
    expect(rateUnitLabel('molecule', 2)).toBe('cm^3 \u2009molecule^-1 \u2009s^-1')
    expect(rateUnitLabel('molecule', 3)).toBe('cm^6 \u2009molecule^-2 \u2009s^-1')
    expect(rateUnitLabel('si', 2)).toBe('m^3 \u2009mol^-1 \u2009s^-1')
    expect(rateUnitLabel('molecule', 0)).toBe('molecule \u2009cm^-3 \u2009s^-1')
    expect(rateUnitLabel('si', 0)).toBe('mol \u2009m^-3 \u2009s^-1')
    expect(rateUnitLabel('molecule', -1)).toBe('molecule^2 \u2009cm^-6 \u2009s^-1')
  })

  it('labels the unit of each offset before the order is known', () => {
    expect(genericRateUnitLabel('molecule', 0)).toBe('(cm^3 \u2009molecule^-1)^(n-1) \u2009s^-1')
    expect(genericRateUnitLabel('molecule', 1)).toBe('(cm^3 \u2009molecule^-1)^n \u2009s^-1')
    expect(genericRateUnitLabel('molecule', -1)).toBe('(cm^3 \u2009molecule^-1)^(n-2) \u2009s^-1')
    expect(genericRateUnitLabel('si', -1)).toBe('(mol \u2009m^-3)^-(n-2) \u2009s^-1')
  })

  it('gives the JPL units of the OH + CO chemical activation', () => {
    const ohCo = {
      type: 'TERNARY_CHEMICAL_ACTIVATION',
      reactants: [
        { name: 'OH', coefficient: 1 },
        { name: 'CO', coefficient: 1 },
      ],
    }
    expect(rateUnitLabel('molecule', parameterOrder(ohCo, 'k0_A'))).toBe(
      'cm^3 \u2009molecule^-1 \u2009s^-1'
    )
    expect(rateUnitLabel('molecule', parameterOrder(ohCo, 'kinf_A'))).toBe('s^-1')
    // A first-order value is the same in both units.
    expect(toDisplayValue(2.1e9, 'molecule', parameterOrder(ohCo, 'kinf_A'))).toBe(2.1e9)
  })
})

// The test environment has no working localStorage, so each test gets an in-memory one.
const mockLocalStorage = (getItem) => {
  const values = new Map()
  const storage = {
    getItem: getItem ?? ((key) => values.get(key) ?? null),
    setItem: (key, value) => values.set(key, String(value)),
  }
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true })
}

describe('saved rate parameter units', () => {
  beforeEach(() => mockLocalStorage())

  it('defaults to the molecule unit', () => {
    expect(readRateUnits().ARRHENIUS.A).toBe('molecule')
  })

  it('loads a saved choice and ignores an unknown unit', () => {
    window.localStorage.setItem(
      RATE_UNIT_STORAGE_KEY,
      JSON.stringify({ ARRHENIUS: { A: 'si' }, TROE: { k0_A: 'furlongs' } })
    )
    const units = readRateUnits()
    expect(units.ARRHENIUS.A).toBe('si')
    expect(units.TROE.k0_A).toBe('molecule')
  })

  it('uses the defaults when the storage is not available', () => {
    mockLocalStorage(() => {
      throw new Error('blocked')
    })
    expect(readRateUnits().ARRHENIUS.A).toBe('molecule')
  })
})

describe('reaction editor with rate parameter units', () => {
  const renderEditor = (reaction, unitId) => {
    const store = configureStore({
      reducer: {
        mechanism: mechanismReducer,
        conditions: conditionsReducer,
        simulation: simulationReducer,
      },
    })
    ;['A', 'B', 'C'].forEach((name) => store.dispatch(addSpecies({ name })))
    store.dispatch(addReaction(reaction))
    const units = allRateUnits(unitId)
    const value = { units, unitFor: (type, key) => units[type]?.[key] ?? null }
    render(
      <MemoryRouter>
        <Provider store={store}>
          <RateParameterUnitContext.Provider value={value}>
            <ReactionEditor />
          </RateParameterUnitContext.Provider>
        </Provider>
      </MemoryRouter>
    )
    fireEvent.click(screen.getAllByRole('button').find((b) => /→/.test(b.textContent)))
    return store
  }

  const parameterInput = (key) => {
    const row = [...document.querySelectorAll('div')].find(
      (d) =>
        d.querySelector(':scope > span')?.textContent === key && d.querySelector(':scope > input')
    )
    return row.querySelector(':scope > input')
  }

  it('shows the molecule value, its unit, and the stored SI value', () => {
    renderEditor({ id: 'r1', type: 'ARRHENIUS', ...twoReactants, A: 1 }, 'molecule')

    expect(parameterInput('A').value).toBe('1.66e-18')
    expect(screen.getByText(/stored as/).textContent).toBe('stored as 1 m3 \u2009mol−1 \u2009s−1')
  })

  it('stores a typed molecule value in SI', () => {
    const store = renderEditor({ id: 'r1', type: 'ARRHENIUS', ...twoReactants, A: 1 }, 'molecule')
    const input = parameterInput('A')

    fireEvent.change(input, { target: { value: '1.8e-11' } })
    fireEvent.blur(input)

    const [reaction] = store.getState().mechanism.config.mechanism.reactions
    expect(reaction.A).toBeCloseTo(1.8e-11 / MOLECULE_FACTOR, 0)
  })

  it('does not save a value that the user did not change', () => {
    const store = renderEditor(
      { id: 'r1', type: 'ARRHENIUS', ...twoReactants, A: 1.23456789 },
      'molecule'
    )
    fireEvent.blur(parameterInput('A'))

    const [reaction] = store.getState().mechanism.config.mechanism.reactions
    expect(reaction.A).toBe(1.23456789)
  })

  it('shows the value of the new order when a reactant is removed', () => {
    const store = renderEditor({ id: 'r1', type: 'ARRHENIUS', ...twoReactants, A: 1 }, 'molecule')
    const equation = screen.getByLabelText(/Equation of/)

    fireEvent.change(equation, { target: { value: 'A → C' } })
    fireEvent.blur(equation)

    // A first-order value is the same in both units.
    expect(parameterInput('A').value).toBe('1')

    // A blur of the unchanged input does not save the old second-order value.
    fireEvent.blur(parameterInput('A'))
    const [reaction] = store.getState().mechanism.config.mechanism.reactions
    expect(reaction.A).toBe(1)
  })

  // Each parameter with a concentration unit, except the Arrhenius A, which the test above checks.
  const BRANCHED_PRODUCTS = {
    'alkoxy products': [{ name: 'C', coefficient: 1 }],
    'nitrate products': [{ name: 'C', coefficient: 1 }],
  }
  it.each([
    ['TROE', 'k0_A', { ...twoReactants, k0_A: 1, kinf_A: 2 }],
    ['TROE', 'kinf_A', { ...twoReactants, k0_A: 1, kinf_A: 2 }],
    ['TERNARY_CHEMICAL_ACTIVATION', 'k0_A', { ...twoReactants, k0_A: 1, kinf_A: 2 }],
    ['TERNARY_CHEMICAL_ACTIVATION', 'kinf_A', { ...twoReactants, k0_A: 1, kinf_A: 2 }],
    ['BRANCHED_NO_RO2', 'X', { reactants: twoReactants.reactants, ...BRANCHED_PRODUCTS, X: 1 }],
    ['TUNNELING', 'A', { ...twoReactants, A: 1 }],
  ])('updates %s %s when a reactant is removed', (type, key, fields) => {
    const reaction = { id: 'r1', type, ...fields }
    const store = renderEditor(reaction, 'molecule')
    const oneReactant = { ...reaction, reactants: [{ name: 'A', coefficient: 1 }] }

    // Branched reactions have no equation input, so the test edits the reactants input.
    const reactants = screen.getByDisplayValue('A + B')
    fireEvent.change(reactants, { target: { value: 'A' } })
    fireEvent.blur(reactants)

    const expected = toDisplayValue(fields[key], 'molecule', parameterOrder(oneReactant, key))
    // The display rounds the value, so the test compares the ratio.
    expect(Number(parameterInput(key).value) / expected).toBeCloseTo(1, 2)

    fireEvent.blur(parameterInput(key))
    const [saved] = store.getState().mechanism.config.mechanism.reactions
    expect(saved[key]).toBe(fields[key])
  })

  it('shows the SI value when the unit is SI', () => {
    renderEditor({ id: 'r1', type: 'ARRHENIUS', ...twoReactants, A: 1 }, 'si')

    expect(parameterInput('A').value).toBe('1')
    expect(screen.queryByText(/stored as/)).toBeNull()
  })
})

describe('molecule cm-3 concentration unit', () => {
  it('converts with a fixed factor and needs no air density', () => {
    expect(fromMolM3(1, 'molecule_cm3')).toBeCloseTo(AVOGADRO_CONSTANT * 1e-6, -10)
    expect(toMolM3(AVOGADRO_CONSTANT * 1e-6, 'molecule_cm3')).toBeCloseTo(1, 12)
  })

  it('gives one interval divisor for all of the samples', () => {
    expect(buildIntervalDivisors('molecule_cm3', null)).toBeCloseTo(
      1 / (AVOGADRO_CONSTANT * 1e-6),
      30
    )
  })
})
