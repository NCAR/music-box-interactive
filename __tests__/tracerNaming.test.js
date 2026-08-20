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
  it('derives the name from the index, and prefixes it', () => {
    expect(buildTracerSpeciesName(165, 'NO2')).toBe(`${TRACER_PREFIX}RXN_165_NO2`);
  });

  it('normalizes punctuation and whitespace in the appended name', () => {
    expect(buildTracerSpeciesName(179, 'FORM->CO')).toBe(`${TRACER_PREFIX}RXN_179_FORMCO`);
    expect(buildTracerSpeciesName(7, 'O + O3 -> 2 O2')).toBe(`${TRACER_PREFIX}RXN_7_O__O3__2_O2`);
  });

  it('gives distinct names to distinct indices even when names repeat', () => {
    expect(buildTracerSpeciesName(1, 'NO2')).not.toBe(buildTracerSpeciesName(2, 'NO2'));
  });

  it('handles unnamed reactions with a stable index-only name', () => {
    for (const name of [undefined, null, '', 42, {}]) {
      expect(buildTracerSpeciesName(12, name)).toBe(`${TRACER_PREFIX}RXN_12`);
    }
  });

  it('is deterministic — the old implementation used Math.random()', () => {
    // A random suffix could not be reconstructed when reading results back, so every
    // unnamed reaction silently reported zero production.
    expect(buildTracerSpeciesName(12, undefined)).toBe(buildTracerSpeciesName(12, undefined));
    expect(buildTracerSpeciesName(3, 'ALD2')).toBe(buildTracerSpeciesName(3, 'ALD2'));
  });
});

describe('buildTracerConcentrationKey', () => {
  it('wraps the species name in the solver’s CONC key format', () => {
    expect(buildTracerConcentrationKey(165, 'NO2')).toBe(
      `CONC.${TRACER_PREFIX}RXN_165_NO2.mol m-3`
    );
  });

  it('never produces a bare real-species key', () => {
    // The original bug: reaction "ALD2" yielded exactly "CONC.ALD2.mol m-3".
    expect(buildTracerConcentrationKey(3, 'ALD2')).not.toBe('CONC.ALD2.mol m-3');
  });
});

describe('isRealSpeciesName', () => {
  it('accepts real species', () => {
    for (const name of ['ALD2', 'NO2', 'O3', 'M', 'BENZRO2', 'XO2N']) {
      expect(isRealSpeciesName(name)).toBe(true);
    }
  });

  it('rejects tracers', () => {
    expect(isRealSpeciesName(buildTracerSpeciesName(0, 'ALD2'))).toBe(false);
    expect(isRealSpeciesName(buildTracerSpeciesName(99, undefined))).toBe(false);
  });

  it('rejects non-strings rather than throwing', () => {
    for (const value of [undefined, null, 5, {}]) {
      expect(isRealSpeciesName(value)).toBe(false);
    }
  });
});

describe('no tracer collides with a real species in any bundled mechanism', () => {
  // The defect this guards was not hypothetical: in carbon_bond_5, 31 of 39 named reactions
  // are named after the species they consume, so the name-derived tracer was the real
  // species' own key. Its concentration was stripped from the results as synthetic, and the
  // tracer was injected as a genuine product of a reaction that consumes it.
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

    const tracerNames = reactions.map((reaction, index) =>
      buildTracerSpeciesName(index, reaction.name)
    );

    // No tracer may shadow a declared species...
    expect(tracerNames.filter((n) => declared.has(n))).toEqual([]);
    // ...nor may the alkoxy/nitrate variants run.js derives from it.
    expect(tracerNames.flatMap((n) => [`${n}_A`, `${n}_B`]).filter((n) => declared.has(n))).toEqual(
      []
    );
    // ...and every reaction must get its own distinct tracer.
    expect(new Set(tracerNames).size).toBe(reactions.length);
    // ...and every declared species must survive the tracer filter.
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
