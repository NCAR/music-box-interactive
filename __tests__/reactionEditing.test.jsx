import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import mechanismReducer, { addReaction, addSpecies } from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { ReactionEditor } from '../src/components/Mechanism/ReactionEditor'
import { Toaster } from '../src/components/ui/toaster'

// Expanded reaction chips edit in place using the same species resolution and validation as adding.
// updateReaction replaces by id, preserving list order since flow-diagram tracers reference reactions by index.

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const REACTION = {
  id: 'r1',
  type: 'ARRHENIUS',
  'gas phase': 'gas',
  reactants: [{ 'species name': 'O1D', coefficient: 1 }],
  products: [{ 'species name': 'O3', coefficient: 1 }],
  A: 1.2e-11,
  B: 7,
}

const setup = (speciesNames = ['O1D', 'O3', 'NO2']) => {
  const store = configureStore({
    reducer: {
      mechanism: mechanismReducer,
      conditions: conditionsReducer,
      simulation: simulationReducer,
    },
  })
  speciesNames.forEach((name) => store.dispatch(addSpecies({ name })))
  store.dispatch(addReaction(REACTION))

  render(
    <MemoryRouter>
      <Provider store={store}>
        <ReactionEditor />
        <Toaster />
      </Provider>
    </MemoryRouter>
  )

  fireEvent.click(screen.getAllByRole('button').find((b) => /→/.test(b.textContent)))
  return store
}

// The add form carries "Reactants"/"Products" labels of its own, so every lookup is scoped to
// the expanded chip. Remove only exists inside the panel, which makes it a reliable anchor.
const chipPanel = () => screen.getByRole('button', { name: 'Remove' }).parentElement.parentElement

const fieldUnder = (labelText) => {
  const label = [...chipPanel().querySelectorAll('label')].find(
    (candidate) => candidate.textContent === labelText
  )
  return label.parentElement.querySelector('input')
}

const parameterField = (name) => {
  const heading = [...chipPanel().querySelectorAll('label')].find(
    (label) => label.textContent === 'Parameters'
  )
  const row = [...heading.parentElement.querySelectorAll('div')].find(
    (candidate) => candidate.querySelector('span')?.textContent === name
  )
  return row.querySelector('input')
}

const reactionFrom = (store) => store.getState().mechanism.reactions[0]

// SURFACE names its reactant in `gas-phase species` as a bare string rather than a component
// array, so it needs its own handling; without it the reactant has no field at all.
const SURFACE_REACTION = {
  id: 's1',
  type: 'SURFACE',
  name: 'usr_NO2_aer',
  'gas phase': 'gas',
  'reaction probability': 8e-6,
  'gas-phase species': 'NO2',
  'gas-phase products': [{ 'species name': 'OH', coefficient: 0.5 }],
}

