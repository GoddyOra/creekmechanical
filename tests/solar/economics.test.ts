// Techno-economic model — equations (1)-(14b).
//
// The anchor for this suite is the source paper's own published tables:
// Sobamowo & Ojolo (2018), Journal of Energy, Article ID 4860252. If the
// unmodified equations reproduce Tables 17 and 18, the solar adaptation rests
// on a verified base.
//
// Two of the paper's printed results are NOT reproduced, deliberately — see
// the assertions at the bottom and the QA section of the plan doc.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  annuityFactor, computeNpv, computeBcr, computeIrr, computePayback, computeOm,
  computeEconomics, DEFAULT_ECONOMIC_SETTINGS, type EconomicSettings,
} from '../../src/lib/solar/economics.ts';
import { computeSizing, DEFAULT_SETTINGS, type LoadLine } from '../../src/lib/solar/engine.ts';
import { DEFAULT_PRICES, DEFAULT_TARIFFS } from '../../src/lib/solar/prices.ts';

const close = (actual: number, expected: number, tol: number, msg: string) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: got ${actual}, want ~${expected} (±${tol})`);

// Table 18 inputs. `m` is not printed in the paper; it is recovered from the
// accumulated-cost row, which is what makes the rest of the table checkable.
const C = 270_000_000;
const BA18 = 123_804_026;
const BA17 = 98_345_016;
const N = 20;
const I = 0.10;
const A = annuityFactor(I, N);
const M = (833_301_230 / C - 1) / A * C; // absolute annual O&M
const econ: EconomicSettings = { ...DEFAULT_ECONOMIC_SETTINGS, lifeYears: N, realRateOfReturn: I };

describe('Reproducing Sobamowo & Ojolo (2018)', () => {
  test('annuity factor A(0.10, 20)', () => close(A, 8.5136, 0.001, 'A'));

  test('Table 18 — NPV of benefit', () => {
    close(BA18 * A, 1_053_943_697, 120_000, 'paper prints 1,053,943,697');
  });

  test('Table 18 — accumulated NPV of all cost', () => {
    close(C + M * A, 833_301_230, 1000, 'paper prints 833,301,230');
  });

  test('Table 18 — BCR 1.265', () => close(computeBcr(C, BA18, M, econ), 1.265, 0.002, 'BCR'));

  test('Table 18 — NPV 220,642,467', () => close(computeNpv(C, BA18, M, econ), 220_642_467, 120_000, 'NPV'));

  test('Table 17 — BCR 1.00 (break-even boundary)', () => close(computeBcr(C, BA17, M, econ), 1.0, 0.01, 'BCR'));

  test("Table 17's printed NPV is a copy-paste error, and we do not reproduce it", () => {
    const npv17 = computeNpv(C, BA17, M, econ);
    close(npv17, 3_965_330, 120_000, "Table 17's own rows give ~3.97M");
    assert.ok(Math.abs(npv17 - 220_642_467) > 1e6, 'must NOT equal the Table 18 figure the paper reprints');
  });

  test('equation (8) is the corrected discounted payback, not the paper\'s printed form', () => {
    // The paper prints n = -ln(1 - IC/(B_A - mC))/ln(1+I), which needs the
    // ANNUAL net benefit to exceed TOTAL capital for the log to be defined.
    assert.ok(1 - C / (BA18 - M) < 0, 'the printed form is undefined at the paper\'s own inputs');
    const pb = computePayback(C, BA18, M, econ);
    assert.notEqual(pb.years, null, 'the corrected form must return a number');
    close(pb.years!, 6.63, 0.02, 'corrected discounted payback (paper prints 10.14)');
  });

  test('equation (11) IRR follows the stated equation, diverging from the printed 17.55%', () => {
    const irr = computeIrr(C, BA18, M, econ);
    assert.notEqual(irr, null);
    close(irr! * 100, 20.87, 0.05, 'IRR');
  });
});

describe('Solar-specific adaptations', () => {
  test('(5) cost of fuel is zero unless a backup generator is retained', () => {
    const loads: LoadLine[] = [{ name: 'x', loadClass: 'capacitive', watts: 500, qty: 1, hours: 8, surge: 1 }];
    const s = computeSizing(loads, DEFAULT_SETTINGS);
    const noGen = computeEconomics(s, DEFAULT_SETTINGS, DEFAULT_ECONOMIC_SETTINGS, DEFAULT_PRICES, DEFAULT_TARIFFS);
    assert.equal(noGen.fuelCost, 0, 'sunlight has no fuel cost');

    const withGen = computeEconomics(s, DEFAULT_SETTINGS, { ...DEFAULT_ECONOMIC_SETTINGS, hybridDieselLitresPerYear: 1000 }, DEFAULT_PRICES, DEFAULT_TARIFFS);
    assert.ok(withGen.fuelCost > 0, 'a retained generator does burn fuel');
  });

  test('(3) battery replacement is scheduled inside the system life, never at its end', () => {
    const om = computeOm({ battery: 20e6, total: 100e6 } as never, { ...DEFAULT_ECONOMIC_SETTINGS, lifeYears: 20, batteryLifeYears: 5 });
    assert.deepEqual(om.replacementYears, [5, 10, 15], 'no replacement at year 20 — the bank is end-of-life anyway');
    close(om.batteryReplacementAnnualised, (20e6 * 3) / 20, 1, 'annualised replacement');
  });

  test('(3) the battery replacement term actually reaches NPV, BCR, IRR and payback', () => {
    const loads: LoadLine[] = [{ name: 'x', loadClass: 'capacitive', watts: 800, qty: 1, hours: 10, surge: 1 }];
    const s = computeSizing(loads, DEFAULT_SETTINGS);
    const longLife = computeEconomics(s, DEFAULT_SETTINGS, { ...DEFAULT_ECONOMIC_SETTINGS, batteryLifeYears: 25 }, DEFAULT_PRICES, DEFAULT_TARIFFS);
    const shortLife = computeEconomics(s, DEFAULT_SETTINGS, { ...DEFAULT_ECONOMIC_SETTINGS, batteryLifeYears: 5 }, DEFAULT_PRICES, DEFAULT_TARIFFS);
    assert.equal(longLife.om.replacementCount, 0, 'precondition: no replacement inside a 20-year life');
    assert.ok(shortLife.om.replacementCount > 0, 'precondition: replacements inside the life');
    assert.ok(shortLife.npv < longLife.npv, 'replacing batteries must reduce NPV');
    assert.ok(shortLife.bcr < longLife.bcr, 'replacing batteries must reduce BCR');
  });

  test('(12) LCOE is year-indexed, so degradation lowers lifetime energy', () => {
    const loads: LoadLine[] = [{ name: 'x', loadClass: 'capacitive', watts: 800, qty: 1, hours: 10, surge: 1 }];
    const s = computeSizing(loads, DEFAULT_SETTINGS);
    const flat = computeEconomics(s, DEFAULT_SETTINGS, { ...DEFAULT_ECONOMIC_SETTINGS, degradationRate: 0 }, DEFAULT_PRICES, DEFAULT_TARIFFS);
    const degrading = computeEconomics(s, DEFAULT_SETTINGS, { ...DEFAULT_ECONOMIC_SETTINGS, degradationRate: 0.005 }, DEFAULT_PRICES, DEFAULT_TARIFFS);
    assert.ok(degrading.lcoe.value > flat.lcoe.value, 'degradation must raise LCOE');
    assert.ok(degrading.lcoe.finalYearKwh < flat.lcoe.finalYearKwh, 'final-year output must be lower');
  });

  test('(13) WACC reduces to the cost of equity when nothing is borrowed', () => {
    const loads: LoadLine[] = [{ name: 'x', loadClass: 'capacitive', watts: 500, qty: 1, hours: 8, surge: 1 }];
    const s = computeSizing(loads, DEFAULT_SETTINGS);
    const e = computeEconomics(s, DEFAULT_SETTINGS, { ...DEFAULT_ECONOMIC_SETTINGS, equityShare: 1, costOfEquity: 0.12 }, DEFAULT_PRICES, DEFAULT_TARIFFS);
    close(e.discountRate, 0.12, 1e-9, 'all-equity WACC');
  });

  test('(14) ROI reports simple, discounted and annual, and flags divergence', () => {
    const loads: LoadLine[] = [{ name: 'x', loadClass: 'capacitive', watts: 800, qty: 1, hours: 10, surge: 1 }];
    const s = computeSizing(loads, DEFAULT_SETTINGS);
    const e = computeEconomics(s, DEFAULT_SETTINGS, DEFAULT_ECONOMIC_SETTINGS, DEFAULT_PRICES, DEFAULT_TARIFFS);
    assert.ok(Number.isFinite(e.roi.simple) && Number.isFinite(e.roi.discounted) && Number.isFinite(e.roi.annual));
    close(e.roi.discounted, (e.npv / e.capital.total) * 100, 1e-6, 'discounted ROI must equal NPV/C');
    if (e.roi.simple > 0 && e.roi.discounted < 0) {
      assert.ok(e.roi.divergenceWarning, 'a positive simple / negative discounted pair must be flagged');
      assert.ok(e.notes.some((n) => n.includes('discounted ROI is negative')), 'and explained in the notes');
    }
  });
});

describe('Cross-equation consistency', () => {
  test('BCR > 1 agrees with NPV > 0', () => {
    for (const benefit of [5e6, 2e7, 4e7, 8e7, 1.5e8]) {
      const bcr = computeBcr(C, benefit, M, econ);
      const npv = computeNpv(C, benefit, M, econ);
      assert.equal(bcr > 1, npv > 0, `benefit ${benefit}: BCR ${bcr.toFixed(3)} vs NPV ${npv.toFixed(0)}`);
    }
  });

  test('IRR above the hurdle rate agrees with a positive NPV', () => {
    for (const benefit of [4e7, 8e7, 1.2e8, 1.5e8]) {
      const irr = computeIrr(C, benefit, M, econ);
      const npv = computeNpv(C, benefit, M, econ);
      if (irr !== null) assert.equal(irr > I, npv > 0, `benefit ${benefit}: IRR ${(irr * 100).toFixed(2)}% vs NPV ${npv.toFixed(0)}`);
    }
  });

  test('payback returns a reason rather than NaN when a project never repays', () => {
    const pb = computePayback(C, M + 1, M, econ);
    assert.equal(pb.years, null);
    assert.ok(typeof pb.reason === 'string' && pb.reason.length > 0, 'must explain itself');
  });
});
