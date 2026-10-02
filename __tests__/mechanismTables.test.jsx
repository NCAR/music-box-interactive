import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import mechanismReducer, {
  setConfig,
  selectNamedMechanism,
  selectNamedReactions,
} from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { SpeciesEditor } from '../src/components/Mechanism/SpeciesEditor'
import { ReactionEditor } from '../src/components/Mechanism/ReactionEditor'

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

// The test environment has no working localStorage, so each test gets an in-memory one.
function mockLocalStorage() {
  const items = new Map()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => (items.has(key) ? items.get(key) : null),
      setItem: (key, value) => items.set(key, String(value)),
      removeItem: (key) => items.delete(key),
    },
  })
}

const renderWith = (element, mechanism) => {
  const store = configureStore({
    reducer: { mechanism: mechanismReducer, conditions: conditionsReducer, simulation: simulationReducer },
  })
  store.dispatch(setConfig({ mechanism }))
  render(
    <MemoryRouter>
      <Provider store={store}>{element}</Provider>
    </MemoryRouter>
  )
  return store
}

const editCell = (label) => {
  fireEvent.click(screen.getByRole('button', { name: `Edit ${label}` }))
  return screen.getByRole('textbox', { name: label })
}

const commit = (input, value) => {
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

// The data table, not the one-row table of the Add card above it.
const dataTable = () =>
  screen.getAllByRole('table').find((table) => !table.getAttribute('aria-label')?.startsWith('Add '))

// The data rows, without the header row.
const bodyRows = () => within(dataTable()).getAllByRole('row').slice(1)

beforeEach(() => {
  mockLocalStorage()
  toast.mockClear()
})

describe('the species table', () => {
  const mechanism = () => ({
    species: [{ name: 'O3', 'molecular weight [kg mol-1]': 0.048 }, { name: 'NO' }],
    phases: [
      { name: 'gas', species: [{ name: 'O3' }, { name: 'NO' }] },
      { name: 'aqueous', species: [] },
    ],
    reactions: [{ id: 'r1', type: 'ARRHENIUS', reactants: [{ name: 'O3' }], products: [{ name: 'NO' }] }],
  })
  const speciesOf = (store, name) =>
    store.getState().mechanism.config.mechanism.species.find((s) => s.name === name)

  it('renames a species, and its reactions follow', () => {
    const store = renderWith(<SpeciesEditor />, mechanism())
    commit(editCell('Name of O3'), 'O3x')
    expect(speciesOf(store, 'O3x')).toBeDefined()
    expect(selectNamedReactions(store.getState())[0].reactants[0].name).toBe('O3x')
  })

  it('rejects an empty or a duplicate name', () => {
    const store = renderWith(<SpeciesEditor />, mechanism())
    commit(editCell('Name of O3'), 'NO')
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'A species named "NO" already exists.' }))
    commit(editCell('Name of O3'), '   ')
    expect(speciesOf(store, 'O3')).toBeDefined()
  })

  it('sets a property that was not set when the species was added (#635)', () => {
    const store = renderWith(<SpeciesEditor />, mechanism())
    commit(editCell('Absolute tolerance (mol/m3) of NO'), '1e-10')
    expect(speciesOf(store, 'NO')['absolute tolerance']).toBe(1e-10)

    // and clearing it removes it again
    commit(editCell('Absolute tolerance (mol/m3) of NO'), '')
    expect(speciesOf(store, 'NO')).not.toHaveProperty('absolute tolerance')
  })

  it('shows an unset property as an empty cell, and its example value only while editing', () => {
    renderWith(<SpeciesEditor />, mechanism())
    const cell = screen.getByRole('button', { name: 'Edit Density (kg/m3) of NO' })
    // Not "1000": that is only the example value.
    expect(cell).toHaveTextContent(/^$/)
    fireEvent.click(cell)
    const input = screen.getByRole('textbox', { name: 'Density (kg/m3) of NO' })
    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('placeholder', '1000')
  })

  it('edits an existing property', () => {
    const store = renderWith(<SpeciesEditor />, mechanism())
    const input = editCell('Molecular weight (kg/mol) of O3')
    expect(input).toHaveValue('0.048')
    commit(input, '0.05')
    expect(speciesOf(store, 'O3')['molecular weight [kg mol-1]']).toBe(0.05)
  })

  it('toggles a boolean property', () => {
    const store = renderWith(<SpeciesEditor />, mechanism())
    const row = bodyRows().find((r) => r.textContent.startsWith('NO'))
    fireEvent.click(within(row).getByRole('switch'))
    expect(speciesOf(store, 'NO')['is third body']).toBe(true)
  })
})

