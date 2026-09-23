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

// Rejects reactions that reference undefined species, preventing solver build failures at runtime.
// Species names are compared exactly, the same way MechanismConfiguration compares them.

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
    expect((store.getState().mechanism.config.mechanism.reactions || [])).toHaveLength(0)
  })

  it('reports every unknown species at once rather than one at a time', async () => {
    const store = renderEditor(['O3'])
    submitReaction('FOO + BAR', 'O3')

    await waitFor(() => expect(screen.getByText(/FOO, BAR/)).toBeInTheDocument())
    expect((store.getState().mechanism.config.mechanism.reactions || [])).toHaveLength(0)
  })

  it('accepts a reaction whose species are all defined', async () => {
    const store = renderEditor(['O3', 'NO2'])
    submitReaction('O3', 'NO2')

    await waitFor(() => expect((store.getState().mechanism.config.mechanism.reactions || [])).toHaveLength(1))
  })
})

describe('species name capitalization', () => {
  // Species names are case-sensitive. The editor stores them exactly as typed and matches them
  // exactly against the mechanism, so lower-case species like a-pinene stay reachable.
  it('stores a lower-case species exactly as typed', async () => {
    const store = renderEditor(['a-pinene', 'O3'])
    submitReaction('a-pinene + O3', 'O3')

    await waitFor(() => expect((store.getState().mechanism.config.mechanism.reactions || [])).toHaveLength(1))

    const stored = store
      .getState()
      .mechanism.config.mechanism.reactions[0].reactants.map((component) => component.name)
    expect(stored).toEqual(['a-pinene', 'O3'])
  })

  it('rejects a species whose capitalization does not match the mechanism', async () => {
    const store = renderEditor(['a-pinene', 'O3'])
    submitReaction('A-PINENE + O3', 'O3')

    await waitFor(() =>
      expect(screen.getByText(/not defined in this mechanism/i)).toBeInTheDocument()
    )
    expect((store.getState().mechanism.config.mechanism.reactions || [])).toHaveLength(0)
  })
})
