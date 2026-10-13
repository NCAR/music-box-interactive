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
import {
  getReactionTypeLabel,
} from '../src/components/Mechanism/reactions/reactionRegistry'

// The reaction list has two filters that combine: a type selector, and a species search that
// applies within the chosen type.

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const reaction = (id, type, reactant, product) => ({
  id,
  type,
  'gas phase': 'gas',
  reactants: [{ name: reactant }],
  products: [{ name: product }],
})

const REACTIONS = [
  reaction('r1', 'ARRHENIUS', 'O1D', 'O3'),
  reaction('r2', 'ARRHENIUS', 'NO2', 'NO'),
  reaction('r3', 'PHOTOLYSIS', 'O3', 'O2'),
  reaction('r4', 'SURFACE', 'NO2', 'HNO3'),
]

const renderEditor = (reactions = REACTIONS) => {
  const store = configureStore({
    reducer: {
      mechanism: mechanismReducer,
      conditions: conditionsReducer,
      simulation: simulationReducer,
    },
  })
  reactions.forEach((r) => store.dispatch(addReaction(r)))

  render(
    <MemoryRouter>
      <Provider store={store}>
        <ReactionEditor />
      </Provider>
    </MemoryRouter>
  )
}

// The list card's type filter is the second dropdown; the add form has one above it. These are
// custom dropdowns rather than native selects, so the menu only exists while it is open.
const typeFilterTrigger = () => document.querySelectorAll('[aria-haspopup="listbox"]')[1]
const toggleTypeFilter = () => fireEvent.click(typeFilterTrigger())

const openOptions = () => {
  toggleTypeFilter()
  return [...document.querySelectorAll('[role="option"]')]
}

const typeOptionLabels = () => {
  const labels = openOptions().map((option) => option.textContent)
  toggleTypeFilter()
  return labels
}

const chooseType = (label) => {
  const option = openOptions().find((entry) => entry.textContent === label)
  if (!option) {
    throw new Error(`no option labelled "${label}"`)
  }
  fireEvent.click(option)
}

const searchBox = () => screen.getByPlaceholderText(/search reactions/i)
const listedFormulas = () =>
  screen
    .getAllByRole('button')
    .map((button) => button.textContent)
    .filter((text) => text.includes('→'))

describe('reaction list filters', () => {
  it('offers the types actually present, with counts, and an all-types option', () => {
    renderEditor()
    // Labelled the same way the add form labels them.
    expect(typeOptionLabels()).toEqual([
      'All reaction types (4)',
      `${getReactionTypeLabel('ARRHENIUS')} (2)`,
      `${getReactionTypeLabel('PHOTOLYSIS')} (1)`,
      `${getReactionTypeLabel('SURFACE')} (1)`,
    ])
    // SURFACE must be labelled through the registry, not shown as the raw type.
    expect(getReactionTypeLabel('SURFACE')).not.toBe('SURFACE')
  })

  it('falls back to a readable label for a type with no registry entry', () => {
    renderEditor([reaction('r9', 'SOMETHING_NEW', 'A', 'B')])
    expect(typeOptionLabels()).toContain('Something new (1)')
  })

  it('the type filter and the search box are the same size', () => {
    renderEditor()
    const select = typeFilterTrigger()
    const input = searchBox()
    const sizing = (el) =>
      el.className
        .split(' ')
        .filter((c) => /^w-|^h-|^px-|^py-|^text-(xs|sm|base)$/.test(c))
        .sort()
    expect(sizing(select)).toEqual(sizing(input))
  })

  it('filters to the reactions of the chosen type', () => {
    renderEditor()
    chooseType(`${getReactionTypeLabel('SURFACE')} (1)`)
    expect(listedFormulas()).toHaveLength(1)
    expect(listedFormulas()[0]).toMatch(/HNO3/)
  })

  it('filters by type alone', () => {
    renderEditor()
    chooseType(`${getReactionTypeLabel('ARRHENIUS')} (2)`)
    expect(listedFormulas()).toHaveLength(2)
    expect(listedFormulas().join(' ')).not.toMatch(/HNO3/)
  })

  it('searches by species across every type when none is chosen', () => {
    renderEditor()
    fireEvent.change(searchBox(), { target: { value: 'NO2' } })
    // NO2 appears in one ARRHENIUS and one SURFACE reaction.
    expect(listedFormulas()).toHaveLength(2)
  })

  it('combines the two: searching within a chosen type', () => {
    renderEditor()
    chooseType(`${getReactionTypeLabel('ARRHENIUS')} (2)`)
    fireEvent.change(searchBox(), { target: { value: 'NO2' } })

    const listed = listedFormulas()
    expect(listed).toHaveLength(1)
    expect(listed[0]).toMatch(/NO2 → NO/)
  })

  it('reports no matches when the two filters exclude each other', () => {
    renderEditor()
    chooseType(`${getReactionTypeLabel('PHOTOLYSIS')} (1)`)
    fireEvent.change(searchBox(), { target: { value: 'HNO3' } })
    expect(screen.getByText(/No matching reactions found/i)).toBeInTheDocument()
  })

  it('clearing the type filter restores the full list', () => {
    renderEditor()
    chooseType(`${getReactionTypeLabel('PHOTOLYSIS')} (1)`)
    expect(listedFormulas()).toHaveLength(1)

    chooseType('All reaction types (4)')
    expect(listedFormulas()).toHaveLength(4)
  })
})
