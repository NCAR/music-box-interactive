import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import mechanismReducer, { addSpecies } from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { ReactionEditor } from '../src/components/Mechanism/ReactionEditor'
import { Toaster } from '../src/components/ui/toaster'
import { resolveReactionSpeciesNames } from '../src/services/simulation/local/mechanism'

// Rejects reactions that reference undefined species, preventing solver build failures at runtime.
// Uses the same name comparison as validateMechanismPayload for consistent validation.

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const renderEditor = (speciesNames) => {
  const store = configureStore({
    reducer: {
      mechanism: mechanismReducer,
      conditions: conditionsReducer,
      simulation: simulationReducer,
    },
  })
  speciesNames.forEach((name) => store.dispatch(addSpecies({ name })))

  render(
    <MemoryRouter>
      <Provider store={store}>
        <ReactionEditor />
        <Toaster />
      </Provider>
    </MemoryRouter>
  )
  return store
}

// Arrhenius is the default reaction type, with reactants and products as its first two fields.
// Selected by position within the add form rather than by placeholder, which is copy and gets
// reworded; the search box is the only other text input on the page.
const addFormInputs = () =>
  [...document.querySelectorAll('input[type="text"]')].filter(
    (input) => !/search/i.test(input.placeholder || '')
  )

const submitReaction = (reactants, products) => {
  const [reactantsField, productsField] = addFormInputs()
  fireEvent.change(reactantsField, { target: { value: reactants } })
  fireEvent.change(productsField, { target: { value: products } })
  fireEvent.click(screen.getByRole('button', { name: /add reaction/i }))
}

describe('reaction species validation', () => {
  it('rejects a reaction naming an undefined species', async () => {
    const store = renderEditor(['O3'])
    submitReaction('O3', 'XYZ')

    await waitFor(() =>
      expect(screen.getByText(/not defined in this mechanism/i)).toBeInTheDocument()
    )
    expect(screen.getByText(/XYZ/)).toBeInTheDocument()
    expect(store.getState().mechanism.reactions).toHaveLength(0)
  })

  it('reports every unknown species at once rather than one at a time', async () => {
    const store = renderEditor(['O3'])
    submitReaction('FOO + BAR', 'O3')

    await waitFor(() => expect(screen.getByText(/FOO, BAR/)).toBeInTheDocument())
    expect(store.getState().mechanism.reactions).toHaveLength(0)
  })

  it('accepts a reaction whose species are all defined', async () => {
    const store = renderEditor(['O3', 'NO2'])
    submitReaction('O3', 'NO2')

    await waitFor(() => expect(store.getState().mechanism.reactions).toHaveLength(1))
  })
})

describe('species name resolution', () => {
  // Reaction input is upper-cased as typed, but mechanisms may define lower-case species. Resolve
  // names back to the mechanism's spelling so species like a-pinene, soa1_a1, and sink remain reachable.
  it('matches a lower-case species and stores the mechanism spelling', async () => {
    const store = renderEditor(['a-pinene', 'O3'])
    submitReaction('a-pinene + O3', 'O3')

    await waitFor(() => expect(store.getState().mechanism.reactions).toHaveLength(1))

    const stored = store
      .getState()
      .mechanism.reactions[0].reactants.map((component) => component['species name'])
    expect(stored).toContain('a-pinene')
    expect(stored).not.toContain('A-PINENE')
  })

  it('resolves every component shape a reaction type can use', () => {
    const resolved = resolveReactionSpeciesNames(
      {
        reactants: [{ 'species name': 'A-PINENE' }],
        products: ['SINK'],
        'alkoxy products': [{ name: 'SOA1_A1' }],
        'gas-phase species': 'A-PINENE',
      },
      ['a-pinene', 'sink', 'soa1_a1']
    )

    expect(resolved.reactants[0]['species name']).toBe('a-pinene')
    expect(resolved.products[0]).toBe('sink')
    expect(resolved['alkoxy products'][0].name).toBe('soa1_a1')
    expect(resolved['gas-phase species']).toBe('a-pinene')
  })

  it('leaves an unmatched name untouched so validation can report it as typed', () => {
    const resolved = resolveReactionSpeciesNames({ reactants: [{ 'species name': 'XYZ' }] }, ['O3'])
    expect(resolved.reactants[0]['species name']).toBe('XYZ')
  })

  it('preserves coefficients while rewriting names', () => {
    const resolved = resolveReactionSpeciesNames(
      { products: [{ 'species name': 'SINK', coefficient: 2 }] },
      ['sink']
    )
    expect(resolved.products[0]).toEqual({ 'species name': 'sink', coefficient: 2 })
  })
})
