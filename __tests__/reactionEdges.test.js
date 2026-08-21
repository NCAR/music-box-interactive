import { getReactionEdges, getThirdBodyNames } from '../src/components/Plots/flowUtils';

import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' };
import carbonBond5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' };

const NO_THIRD_BODIES = new Set();
const RATE = 10;

const edgeMap = (edges) => Object.fromEntries(edges.map((e) => [`${e.source}->${e.target}`, e.value]));

describe('getReactionEdges — stoichiometric coefficients', () => {
  it('scales a product edge by its coefficient', () => {
    // O + O3 -> 2 O2 : each event yields two O2, so that edge is 2x the reaction rate.
    const reaction = {
      name: 'R',
      reactants: [{ 'species name': 'O', coefficient: 1 }, { 'species name': 'O3', coefficient: 1 }],
      products: [{ 'species name': 'O2', coefficient: 2 }],
    };
    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES))).toEqual({
      'O->R': 10,
      'O3->R': 10,
      'R->O2': 20,
    });
  });

  it('scales a reactant edge by its coefficient', () => {
    const reaction = {
      name: 'R',
      reactants: [{ 'species name': 'A', coefficient: 3 }],
      products: [{ 'species name': 'B', coefficient: 1 }],
    };
    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES))).toEqual({
      'A->R': 30,
      'R->B': 10,
    });
  });

  it('defaults a missing coefficient to 1', () => {
    const reaction = {
      name: 'R',
      reactants: [{ 'species name': 'A' }],
      products: [{ 'species name': 'B' }],
    };
    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES))).toEqual({
      'A->R': 10,
      'R->B': 10,
    });
  });

  it('handles fractional coefficients', () => {
    const reaction = {
      name: 'R',
      reactants: [{ 'species name': 'A', coefficient: 1 }],
      products: [{ 'species name': 'B', coefficient: 0.5 }],
    };
    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES))['R->B']).toBeCloseTo(5, 10);
  });

  it('aggregates a species listed twice on the same side', () => {
    const reaction = {
      name: 'R',
      reactants: [{ 'species name': 'A', coefficient: 1 }],
      products: [
        { 'species name': 'B', coefficient: 1 },
        { 'species name': 'B', coefficient: 2 },
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
    reactants: [{ 'species name': 'OH', coefficient: 1 }],
    products: [
      { 'species name': 'ALD2', coefficient: 1 },
      { 'species name': 'PAR', coefficient: -2.1 },
    ],
  };

  it('turns a negative yield into a consumption edge with positive magnitude', () => {
    const edges = edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES));
    expect(edges['PAR->R']).toBeCloseTo(21, 10);
    expect(edges['R->PAR']).toBeUndefined();
  });

  it('never emits a negative edge value', () => {
    for (const edge of getReactionEdges(reaction, RATE, NO_THIRD_BODIES)) {
      expect(edge.value).toBeGreaterThan(0);
    }
  });

  it('produces no negative edge anywhere in carbon_bond_5', () => {
    const thirdBodies = getThirdBodyNames(carbonBond5Config.mechanism.species);
    const negatives = carbonBond5Config.mechanism.reactions.flatMap((r) =>
      getReactionEdges(r, RATE, thirdBodies).filter((e) => e.value < 0)
    );
    expect(negatives).toEqual([]);
  });

  it('drops a zero coefficient rather than drawing a zero-width edge', () => {
    const zeroYield = {
      name: 'R',
      reactants: [{ 'species name': 'A', coefficient: 1 }],
      products: [{ 'species name': 'B', coefficient: 0 }],
    };
    expect(edgeMap(getReactionEdges(zeroYield, RATE, NO_THIRD_BODIES))).toEqual({ 'A->R': 10 });
  });
});

describe('getReactionEdges — exclusions', () => {
  const { reactions, species } = chapmanConfig.mechanism;
  const thirdBodies = getThirdBodyNames(species);

  it('omits third bodies from both sides', () => {
    // Chapman reaction 3: O + O2 + M -> O3 + M. Unnamed in the config -- ExampleLoader
    // synthesizes a name before it reaches Redux, so mirror that here.
    const reaction = { ...reactions[3], name: 'RXN3' };
    const edges = edgeMap(getReactionEdges(reaction, RATE, thirdBodies));
    expect(edges).toEqual({ 'O->RXN3': 10, 'O2->RXN3': 10, 'RXN3->O3': 10 });
    // M is on both sides of this reaction and must appear on neither edge.
    expect(Object.keys(edges).some((k) => k.split('->').includes('M'))).toBe(false);
  });

  it('omits injected tracers', () => {
    const reaction = {
      name: 'R',
      reactants: [{ 'species name': 'A', coefficient: 1 }],
      products: [
        { 'species name': 'B', coefficient: 1 },
        { 'species name': '__PROD__RXN_0_R', coefficient: 1 },
      ],
    };
    expect(edgeMap(getReactionEdges(reaction, RATE, NO_THIRD_BODIES))).toEqual({
      'A->R': 10,
      'R->B': 10,
    });
  });

  it('is defensive about malformed reactions', () => {
    expect(getReactionEdges(undefined, RATE, NO_THIRD_BODIES)).toEqual([]);
    expect(getReactionEdges({ name: 'R' }, RATE, NO_THIRD_BODIES)).toEqual([]);
  });

  it('scales linearly with rate', () => {
    const reaction = {
      name: 'R',
      reactants: [{ 'species name': 'A', coefficient: 1 }],
      products: [{ 'species name': 'B', coefficient: 2 }],
    };
    expect(edgeMap(getReactionEdges(reaction, 0, NO_THIRD_BODIES))['R->B']).toBe(0);
    expect(edgeMap(getReactionEdges(reaction, 7, NO_THIRD_BODIES))['R->B']).toBe(14);
  });
});
