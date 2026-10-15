import { describe, it, expect } from 'vitest'

import { buildGeneratedReactionName } from '../src/components/Mechanism/reactions/reactionUtils'
import { formatReactionEquations } from '../src/services/simulation/local/mechanism'

// A BRANCHED_NO_RO2 reaction has two product lists. Each display shows one equation for each.

const branched = {
  type: 'BRANCHED_NO_RO2',
  reactants: [
    { name: 'foo', coefficient: 1 },
    { name: 'quuz', coefficient: 2 },
  ],
  'alkoxy products': [
    { name: 'bar', coefficient: 1 },
    { name: 'baz', coefficient: 3.2 },
  ],
  'nitrate products': [{ name: 'quuz', coefficient: 1 }],
}

describe('branched reaction display', () => {
  it('names both branches in the generated name', () => {
    expect(buildGeneratedReactionName(branched)).toBe(
      'foo + 2quuz -> bar + 3.2baz (alkoxy); foo + 2quuz -> quuz (nitrate)'
    )
  })

  it('keeps one equation for a reaction with one product list', () => {
    const reaction = {
      type: 'ARRHENIUS',
      reactants: [{ name: 'A', coefficient: 1 }],
      products: [{ name: 'B', coefficient: 1 }],
    }

    expect(buildGeneratedReactionName(reaction)).toBe('A -> B')
  })

  it('gives each branch its own equation with a label', () => {
    const format = (reactants, products) =>
      `${reactants.map((c) => c.name).join(' + ')} → ${products.map((c) => c.name).join(' + ')}`

    expect(formatReactionEquations(branched, format)).toBe(
      'foo + quuz → bar + baz (alkoxy); foo + quuz → quuz (nitrate)'
    )
  })
})
