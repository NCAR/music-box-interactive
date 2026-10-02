import { describe, it, expect } from 'vitest'
import {
  applyReactionComponents,
  applyReactionEquation,
  isEquationEditable,
} from '../src/components/Mechanism/reactions/reactionUtils'
import { getReactionComponents } from '../src/components/Mechanism/reactions/reactionRegistry'

const apply = (reaction, text) =>
  applyReactionEquation(reaction, text, getReactionComponents(reaction.type))

const ARRHENIUS = {
  id: 'r1',
  type: 'ARRHENIUS',
  A: 1e-12,
  reactants: [{ name: 'O1D', coefficient: 1 }],
  products: [{ name: 'O', coefficient: 1 }],
}

describe('applyReactionEquation', () => {
  it('replaces both sides and keeps the other fields', () => {
    expect(apply(ARRHENIUS, '2NO2 → N2O4 + 0.5O2')).toEqual({
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

  it('accepts -> as the arrow', () => {
    expect(apply(ARRHENIUS, 'A + B -> C').reaction.reactants).toHaveLength(2)
  })

  it('needs exactly one arrow', () => {
    expect(apply(ARRHENIUS, 'A + B')).toHaveProperty('error')
    expect(apply(ARRHENIUS, 'A -> B -> C')).toHaveProperty('error')
  })

  it('rejects an empty side that the type requires', () => {
    expect(apply(ARRHENIUS, 'A → ∅').error).toMatch(/products cannot be empty/)
  })

  it('lets a photolysis reaction have no products', () => {
    const photolysis = { id: 'p', type: 'PHOTOLYSIS', reactants: [{ name: 'O3', coefficient: 1 }] }
    expect(apply(photolysis, 'NO2 →').reaction.products).toEqual([])
  })

  it('takes an emission with an empty reactant side only', () => {
    const emission = { id: 'e', type: 'EMISSION', products: [{ name: 'NO', coefficient: 1 }] }
    expect(apply(emission, '∅ → NO2').reaction.products).toEqual([{ name: 'NO2', coefficient: 1 }])
    expect(apply(emission, 'A → NO2').error).toMatch(/no reactants/)
  })

  it('stores a surface reactant as one species name', () => {
    const surface = {
      id: 's',
      type: 'SURFACE',
      'gas-phase species': 'NO2',
      'gas-phase products': [{ name: 'OH', coefficient: 1 }],
    }
    const { reaction } = apply(surface, 'N2O5 → 2HNO3')
    expect(reaction['gas-phase species']).toBe('N2O5')
    expect(reaction['gas-phase products']).toEqual([{ name: 'HNO3', coefficient: 2 }])
    expect(apply(surface, 'A + B → C').error).toMatch(/single species/)
  })
})

describe('isEquationEditable', () => {
  it('is false only for a type with two product lists', () => {
    expect(isEquationEditable(getReactionComponents('ARRHENIUS'))).toBe(true)
    expect(isEquationEditable(getReactionComponents('SURFACE'))).toBe(true)
    expect(isEquationEditable(getReactionComponents('BRANCHED_NO_RO2'))).toBe(false)
  })
})

describe('applyReactionComponents', () => {
  it('sets both product lists of a branched reaction', () => {
    const branched = {
      id: 'b',
      type: 'BRANCHED_NO_RO2',
      reactants: [{ name: 'RO2', coefficient: 1 }],
      'alkoxy products': [{ name: 'RO', coefficient: 1 }],
      'nitrate products': [{ name: 'RONO2', coefficient: 1 }],
    }
    const fields = getReactionComponents('BRANCHED_NO_RO2')
    const { reaction } = applyReactionComponents(
      branched,
      { reactants: 'RO2 + NO', 'alkoxy products': 'RO + NO2', 'nitrate products': 'RONO2' },
      fields
    )
    expect(reaction.reactants).toHaveLength(2)
    expect(reaction['alkoxy products']).toEqual([
      { name: 'RO', coefficient: 1 },
      { name: 'NO2', coefficient: 1 },
    ])
    expect(
      applyReactionComponents(branched, { reactants: 'RO2', 'alkoxy products': 'RO' }, fields).error
    ).toMatch(/nitrate products cannot be empty/)
  })
})
