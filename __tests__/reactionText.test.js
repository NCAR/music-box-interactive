import { describe, it, expect } from 'vitest'
import { formatReactionEquation, reactionMatchesQuery } from '../src/services/mechanism/reactionText'

const reaction = (reactants, products, extra = {}) => ({
  reactants: reactants.map((name) => ({ name })),
  products: products.map((name) => ({ name })),
  ...extra,
})

// TS1 has HCL + O1D -> CL + OH (#632).
const HCL = reaction(['HCL', 'O1D'], ['CL', 'OH'], { name: 'usr_hcl' })
const AB = reaction(['a'], ['b'])

describe('reactionMatchesQuery', () => {
  it.each(['HCL + O1D', 'HCL+ O1D', 'HCL +O1D', 'O1D + HCL', 'hcl+o1d'])(
    'finds a reaction by its reactants, in any order and spacing: %j',
    (query) => expect(reactionMatchesQuery(HCL, query)).toBe(true)
  )

  it.each(['CL + OH', 'CL +OH', 'CL+ OH', 'OH + CL'])(
    'finds a reaction by its products, in any order and spacing: %j',
    (query) => expect(reactionMatchesQuery(HCL, query)).toBe(true)
  )

  it.each(['a->b', 'a -> b', 'a → b', 'A->B'])('finds a literal equation: %j', (query) =>
    expect(reactionMatchesQuery(AB, query)).toBe(true)
  )

  it('matches the equation sides in order', () => {
    expect(reactionMatchesQuery(AB, 'b -> a')).toBe(false)
    expect(reactionMatchesQuery(HCL, 'O1D + HCL -> OH + CL')).toBe(true)
    expect(reactionMatchesQuery(HCL, 'CL -> HCL')).toBe(false)
  })

  it('does not mix reactants and products in a "+" search', () => {
    expect(reactionMatchesQuery(HCL, 'HCL + OH')).toBe(false)
  })

  it('finds a reaction by its name and by a single species', () => {
    expect(reactionMatchesQuery(HCL, 'usr_hcl')).toBe(true)
    expect(reactionMatchesQuery(HCL, 'O1')).toBe(true)
    expect(reactionMatchesQuery(HCL, 'NO2')).toBe(false)
  })

  it('accepts a term typed part way, and a coefficient', () => {
    expect(reactionMatchesQuery(HCL, 'HCL + O1')).toBe(true)
    expect(reactionMatchesQuery(reaction(['NO2'], ['NO']), '2NO2 -> NO')).toBe(true)
  })

  it('matches everything for an empty search', () => {
    expect(reactionMatchesQuery(HCL, '   ')).toBe(true)
  })
})

describe('formatReactionEquation', () => {
  it('shows every coefficient that is not 1, also below 1', () => {
    expect(
      formatReactionEquation({
        reactants: [{ name: 'NO2', coefficient: 2 }],
        products: [{ name: 'OH', coefficient: 0.5 }, { name: 'O' }],
      })
    ).toBe('2NO2 → 0.5OH + O')
  })

  it('shows both branches of a branched reaction', () => {
    expect(
      formatReactionEquation({
        reactants: [{ name: 'RO2' }],
        'alkoxy products': [{ name: 'RO' }],
        'nitrate products': [{ name: 'RONO2' }],
      })
    ).toBe('RO2 → RO + RONO2')
  })

  it('shows a surface reaction and the empty side of an emission', () => {
    expect(
      formatReactionEquation({ 'gas-phase species': 'N2O5', 'gas-phase products': [{ name: 'HNO3' }] })
    ).toBe('N2O5 → HNO3')
    expect(formatReactionEquation({ products: [{ name: 'NO' }] })).toBe('∅ → NO')
  })
})
