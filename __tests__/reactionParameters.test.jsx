import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import mechanismReducer, { addReaction } from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { ReactionEditor } from '../src/components/Mechanism/ReactionEditor'

// An expanded reaction lists whichever rate parameters it actually carries. Which ones exist
// depends on the type, so the editor derives them from the reaction rather than holding a
// per-type list that would fall behind whenever a reaction type is added or changed.

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const expandReaction = (reaction) => {
  const store = configureStore({
    reducer: {
      mechanism: mechanismReducer,
      conditions: conditionsReducer,
      simulation: simulationReducer,
    },
  })
  store.dispatch(addReaction(reaction))

  render(
    <MemoryRouter>
      <Provider store={store}>
        <ReactionEditor />
      </Provider>
    </MemoryRouter>
  )

  fireEvent.click(screen.getAllByRole('button').find((button) => /\u2192/.test(button.textContent)))
}

// The rendered parameter list, as { name: displayedValue }. Each parameter is a label/input
// pair now that the values are editable.
const parameterList = () => {
  const heading = [...document.querySelectorAll('label')].find(
    (label) => label.textContent === 'Parameters'
  )
  if (!heading) {
    return {}
  }

  const pairs = {}
  for (const row of heading.parentElement.querySelectorAll('div')) {
    const name = row.querySelector('span')
    const field = row.querySelector('input')
    if (name && field) {
      pairs[name.textContent] = field.value
    }
  }
  return pairs
}

describe('reaction parameter display', () => {
  it('Arrhenius shows every parameter that was filled in', () => {
    expandReaction({ id: 'r1', type: 'ARRHENIUS', 'gas phase': 'gas',
      reactants: [{ 'species name': 'O1D' }], products: [{ 'species name': 'O' }],
      A: 1.2e-11, B: 7, C: 75, D: 300, E: 0.5 })
    expect(parameterList()).toEqual({ A: '1.20e-11', B: '7', C: '75', D: '300', E: '0.5' })
  })
  
  it('Troe shows its own parameter set', () => {
    expandReaction({ id: 'r2', type: 'TROE', 'gas phase': 'gas',
      reactants: [{ 'species name': 'A' }], products: [{ 'species name': 'B' }],
      k0_A: 1e-30, k0_B: 0, kinf_A: 2.5e-11, Fc: 0.6, N: 1 })
    // Troe declares eight parameters; the ones this reaction omits show blank, ready to fill in.
    expect(parameterList()).toEqual({
      k0_A: '1.00e-30',
      k0_B: '0',
      k0_C: '',
      kinf_A: '2.50e-11',
      kinf_B: '',
      kinf_C: '',
      Fc: '0.6',
      N: '1',
    })
  })
  
  // A parameter left blank is left to the solver's default. It is still listed so it can be
  // filled in later -- otherwise an omitted parameter would be unreachable from the editor.
  it('lists the unset parameters of the type, blank', () => {
    expandReaction({ id: 'r3', type: 'ARRHENIUS', 'gas phase': 'gas',
      reactants: [{ 'species name': 'A' }], products: [{ 'species name': 'B' }], A: 1.2 })
    expect(parameterList()).toEqual({ A: '1.2', B: '', C: '', D: '', E: '' })
  })
  
  it('structural fields are not shown as parameters', () => {
    expandReaction({ id: 'r4', type: 'SURFACE', name: 'usr_NO2_aer', 'gas phase': 'gas',
      'gas-phase species': 'NO2', 'gas-phase products': [{ 'species name': 'OH' }],
      'reaction probability': 8e-6, __description: 'x' })
    const p = parameterList()
    expect(p).toEqual({ 'reaction probability': '8.00e-6' })
    expect(p).not.toHaveProperty('id')
    expect(p).not.toHaveProperty('__description')
  })
  
  it('non-numeric parameters render as-is', () => {
    expandReaction({ id: 'r5', type: 'LAMBDA_RATE_CONSTANT', 'gas phase': 'gas',
      reactants: [{ 'species name': 'A' }], products: [{ 'species name': 'B' }],
      'lambda function': '(T) => 1.2e-5 * T' })
    expect(parameterList()).toEqual({ 'lambda function': '(T) => 1.2e-5 * T' })
  })
})
