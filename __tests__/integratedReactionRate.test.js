import { computeIntegratedReactionRate } from '../src/components/Plots/flowUtils';
import { buildTracerConcentrationKey } from '../src/services/simulation/local/tracer';

// A tracer species is injected as a product with no consumption term, so the solver
// integrates it: its concentration at time t is the integral of that reaction's
// rate from 0 to t.

const REACTION = { name: 'NO2' };
const INDEX = 165;
const KEY = buildTracerConcentrationKey(INDEX, REACTION.name);

// Build a results array by sampling an analytic tracer function C(t) at `times`.
const resultsFrom = (tracerFn, times) =>
  times.map((t) => ({ time: t, concentrations: { [KEY]: tracerFn(t) } }));

const linspace = (from, to, count) =>
  Array.from({ length: count }, (_, i) => from + ((to - from) * i) / (count - 1));

const naiveSum = (results, timeStart, timeEnd) =>
  results
    .filter((p) => p.time >= timeStart && p.time <= timeEnd)
    .reduce((acc, p) => acc + (p.concentrations[KEY] ?? 0), 0);

const rate = (results, timeStart, timeEnd) =>
  computeIntegratedReactionRate(REACTION, INDEX, results, timeStart, timeEnd);

describe('computeIntegratedReactionRate — analytic correctness', () => {
  it('recovers the integral of a constant rate', () => {
    // R(t) = 2  =>  C(t) = 2t  =>  integral over [0,10] = 20
    const results = resultsFrom((t) => 2 * t, linspace(0, 10, 11));
    expect(rate(results, 0, 10)).toBeCloseTo(20, 10);
  });

  it('recovers the integral of a time-varying rate', () => {
    // R(t) = t  =>  C(t) = t^2/2  =>  integral over [0,10] = 50
    const results = resultsFrom((t) => (t * t) / 2, linspace(0, 10, 11));
    expect(rate(results, 0, 10)).toBeCloseTo(50, 10);
  });

  it('recovers the integral over a sub-window, not from zero', () => {
    // C(t) = t^2/2, integral over [4,10] = 50 - 8 = 42
    const results = resultsFrom((t) => (t * t) / 2, linspace(0, 10, 11));
    expect(rate(results, 4, 10)).toBeCloseTo(42, 10);
  });
});

describe('computeIntegratedReactionRate — resolution independence', () => {
  const tracerFn = (t) => (t * t) / 2; // integral over [0,10] is exactly 50
  const resolutions = [2, 3, 6, 11, 101, 1001];

  it.each(resolutions)('gives the same answer sampled at %i points', (n) => {
    const results = resultsFrom(tracerFn, linspace(0, 10, n));
    expect(rate(results, 0, 10)).toBeCloseTo(50, 10);
  });

  it('is bit-identical across every resolution', () => {
    const values = resolutions.map((n) => rate(resultsFrom(tracerFn, linspace(0, 10, n)), 0, 10));
    expect(new Set(values).size).toBe(1);
  });

  it('would fail under the naive summation (proving this test can detect a regression)', () => {
    // Summing drifts with resolution, so the assertions above are meaningful rather than vacuously true.
    const sums = resolutions.map((n) => naiveSum(resultsFrom(tracerFn, linspace(0, 10, n)), 0, 10));
    expect(new Set(sums).size).toBe(resolutions.length);
    expect(Math.max(...sums)).toBeGreaterThan(10 * Math.min(...sums));
  });
});

describe('computeIntegratedReactionRate — integral algebra', () => {
  const results = resultsFrom((t) => (t * t) / 2, linspace(0, 10, 101));

  it('is additive over adjacent windows', () => {
    const whole = rate(results, 0, 10);
    const first = rate(results, 0, 5);
    const second = rate(results, 5, 10);
    expect(first + second).toBeCloseTo(whole, 10);
  });

  it('is non-negative for a monotonically accumulating tracer', () => {
    expect(rate(results, 2, 8)).toBeGreaterThan(0);
  });

  it('returns the endpoint difference, not the sum of samples', () => {
    const expected = (10 * 10) / 2 - (5 * 5) / 2; // C(10) - C(5)
    expect(rate(results, 5, 10)).toBeCloseTo(expected, 10);
    expect(rate(results, 5, 10)).not.toBeCloseTo(naiveSum(results, 5, 10), 5);
  });
});

