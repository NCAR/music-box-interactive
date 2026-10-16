import { describe, it, expect } from 'vitest'
import {
  applyReactionEquation,
  isEquationEditable,
} from '../src/components/Mechanism/reactions/reactionUtils'

const BOTH = [
  { key: 'reactants', required: true },
  { key: 'products', required: true },
]

const ARRHENIUS = {
  id: 'r1',
  type: 'ARRHENIUS',
  A: 1e-12,
  reactants: [{ name: 'O1D', coefficient: 1 }],
  products: [{ name: 'O', coefficient: 1 }],
}

describe('applyReactionEquation', () => {
  it('replaces both sides and keeps the other fields', () => {
    expect(applyReactionEquation(ARRHENIUS, '2NO2 → N2O4 + 0.5O2', BOTH)).toEqual({
      reaction: {
        ...ARRHENIUS,
        reactants: [{ name: 'NO2', coefficient: 2 }],
        products: [
          { name: 'N2O4', coefficient: 1 },
          { name: 'O2', coefficient: 0.5 },
        ],
      },
    })
  })

  it('accepts -> as the arrow, and needs exactly one arrow', () => {
    expect(applyReactionEquation(ARRHENIUS, 'A + B -> C', BOTH).reaction.reactants).toHaveLength(2)
    expect(applyReactionEquation(ARRHENIUS, 'A + B', BOTH)).toHaveProperty('error')
    expect(applyReactionEquation(ARRHENIUS, 'A -> B -> C', BOTH)).toHaveProperty('error')
  })

  it('rejects an empty side that is required, and allows one that is not', () => {
    expect(applyReactionEquation(ARRHENIUS, 'A → ∅', BOTH).error).toMatch(
      /products cannot be empty/
    )
    const optional = [BOTH[0], { key: 'products' }]
    expect(applyReactionEquation(ARRHENIUS, 'A →', optional).reaction.products).toEqual([])
  })

  it('takes an emission with an empty reactant side only', () => {
    const emission = { id: 'e', type: 'EMISSION', products: [{ name: 'NO', coefficient: 1 }] }
    const fields = [{ key: 'products', required: true }]
    expect(applyReactionEquation(emission, '∅ → NO2', fields).reaction.products).toEqual([
      { name: 'NO2', coefficient: 1 },
    ])
    expect(applyReactionEquation(emission, 'A → NO2', fields).error).toMatch(/no reactants/)
  })

  it('stores a surface reactant as one species name', () => {
    const surface = {
      id: 's',
      type: 'SURFACE',
      'gas-phase species': 'NO2',
      'gas-phase products': [{ name: 'OH', coefficient: 1 }],
    }
    const fields = [
      { key: 'gas-phase species', single: true, required: true },
      { key: 'gas-phase products', required: true },
    ]
    const { reaction } = applyReactionEquation(surface, 'N2O5 → 2HNO3', fields)
    expect(reaction['gas-phase species']).toBe('N2O5')
    expect(reaction['gas-phase products']).toEqual([{ name: 'HNO3', coefficient: 2 }])
    expect(applyReactionEquation(surface, 'A + B → C', fields).error).toMatch(/single species/)
  })
})

describe('isEquationEditable', () => {
  it('is false only for a reaction with two product lists', () => {
    expect(isEquationEditable(BOTH)).toBe(true)
    expect(
      isEquationEditable([
        { key: 'reactants' },
        { key: 'alkoxy products' },
        { key: 'nitrate products' },
      ])
    ).toBe(false)
  })
})