describe('the table controls', () => {
  // 25 reactions, so the default page of 20 rows needs two pages.
  const manyReactions = () => ({
    species: [{ name: 'A' }, { name: 'B' }],
    phases: [{ name: 'gas', species: [{ name: 'A' }, { name: 'B' }] }],
    reactions: Array.from({ length: 25 }, (_, i) => ({
      id: `r${i}`,
      name: `rxn_${String(i).padStart(2, '0')}`,
      type: 'ARRHENIUS',
      reactants: [{ name: 'A' }],
      products: [{ name: 'B' }],
    })),
  })

  it('shows 20 rows a page, and the next page', () => {
    renderWith(<ReactionEditor />, manyReactions())
    expect(bodyRows()).toHaveLength(20)
    expect(screen.getByText('1–20 of 25')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(bodyRows()).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('sorts by a column, and back', () => {
    renderWith(<ReactionEditor />, manyReactions())
    const nameHeader = within(dataTable()).getByRole('button', { name: 'Name' })
    fireEvent.click(nameHeader)
    fireEvent.click(nameHeader)
    expect(bodyRows()[0]).toHaveTextContent('rxn_24')
    expect(within(dataTable()).getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'descending'
    )
    fireEvent.click(nameHeader)
    expect(bodyRows()[0]).toHaveTextContent('rxn_00')
  })

  it('hides a column, and remembers it after a reload', () => {
    renderWith(<ReactionEditor />, manyReactions())
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Shown columns' })).getByRole('checkbox', { name: 'Type' }))
    expect(within(dataTable()).queryByRole('columnheader', { name: 'Type' })).toBeNull()

    cleanup()
    renderWith(<ReactionEditor />, manyReactions())
    expect(within(dataTable()).queryByRole('columnheader', { name: 'Type' })).toBeNull()
    expect(within(dataTable()).getByRole('columnheader', { name: 'Equation' })).toBeInTheDocument()
  })
})

describe('the Add reaction card', () => {
  const mechanism = () => ({
    species: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    phases: [{ name: 'gas', species: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }],
    reactions: [],
  })
  // The Add card's type dropdown is the first dropdown on the page.
  const showType = (label) => {
    fireEvent.click(document.querySelectorAll('[aria-haspopup="listbox"]')[0])
    fireEvent.click(screen.getByRole('option', { name: label }))
  }
  const type = (field, value) =>
    fireEvent.change(screen.getByRole('textbox', { name: `New reaction ${field}` }), { target: { value } })
  const add = () => fireEvent.click(screen.getByRole('button', { name: 'Add' }))

  // The type picker is next to the Add button, at the top right of the card.
  it('starts with Arrhenius, and its fields and units follow the chosen type', () => {
    renderWith(<ReactionEditor />, mechanism())
    const addTable = screen.getByRole('table', { name: 'Add reaction' })
    const headers = () => within(addTable).getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers()).toEqual([
      'Name',
      'Reactants',
      'Products',
      'A[(mol m-3)^(1-n) s-1]',
      'B[unitless]',
      'C[K]',
      'D[K]',
      'E[Pa-1]',
    ])
    // The order-dependent unit explains n.
    expect(within(addTable).getByText('[(mol m-3)^(1-n) s-1]')).toHaveAttribute(
      'title',
      'n is the number of reactants of the reaction.'
    )
    showType('Surface')
    expect(headers()).toEqual([
      'Name',
      'Gas-phase reactant',
      'Gas-phase products',
      'reaction probability[unitless]',
    ])
  })

  it('shows the units in the table headers of the chosen type', () => {
    renderWith(<ReactionEditor />, {
      ...mechanism(),
      reactions: [{ id: 't1', type: 'TROE', reactants: [{ name: 'A' }], products: [{ name: 'B' }] }],
    })
    fireEvent.click(document.querySelectorAll('[aria-haspopup="listbox"]')[1])
    fireEvent.click(screen.getByRole('option', { name: /^Troe/ }))
    const headers = within(dataTable())
      .getAllByRole('columnheader')
      .map((th) => th.textContent)
    expect(headers).toEqual(
      expect.arrayContaining(['k0_A[(mol m-3)^(-n) s-1]', 'kinf_A[(mol m-3)^(1-n) s-1]', 'k0_C[K]', 'Fc[unitless]'])
    )
  })

  it('adds a reaction with a name and parameters, and clears the row', () => {
    const store = renderWith(<ReactionEditor />, mechanism())
    showType('Arrhenius')
    type('name', 'r_ab')
    type('Reactants', '2A')
    type('Products', 'B + C')
    type('A', '1.5e-11')
    add()

    const [added] = selectNamedReactions(store.getState())
    expect(added).toMatchObject({
      type: 'ARRHENIUS',
      name: 'r_ab',
      reactants: [{ name: 'A', coefficient: 2 }],
      products: [{ name: 'B', coefficient: 1 }, { name: 'C', coefficient: 1 }],
      A: 1.5e-11,
    })
    // A blank parameter is not set.
    expect(added).not.toHaveProperty('B')
    expect(screen.getByRole('textbox', { name: 'New reaction Reactants' })).toHaveValue('')
  })

  it('rejects an empty required field, a bad number and an unknown species', () => {
    const store = renderWith(<ReactionEditor />, mechanism())
    showType('Arrhenius')
    type('Reactants', 'A')
    add()
    expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ description: 'Products cannot be empty.' }))

    type('Products', 'B')
    type('A', 'abc')
    add()
    expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ description: 'A must be a valid number.' }))

    type('A', '')
    type('Products', 'XYZ')
    add()
    expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Unknown Species' }))
    expect(selectNamedReactions(store.getState())).toHaveLength(0)
  })

  it('adds an emission with products only, and a surface reaction with one gas-phase reactant', () => {
    const store = renderWith(<ReactionEditor />, mechanism())
    showType('Emission')
    type('Products', 'A')
    add()

    showType('Surface')
    type('Gas-phase reactant', 'A + B')
    type('Gas-phase products', 'C')
    add()
    expect(toast).toHaveBeenLastCalledWith(
      expect.objectContaining({ description: 'Gas-phase reactant must be a single species.' })
    )
    type('Gas-phase reactant', 'A')
    add()

    const [emission, surface] = selectNamedReactions(store.getState())
    expect(emission).toMatchObject({ type: 'EMISSION', products: [{ name: 'A', coefficient: 1 }] })
    expect(emission).not.toHaveProperty('reactants')
    expect(surface).toMatchObject({ type: 'SURFACE', 'gas-phase species': 'A' })
  })
})

describe('the Add species card', () => {
  it('adds a species with a phase and a property', () => {
    const store = renderWith(<SpeciesEditor />, {
      species: [],
      phases: [{ name: 'gas', species: [] }, { name: 'aqueous', species: [] }],
      reactions: [],
    })
    const addRow = screen.getByRole('table', { name: 'Add species' })
    fireEvent.change(within(addRow).getByRole('textbox', { name: 'New species name' }), {
      target: { value: 'SO4' },
    })
    fireEvent.change(within(addRow).getByRole('textbox', { name: 'New species Molecular weight (kg/mol)' }), {
      target: { value: '0.096' },
    })
    fireEvent.click(within(addRow).getByRole('button', { expanded: false }))
    fireEvent.click(screen.getByRole('option', { name: 'aqueous' }))
    // The Add button is at the top right of the card, not in the row.
    expect(within(addRow).queryByRole('button', { name: 'Add' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    const named = selectNamedMechanism(store.getState())
    expect(named.species).toEqual([
      expect.objectContaining({ name: 'SO4', 'molecular weight [kg mol-1]': 0.096 }),
    ])
    expect(named.phases[1].species.map((e) => e.name)).toEqual(['SO4'])
  })
})
