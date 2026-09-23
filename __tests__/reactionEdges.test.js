import { toReduxConfig } from '../src/services/config/loadMusicBoxConfig';
import {
  getReactionEdges,
  getThirdBodyNames,
  isReactionVisible,
} from '../src/components/Plots/flowUtils';

import chapmanConfigRaw from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' };
const chapmanConfig = await toReduxConfig(chapmanConfigRaw);
import carbonBond5ConfigRaw from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' };
const carbonBond5Config = await toReduxConfig(carbonBond5ConfigRaw);

const NO_THIRD_BODIES = new Set();
const RATE = 10;

const edgeMap = (edges) => Object.fromEntries(edges.map((e) => [`${e.source}->${e.target}`, e.value]));

describe('getReactionEdges — stoichiometric coefficients', () => {
  it('scales a product edge by its coefficient', async () => {
    // O + O3 -> 2 O2 : each event yields two O2, so that edge is 2x the reaction rate.
    const reaction = {
      name: 'R',
      reactants: [{ name: 'O', coefficient: 1 }, { name: 'O3', coefficient: 1 }],
      products: [{ name: 'O2', coefficient: 2 }],
    };
    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES))).toEqual({
      'O->R': 10,
      'O3->R': 10,
      'R->O2': 20,
    });
  });

  it('scales a reactant edge by its coefficient', async () => {
    const reaction = {
      name: 'R',
      reactants: [{ name: 'A', coefficient: 3 }],
      products: [{ name: 'B', coefficient: 1 }],
    };
    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES))).toEqual({
      'A->R': 30,
      'R->B': 10,
    });
  });

  it('defaults a missing coefficient to 1', async () => {
    const reaction = {
      name: 'R',
      reactants: [{ name: 'A' }],
      products: [{ name: 'B' }],
    };
    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES))).toEqual({
      'A->R': 10,
      'R->B': 10,
    });
  });

  it('handles fractional coefficients', async () => {
    const reaction = {
      name: 'R',
      reactants: [{ name: 'A', coefficient: 1 }],
      products: [{ name: 'B', coefficient: 0.5 }],
    };
    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES))['R->B']).toBeCloseTo(5, 10);
  });

  it('aggregates a species listed twice on the same side', async () => {
    const reaction = {
      name: 'R',
      reactants: [{ name: 'A', coefficient: 1 }],
      products: [
        { name: 'B', coefficient: 1 },
        { name: 'B', coefficient: 2 },
      ],
    };
    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES))['R->B']).toBe(30);
  });
});

describe('getReactionEdges — negative coefficients', () => {
  // CB05 gives lumped operator species (PAR) negative yields, meaning the reaction
  // net-consumes them. They must not become production edges with a negative magnitude:
  // those sort below any range minimum and yield NaN widths under log scaling.
  const reaction = {
    name: 'R',
    reactants: [{ name: 'OH', coefficient: 1 }],
    products: [
      { name: 'ALD2', coefficient: 1 },
      { name: 'PAR', coefficient: -2.1 },
    ],
  };

  it('turns a negative yield into a consumption edge with positive magnitude', async () => {
    const edges = edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES));
    expect(edges['PAR->R']).toBeCloseTo(21, 10);
    expect(edges['R->PAR']).toBeUndefined();
  });

  it('never emits a negative edge value', async () => {
    for (const edge of getReactionEdges(reaction, RATE, NO_THIRD_BODIES)) {
      expect(edge.value).toBeGreaterThan(0);
    }
  });

  it('produces no negative edge anywhere in carbon_bond_5', async () => {
    const thirdBodies = getThirdBodyNames(carbonBond5Config.mechanism.species);
    const negatives = carbonBond5Config.mechanism.reactions.flatMap((r) =>
      getReactionEdges(r, RATE, thirdBodies).filter((e) => e.value < 0)
    );
    expect(negatives).toEqual([]);
  });

  it('drops a zero coefficient rather than drawing a zero-width edge', async () => {
    const zeroYield = {
      name: 'R',
      reactants: [{ name: 'A', coefficient: 1 }],
      products: [{ name: 'B', coefficient: 0 }],
    };
    expect(edgeMap(getReactionEdges(zeroYield, RATE, NO_THIRD_BODIES))).toEqual({ 'A->R': 10 });
  });
});