describe('computeIntegratedReactionRate — window selection', () => {
  const results = resultsFrom((t) => 2 * t, linspace(0, 10, 11));

  it('ignores samples outside the window', () => {
    // Only t=0..2 counted: C(2) - C(0) = 4
    expect(rate(results, 0, 2)).toBeCloseTo(4, 10);
  });

  it('treats an unbounded end as running to the last sample', () => {
    expect(rate(results, 0, Infinity)).toBeCloseTo(rate(results, 0, 10), 10);
  });

  it('returns 0 when the window contains a single sample', () => {
    expect(rate(results, 5, 5)).toBe(0);
  });

  it('returns 0 when the window contains no samples', () => {
    expect(rate(results, 100, 200)).toBe(0);
  });
});

describe('computeIntegratedReactionRate — defensive cases', () => {
  it('returns 0 when results are missing or not an array', () => {
    expect(computeIntegratedReactionRate(REACTION, INDEX, null, 0, 10)).toBe(0);
    expect(computeIntegratedReactionRate(REACTION, INDEX, undefined, 0, 10)).toBe(0);
    expect(computeIntegratedReactionRate(REACTION, INDEX, {}, 0, 10)).toBe(0);
  });

  it('returns 0 for an empty results array', () => {
    expect(rate([], 0, 10)).toBe(0);
  });

  it('returns 0 when this reaction has no tracer in the results', () => {
    const results = [
      { time: 0, concentrations: { 'CONC.O3.mol m-3': 1 } },
      { time: 1, concentrations: { 'CONC.O3.mol m-3': 2 } },
    ];
    expect(rate(results, 0, 10)).toBe(0);
  });

  it('skips samples with absent concentrations without throwing', () => {
    const results = [
      { time: 0, concentrations: { [KEY]: 0 } },
      { time: 1 }, // no concentrations at all
      { time: 2, concentrations: { [KEY]: 8 } },
    ];
    expect(rate(results, 0, 10)).toBeCloseTo(8, 10);
  });
});

describe('computeIntegratedReactionRate — index-keyed lookup', () => {
  // Regression test for the defect: tracers were named after reactions, so a
  // reaction named "ALD2" produced the key "CONC.ALD2.mol m-3" -- the real species' key.
  it('reads the tracer key, never the same-named real species', () => {
    const reaction = { name: 'ALD2' };
    const results = [
      {
        time: 0,
        concentrations: {
          'CONC.ALD2.mol m-3': 1000, // real acetaldehyde, must be ignored
          [buildTracerConcentrationKey(3, 'ALD2')]: 0,
        },
      },
      {
        time: 1,
        concentrations: {
          'CONC.ALD2.mol m-3': 9999,
          [buildTracerConcentrationKey(3, 'ALD2')]: 7,
        },
      },
    ];
    expect(computeIntegratedReactionRate(reaction, 3, results, 0, 10)).toBeCloseTo(7, 10);
  });

  it('does not read a neighbouring reaction’s tracer', () => {
    const results = [
      {
        time: 0,
        concentrations: {
          [buildTracerConcentrationKey(0, 'A')]: 0,
          [buildTracerConcentrationKey(1, 'B')]: 0,
        },
      },
      {
        time: 1,
        concentrations: {
          [buildTracerConcentrationKey(0, 'A')]: 3,
          [buildTracerConcentrationKey(1, 'B')]: 500,
        },
      },
    ];
    expect(computeIntegratedReactionRate({ name: 'A' }, 0, results, 0, 10)).toBeCloseTo(3, 10);
    expect(computeIntegratedReactionRate({ name: 'B' }, 1, results, 0, 10)).toBeCloseTo(500, 10);
  });

  it('returns 0 when the index no longer matches the name (stale mechanism edit)', () => {
    // Fails closed rather than silently attributing another reaction's numbers.
    const results = [
      { time: 0, concentrations: { [buildTracerConcentrationKey(5, 'NO2')]: 0 } },
      { time: 1, concentrations: { [buildTracerConcentrationKey(5, 'NO2')]: 42 } },
    ];
    expect(computeIntegratedReactionRate({ name: 'HONO' }, 5, results, 0, 10)).toBe(0);
  });
});