describe('editing a surface reaction', () => {
  const setupSurface = () => {
    const store = configureStore({
      reducer: {
        mechanism: mechanismReducer,
        conditions: conditionsReducer,
        simulation: simulationReducer,
      },
    })
    ;['NO2', 'OH', 'N2O5'].forEach((name) => store.dispatch(addSpecies({ name })))
    store.dispatch(addReaction(SURFACE_REACTION))

    render(
      <MemoryRouter>
        <Provider store={store}>
          <ReactionEditor />
          <Toaster />
        </Provider>
      </MemoryRouter>
    )
    fireEvent.click(screen.getAllByRole('button').find((b) => /→/.test(b.textContent)))
    return store
  }

  it('exposes the gas-phase reactant, not only the products', () => {
    setupSurface()
    const labels = [...chipPanel().querySelectorAll('label')].map((l) => l.textContent)
    expect(labels).toContain('Gas-phase reactant')
    expect(labels).toContain('Gas-phase products')
    expect(fieldUnder('Gas-phase reactant').value).toBe('NO2')
  })

  it('saves the reactant back as a plain string, not an array', () => {
    const store = setupSurface()
    const field = fieldUnder('Gas-phase reactant')

    fireEvent.change(field, { target: { value: 'N2O5' } })
    fireEvent.blur(field)

    const saved = store.getState().mechanism.reactions[0]
    expect(saved['gas-phase species']).toBe('N2O5')
  })

  it('rejects more than one species for the gas-phase reactant', async () => {
    const store = setupSurface()
    const field = fieldUnder('Gas-phase reactant')

    fireEvent.change(field, { target: { value: 'NO2 + N2O5' } })
    fireEvent.blur(field)

    await waitFor(() => expect(screen.getByText(/must be a single species/i)).toBeInTheDocument())
    expect(store.getState().mechanism.reactions[0]['gas-phase species']).toBe('NO2')
  })

  it('validates the reactant against the defined species', async () => {
    const store = setupSurface()
    const field = fieldUnder('Gas-phase reactant')

    fireEvent.change(field, { target: { value: 'XYZ' } })
    fireEvent.blur(field)

    await waitFor(() =>
      expect(screen.getByText(/not defined in this mechanism/i)).toBeInTheDocument()
    )
    expect(store.getState().mechanism.reactions[0]['gas-phase species']).toBe('NO2')
  })
})

describe('editing a reaction from its chip', () => {
  it('edits reactants, keeping coefficients', () => {
    const store = setup()
    const field = fieldUnder('Reactants')
    expect(field.value).toBe('O1D')

    fireEvent.change(field, { target: { value: '2NO2' } })
    fireEvent.blur(field)

    expect(reactionFrom(store).reactants).toEqual([{ 'species name': 'NO2', coefficient: 2 }])
  })

  it('edits a rate parameter', () => {
    const store = setup()
    const field = parameterField('A')

    fireEvent.change(field, { target: { value: '3.4e-12' } })
    fireEvent.blur(field)

    expect(reactionFrom(store).A).toBe(3.4e-12)
  })

  it('clearing a parameter removes it', () => {
    const store = setup()
    const field = parameterField('B')

    fireEvent.change(field, { target: { value: '' } })
    fireEvent.blur(field)

    expect(reactionFrom(store)).not.toHaveProperty('B')
    expect(reactionFrom(store).A).toBe(1.2e-11) // the others survive
  })

  it('rejects a non-numeric parameter and leaves the reaction alone', async () => {
    const store = setup()
    const field = parameterField('A')

    fireEvent.change(field, { target: { value: 'abc' } })
    fireEvent.blur(field)

    await waitFor(() => expect(screen.getByText(/must be a valid number/i)).toBeInTheDocument())
    expect(reactionFrom(store).A).toBe(1.2e-11)
  })

  it('rejects an edit naming an undefined species', async () => {
    const store = setup()
    const field = fieldUnder('Products')

    fireEvent.change(field, { target: { value: 'XYZ' } })
    fireEvent.blur(field)

    await waitFor(() =>
      expect(screen.getByText(/not defined in this mechanism/i)).toBeInTheDocument()
    )
    expect(reactionFrom(store).products).toEqual([{ 'species name': 'O3', coefficient: 1 }])
  })

  it('rejects emptying a component list', async () => {
    const store = setup()
    const field = fieldUnder('Reactants')

    fireEvent.change(field, { target: { value: '   ' } })
    fireEvent.blur(field)

    await waitFor(() => expect(screen.getByText(/cannot be empty/i)).toBeInTheDocument())
    expect(reactionFrom(store).reactants).toHaveLength(1)
  })

  it('an edit keeps the reaction in place, which the tracer indices rely on', () => {
    const store = setup()
    store.dispatch(addReaction({ ...REACTION, id: 'r2' }))

    const field = parameterField('A')
    fireEvent.change(field, { target: { value: '5e-11' } })
    fireEvent.blur(field)

    expect(store.getState().mechanism.reactions.map((r) => r.id)).toEqual(['r1', 'r2'])
  })
})