describe('getReactionEdges — exclusions', () => {
  const { reactions, species } = chapmanConfig.mechanism;
  const thirdBodies = getThirdBodyNames(species);

  it('omits third bodies from both sides', async () => {
    // Chapman reaction 3: O + O2 + M -> O3 + M. Unnamed in the config -- ExampleLoader
    // synthesizes a name before it reaches Redux, so mirror that here.
    const reaction = { ...reactions[3], name: 'RXN3' };
    const edges = edgeMap(getReactionEdges(reaction, RATE, thirdBodies));
    expect(edges).toEqual({ 'O->RXN3': 10, 'O2->RXN3': 10, 'RXN3->O3': 10 });
    // M is on both sides of this reaction and must appear on neither edge.
    expect(Object.keys(edges).some((k) => k.split('->').includes('M'))).toBe(false);
  });

  it('omits injected tracers', async () => {
    const reaction = {
      name: 'R',
      reactants: [{ name: 'A', coefficient: 1 }],
      products: [
        { name: 'B', coefficient: 1 },
        { name: '__PROD__RXN_0_R', coefficient: 1 },
      ],
    };
    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES))).toEqual({
      'A->R': 10,
      'R->B': 10,
    });
  });

  it('is defensive about malformed reactions', async () => {
    expect(getReactionEdges(undefined, RATE, NO_THIRD_BODIES)).toEqual([]);
    expect(getReactionEdges({ name: 'R' }, RATE, NO_THIRD_BODIES)).toEqual([]);
  });

  it('scales linearly with rate', async () => {
    const reaction = {
      name: 'R',
      reactants: [{ name: 'A', coefficient: 1 }],
      products: [{ name: 'B', coefficient: 2 }],
    };
    expect(edgeMap(getReactionEdges(reaction, 0, NO_THIRD_BODIES))['R->B']).toBe(0);
    expect(edgeMap(getReactionEdges(reaction, 7, NO_THIRD_BODIES))['R->B']).toBe(14);
  });
});

// Reaction types name their species differently. Reading only `reactants`/`products` left a
// surface reaction invisible and a branched reaction a dead end -- consuming without producing.
describe('getReactionEdges — reaction shapes', () => {
  it('reads a surface reaction from its gas-phase fields', async () => {
    const reaction = {
      name: 'usr_NO2_aer',
      'gas-phase species': 'NO2',
      'gas-phase products': [
        { name: 'OH', coefficient: 0.5 },
        { name: 'HNO3', coefficient: 0.5 },
      ],
    };

    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES, 'R'))).toEqual({
      'NO2->R': 10,
      'R->OH': 5,
      'R->HNO3': 5,
    });
  });

  it('produces both branches of a branched reaction', async () => {
    const reaction = {
      name: 'branched',
      reactants: [{ name: 'C4H9O2', coefficient: 1 }],
      'alkoxy products': [{ name: 'C4H9O', coefficient: 0.8 }],
      'nitrate products': [{ name: 'C4H9ONO2', coefficient: 0.2 }],
    };

    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES, 'R'))).toEqual({
      'C4H9O2->R': 10,
      'R->C4H9O': 8,
      'R->C4H9ONO2': 2,
    });
  });
});

describe('isReactionVisible — reaction shapes', () => {
  it('counts a surface reaction gas-phase reactant', async () => {
    const reaction = {
      'gas-phase species': 'NO2',
      'gas-phase products': [{ name: 'HNO3', coefficient: 1 }],
    };

    expect(isReactionVisible(reaction, ['NO2'], NO_THIRD_BODIES)).toBe(true);
    expect(isReactionVisible(reaction, ['O3'], NO_THIRD_BODIES)).toBe(false);
  });
});

// An emission has no reactants: it injects a species from outside the mechanism. Requiring a
// reactant hid every one of carbon_bond_5's 14 emissions from the diagram. A first-order loss is
// the mirror image -- reactants but no products -- and is correctly a dead end.
describe('isReactionVisible — sources and sinks', () => {
  const emission = {
    type: 'EMISSION',
    name: 'NO',
    products: [{ name: 'NO', coefficient: 1 }],
  };
  const firstOrderLoss = {
    type: 'FIRST_ORDER_LOSS',
    name: 'loss',
    reactants: [{ name: 'C', coefficient: 1 }],
  };

  it('shows an emission when the species it emits is selected', async () => {
    expect(isReactionVisible(emission, ['NO'], NO_THIRD_BODIES)).toBe(true);
    expect(isReactionVisible(emission, ['O3'], NO_THIRD_BODIES)).toBe(false);
  });

  it('gives an emission an outgoing edge only', async () => {
    expect(edgeMap(getReactionEdges(emission, RATE, NO_THIRD_BODIES, 'R'))).toEqual({
      'R->NO': 10,
    });
  });

  it('keeps a first-order loss anchored on its reactant', async () => {
    expect(isReactionVisible(firstOrderLoss, ['C'], NO_THIRD_BODIES)).toBe(true);
    expect(isReactionVisible(firstOrderLoss, ['O3'], NO_THIRD_BODIES)).toBe(false);
  });

  it('gives a first-order loss an incoming edge only', async () => {
    expect(edgeMap(getReactionEdges(firstOrderLoss, RATE, NO_THIRD_BODIES, 'R'))).toEqual({
      'C->R': 10,
    });
  });

  it('shows an ordinary reaction when any single reactant or product is selected', async () => {
    const reaction = {
      reactants: [
        { name: 'O', coefficient: 1 },
        { name: 'O3', coefficient: 1 },
      ],
      products: [{ name: 'O2', coefficient: 2 }],
    };
    expect(isReactionVisible(reaction, ['O', 'O3'], NO_THIRD_BODIES)).toBe(true);
    expect(isReactionVisible(reaction, ['O'], NO_THIRD_BODIES)).toBe(true);
    expect(isReactionVisible(reaction, ['O2'], NO_THIRD_BODIES)).toBe(true);
    expect(isReactionVisible(reaction, ['N2'], NO_THIRD_BODIES)).toBe(false);
  });
});
