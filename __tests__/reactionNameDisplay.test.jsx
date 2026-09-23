import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import mechanismReducer from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import ExampleLoader from '../src/components/ExampleLoader'
import { ReactionEditor } from '../src/components/Mechanism/ReactionEditor'

// FlowGraph identifies reaction nodes by `reaction.id` (a stable uuid loadMusicBoxConfig assigns
// to every reaction), not by name -- an unnamed reaction has no persisted name at all, so the
// editor must not invent one and present it as declared.

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

// Goes through the real loader, which is the path that fills in a generated name.
const loadChapman = async () => {
  const store = configureStore({
    reducer: {
      mechanism: mechanismReducer,
      conditions: conditionsReducer,
      simulation: simulationReducer,
    },
  })

  const { unmount } = render(
    <MemoryRouter>
      <Provider store={store}>
        <ExampleLoader />
      </Provider>
    </MemoryRouter>
  )
  fireEvent.click(
    screen.getAllByRole('button').find((button) => /chapman mechanism/i.test(button.textContent))
  )
  await waitFor(() =>
    expect(store.getState().mechanism.config.mechanism?.reactions?.length).toBeGreaterThan(0)
  )
  unmount()

  render(
    <MemoryRouter>
      <Provider store={store}>
        <ReactionEditor />
      </Provider>
    </MemoryRouter>
  )
  return store
}

const expandChip = (matcher) =>
  fireEvent.click(screen.getAllByRole('button').find((button) => matcher.test(button.textContent)))

describe('reaction name display', () => {
  it('every loaded reaction has a stable id, which FlowGraph identifies nodes by', async () => {
    const store = await loadChapman()
    const reactions = store.getState().mechanism.config.mechanism.reactions
    expect(reactions.every((r) => typeof r.id === 'string' && r.id.length > 0)).toBe(true)
  })

  it('a reaction the mechanism did not name shows no Name row', async () => {
    const store = await loadChapman()
    const reactions = store.getState().mechanism.config.mechanism.reactions
    const unnamed = reactions.find((r) => r.type === 'ARRHENIUS' && !r.name)

    expect(unnamed).toBeDefined()
    const firstReactant = unnamed.reactants[0].name
    expandChip(new RegExp(`^${firstReactant}`))
    expect(screen.queryByText('Name')).toBeNull()
  })

  it('a reaction the mechanism named still shows it', async () => {
    const store = await loadChapman()
    const reactions = store.getState().mechanism.config.mechanism.reactions
    expect(reactions.find((r) => r.name === 'O2_1')).toBeDefined()

    // exact formula, so a different O2-containing reaction is not picked
    expandChip(/^O2 → 2O/)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('O2_1')).toBeInTheDocument()
  })
})
