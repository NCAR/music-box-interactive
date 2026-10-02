import {
  TRACER_PREFIX,
  buildTracerSpeciesName,
  buildTracerConcentrationKey,
  isRealSpeciesName,
} from '../src/services/simulation/local/tracer';

import carbonBond5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' };
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' };
import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' };

describe('buildTracerSpeciesName', () => {
  it('derives the name from the reaction id, and prefixes it', () => {
    expect(buildTracerSpeciesName({ id: 'abc', name: 'NO2' }, 165)).toBe(`${TRACER_PREFIX}RXN_abc`);
  });

  it('makes a uuid safe for a species name', () => {
    expect(buildTracerSpeciesName({ id: '1b9d6bcd-bbfd-4b2d' }, 0)).toBe(
      `${TRACER_PREFIX}RXN_1b9d6bcd_bbfd_4b2d`
    );
  });

  it('does not depend on the reaction name or the reaction index', () => {
    // A rename, or the generated name of an unnamed reaction, keeps the same tracer.
    expect(buildTracerSpeciesName({ id: 'abc', name: 'NO2' }, 1)).toBe(
      buildTracerSpeciesName({ id: 'abc', name: '' }, 7)
    );
  });

  it('gives distinct names to distinct reactions even when names repeat', () => {
    expect(buildTracerSpeciesName({ id: 'a', name: 'NO2' }, 0)).not.toBe(
      buildTracerSpeciesName({ id: 'b', name: 'NO2' }, 0)
    );
  });

  it('falls back to the index for a reaction without an id', () => {
    for (const reaction of [undefined, null, {}, { name: 'NO2' }]) {
      expect(buildTracerSpeciesName(reaction, 12)).toBe(`${TRACER_PREFIX}RXN_12`);
    }
  });
});

describe('buildTracerConcentrationKey', () => {
  it('wraps the species name in the solver’s CONC key format', () => {
    expect(buildTracerConcentrationKey({ id: 'abc' }, 165)).toBe(
      `CONC.${TRACER_PREFIX}RXN_abc.mol m-3`
    );
  });

  it('never produces a bare real-species key', () => {
    // The original bug: reaction "ALD2" yielded exactly "CONC.ALD2.mol m-3".
    expect(buildTracerConcentrationKey({ id: 'x', name: 'ALD2' }, 3)).not.toBe('CONC.ALD2.mol m-3');
  });
});

describe('isRealSpeciesName', () => {
  it('accepts real species', () => {
    for (const name of ['ALD2', 'NO2', 'O3', 'M', 'BENZRO2', 'XO2N']) {
      expect(isRealSpeciesName(name)).toBe(true);
    }
  });

  it('rejects tracers', () => {
    expect(isRealSpeciesName(buildTracerSpeciesName({ id: 'x', name: 'ALD2' }, 0))).toBe(false);
    expect(isRealSpeciesName(buildTracerSpeciesName(undefined, 99))).toBe(false);
  });

  it('rejects non-strings rather than throwing', () => {
    for (const value of [undefined, null, 5, {}]) {
      expect(isRealSpeciesName(value)).toBe(false);
    }
  });
});

describe('no tracer collides with a real species in any bundled mechanism', () => {
  const mechanisms = [
    ['carbon_bond_5', carbonBond5Config],
    ['ts1', ts1Config],
    ['chapman', chapmanConfig],
  ];

  it.each(mechanisms)('%s', (_name, config) => {
    const { species = [], reactions = [] } = config.mechanism;
    const declared = new Set(species.map((s) => s.name));
    expect(declared.size).toBeGreaterThan(0);
    expect(reactions.length).toBeGreaterThan(0);

    // Redux gives every reaction a uuid; the config files themselves have no ids.
    const tracerNames = reactions.map((reaction, index) =>
      buildTracerSpeciesName({ ...reaction, id: crypto.randomUUID() }, index)
    );

    // No tracer may shadow a declared species
    expect(tracerNames.filter((n) => declared.has(n))).toEqual([]);
    // nor may the alkoxy/nitrate variants run.js derives from it.
    expect(tracerNames.flatMap((n) => [`${n}_A`, `${n}_B`]).filter((n) => declared.has(n))).toEqual(
      []
    );
    // Every reaction must get its own distinct tracer.
    expect(new Set(tracerNames).size).toBe(reactions.length);
    // Every declared species must survive the tracer filter.
    expect([...declared].every(isRealSpeciesName)).toBe(true);
  });

  it('the old name-derived scheme really did collide (proving the guard is meaningful)', () => {
    const oldScheme = (name) =>
      typeof name === 'string'
        ? name
            .replace(/\s+/g, '_')
            .replace(/[^A-Za-z0-9_]/g, '')
            .toUpperCase()
        : '';
    const { species, reactions } = carbonBond5Config.mechanism;
    const declared = new Set(species.map((s) => s.name));
    const collisions = reactions
      .map((r) => oldScheme(r.name))
      .filter((n) => n && declared.has(n));
    expect(collisions).toContain('ALD2');
    expect(new Set(collisions).size).toBe(31);
  });
});
