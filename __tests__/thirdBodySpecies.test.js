import { getThirdBodyNames, isReactionVisible, isRealSpecies } from '../src/components/Plots/flowUtils';

import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' };

// A third body ("M" = any molecule present in the system) catalyses a reaction without being
// consumed, so the solver reports no concentration for it. The species list in the panel is
// derived from solver output, so M can never be selected -- and requiring it to be selected
// permanently hid every reaction that uses one.

describe('getThirdBodyNames', () => {
  it('picks up M from the Chapman mechanism', () => {
    expect(getThirdBodyNames(chapmanConfig.mechanism.species)).toEqual(new Set(['M']));
  });

  it('does not treat ordinary species as third bodies', () => {
    const thirdBodies = getThirdBodyNames(chapmanConfig.mechanism.species);
    for (const name of ['O', 'O1D', 'O2', 'O3', 'N2']) {
      expect(thirdBodies.has(name)).toBe(false);
    }
  });

  it('tolerates a missing or empty species list', () => {
    expect(getThirdBodyNames(undefined)).toEqual(new Set());
    expect(getThirdBodyNames([])).toEqual(new Set());
    expect(getThirdBodyNames([null, {}])).toEqual(new Set());
  });
});

describe('isReactionVisible — third bodies do not gate visibility', () => {
  const { reactions, species } = chapmanConfig.mechanism;
  const thirdBodyNames = getThirdBodyNames(species);

  // Chapman reaction 3: O + O2 + M -> O3 + M, the ozone-forming step.
  const ozoneFormation = reactions[3];

  it('is the reaction under test', () => {
    const names = ozoneFormation.reactants.map((r) => r['species name']);
    expect(names).toEqual(expect.arrayContaining(['O', 'O2', 'M']));
  });

  it('shows O + O2 + M -> O3 + M when only O and O2 are selected', () => {
    expect(isReactionVisible(ozoneFormation, ['O', 'O2'], thirdBodyNames)).toBe(true);
  });

  it('was hidden before the fix, when M was required', () => {
    // Reproduces the old behaviour: no third-body exemption, so M had to be selected.
    const withoutExemption = isReactionVisible(ozoneFormation, ['O', 'O2'], new Set());
    expect(withoutExemption).toBe(false);
  });

  it('still hides the reaction when a genuine reactant is deselected', () => {
    expect(isReactionVisible(ozoneFormation, ['O'], thirdBodyNames)).toBe(false);
    expect(isReactionVisible(ozoneFormation, ['O2'], thirdBodyNames)).toBe(false);
    expect(isReactionVisible(ozoneFormation, [], thirdBodyNames)).toBe(false);
  });

  it('leaves reactions without a third body unaffected', () => {
    const oPlusO3 = reactions[2]; // O + O3 -> 2 O2
    expect(isReactionVisible(oPlusO3, ['O', 'O3'], thirdBodyNames)).toBe(true);
    expect(isReactionVisible(oPlusO3, ['O'], thirdBodyNames)).toBe(false);
  });

  it('every Chapman reaction is visible when all selectable species are selected', () => {
    // The real regression: with M unselectable, reaction 3 could never be drawn.
    const selectable = species.map((s) => s.name).filter((n) => !thirdBodyNames.has(n));
    const visible = reactions.filter((r) => isReactionVisible(r, selectable, thirdBodyNames));
    expect(visible).toHaveLength(reactions.length);
  });

  it('is defensive about malformed reactions', () => {
    expect(isReactionVisible(undefined, ['O'], thirdBodyNames)).toBe(false);
    expect(isReactionVisible({}, ['O'], thirdBodyNames)).toBe(false);
    expect(isReactionVisible({ reactants: [] }, ['O'], thirdBodyNames)).toBe(false);
  });

  it('does not count tracers as required reactants', () => {
    const reaction = {
      reactants: [{ 'species name': 'O' }, { 'species name': '__PROD__RXN_1_FOO' }],
    };
    expect(isRealSpecies('__PROD__RXN_1_FOO')).toBe(false);
    expect(isReactionVisible(reaction, ['O'], thirdBodyNames)).toBe(true);
  });
});
