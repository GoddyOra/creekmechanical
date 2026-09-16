// Sizing engine — verified against the course material's own worked examples.
//
// Run: npm test
//
// Three expectations here deliberately differ from the whiteboard photos
// (both panel counts, and the exact battery division). Those are documented
// corrections, not regressions — see the "Verification" table in
// docs/SOLAR_CALCULATOR_PLAN.md. Do not bend a formula to reproduce a
// rounding slip in a photo.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSizing, auditLoads, DEFAULT_SETTINGS, COPPER_RESISTIVITY,
  type LoadLine, type SizingSettings,
} from '../../src/lib/solar/engine.ts';

const S = (o: Partial<SizingSettings> = {}): SizingSettings => ({ ...DEFAULT_SETTINGS, ...o });
const close = (actual: number, expected: number, tol: number, msg: string) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: got ${actual}, want ~${expected} (±${tol})`);

/** One synthetic line carrying exactly the whiteboard's 108,618 Wh/day total. */
const BOARD: LoadLine[] = [{ name: 'board total', loadClass: 'capacitive', watts: 108618, qty: 1, hours: 1, surge: 1 }];

describe('Stage 0 — load audit and the R/C/I rule', () => {
  const mixed: LoadLine[] = [
    { name: 'Heater', loadClass: 'resistive', watts: 1000, qty: 1, hours: 1, surge: 1 },
    { name: 'TV', loadClass: 'capacitive', watts: 1000, qty: 1, hours: 1, surge: 1 },
    { name: 'Pump', loadClass: 'inductive', watts: 1000, qty: 1, hours: 1, surge: 5 },
  ];

  test('resistive and capacitive count at running power; inductive carries surge', () => {
    const a = auditLoads(mixed, S({ safetyFactor: 1 }));
    assert.equal(a.byClass.resistive.designWatts, 1000);
    assert.equal(a.byClass.capacitive.designWatts, 1000);
    assert.equal(a.byClass.inductive.designWatts, 5000, 'inductive = running x surge');
    assert.equal(a.grandTotalDesignWatts, 7000, 'grand total = R + C + (I x surge)');
  });

  test('whiteboard resistive subtotal reproduces exactly (7,700 W)', () => {
    const resistive: LoadLine[] = [
      { name: 'LED bulb', loadClass: 'resistive', watts: 10, qty: 20, hours: 12, surge: 1 },
      { name: 'Electric iron', loadClass: 'resistive', watts: 1500, qty: 1, hours: 1, surge: 1 },
      { name: 'Water heater', loadClass: 'resistive', watts: 3000, qty: 1, hours: 1, surge: 1 },
      { name: 'Toaster', loadClass: 'resistive', watts: 1500, qty: 1, hours: 1, surge: 1 },
      { name: 'Air fryer', loadClass: 'resistive', watts: 1500, qty: 1, hours: 1, surge: 1 },
    ];
    assert.equal(auditLoads(resistive, S()).byClass.resistive.runningWatts, 7700);
  });

  test('whiteboard capacitive subtotal reproduces exactly (1,480 W)', () => {
    const capacitive: LoadLine[] = [
      { name: 'Television', loadClass: 'capacitive', watts: 200, qty: 4, hours: 6, surge: 1 },
      { name: 'Sound system', loadClass: 'capacitive', watts: 300, qty: 1, hours: 3, surge: 1 },
      { name: 'Laptops', loadClass: 'capacitive', watts: 40, qty: 2, hours: 6, surge: 1 },
      { name: 'Desktop', loadClass: 'capacitive', watts: 150, qty: 1, hours: 4, surge: 1 },
      { name: 'Decoder', loadClass: 'capacitive', watts: 25, qty: 1, hours: 6, surge: 1 },
      { name: 'PS5', loadClass: 'capacitive', watts: 100, qty: 1, hours: 4, surge: 1 },
      { name: 'Router', loadClass: 'capacitive', watts: 25, qty: 1, hours: 24, surge: 1 },
    ];
    assert.equal(auditLoads(capacitive, S()).byClass.capacitive.runningWatts, 1480);
  });
});

describe('Surge allowance — aggregation rules', () => {
  const ac = (name: string, qty = 1): LoadLine => ({ name, loadClass: 'inductive', watts: 1000, qty, hours: 8, surge: 4 });
  const pump: LoadLine = { name: 'Pump', loadClass: 'inductive', watts: 1000, qty: 1, hours: 1, surge: 6 };
  const flat = S({ safetyFactor: 1, futureBuffer: 1, inverterEfficiency: 1 });

  test('only the largest single starter counts under "single"', () => {
    const a = auditLoads([ac('AC'), pump], { ...flat, surgeConcurrency: 'single' });
    assert.equal(a.surgeAllowanceWatts, 5000, 'pump 6x beats AC 4x; the AC adds nothing');
    assert.equal(a.largestSurgeLine, 'Pump');
  });

  test('two identical motors do not add under "single"', () => {
    const a = auditLoads([ac('AC1'), ac('AC2')], { ...flat, surgeConcurrency: 'single' });
    assert.equal(a.surgeAllowanceWatts, 3000, 'one starts at a time');
  });

  test('every motor adds under "all"', () => {
    const a = auditLoads([ac('AC'), pump], { ...flat, surgeConcurrency: 'all' });
    assert.equal(a.surgeAllowanceWatts, 8000, '3000 + 5000');
  });

  test('entry form does not change the answer (one row qty 2 === two rows)', () => {
    for (const mode of ['single', 'all'] as const) {
      const oneRow = auditLoads([ac('AC', 2)], { ...flat, surgeConcurrency: mode });
      const twoRows = auditLoads([ac('AC1'), ac('AC2')], { ...flat, surgeConcurrency: mode });
      assert.equal(oneRow.surgeAllowanceWatts, twoRows.surgeAllowanceWatts, `surge allowance differs in "${mode}"`);
      assert.equal(oneRow.grandTotalDesignWatts, twoRows.grandTotalDesignWatts, `class total differs in "${mode}"`);
    }
  });

  test('the class total ignores surgeConcurrency entirely', () => {
    const single = auditLoads([ac('AC', 5)], { ...flat, surgeConcurrency: 'single' });
    const all = auditLoads([ac('AC', 5)], { ...flat, surgeConcurrency: 'all' });
    assert.equal(single.grandTotalDesignWatts, all.grandTotalDesignWatts);
    assert.equal(all.grandTotalDesignWatts, 20000, 'whiteboard convention: watts x qty x surge');
  });
});

describe('Stage 2 — battery bank', () => {
  test('lithium bank nameplate, full-day autonomy (photo 4 prints 120 kWh)', () => {
    const r = computeSizing(BOARD, S({ nightFraction: 1, lossFactor: 1, daysAutonomy: 1, depthOfDischarge: 0.9, batteryUnitVolts: 48, batteryUnitAh: 200 }));
    close(r.battery.bankNameplateWh / 1000, 120.687, 0.01, 'lithium nameplate kWh');
  });

  test('lead-acid: 90.5 raw, 92 installed after whole-string rounding', () => {
    const r = computeSizing(BOARD, S({ nightFraction: 1, lossFactor: 1, daysAutonomy: 1, depthOfDischarge: 0.5, batteryUnitVolts: 12, batteryUnitAh: 200 }));
    close(r.battery.bankNameplateWh / (12 * 200), 90.515, 0.01, 'bare division');
    assert.equal(r.battery.unitCount, 92, 'the board prints 92; 91 cannot be wired as whole 4-unit strings on 48 V');
    assert.equal(r.battery.seriesCount * r.battery.parallelStrings, r.battery.unitCount);
  });

  test('night-only bank (card: 17.9 kWh)', () => {
    const load: LoadLine[] = [{ name: '10 kWh/day', loadClass: 'capacitive', watts: 10000, qty: 1, hours: 1, surge: 1 }];
    const r = computeSizing(load, S({ nightFraction: 0.7, lossFactor: 1.15, daysAutonomy: 2, depthOfDischarge: 0.9 }));
    close(r.battery.bankNameplateWh / 1000, 17.889, 0.01, 'night-only kWh');
  });
});

describe('Stage 3 — PV array', () => {
  test('550 W panels: 95, not the 94 the board prints', () => {
    const r = computeSizing(BOARD, S({ peakSunHours: 4, performanceRatio: 0.65, arrayFoS: 1.25, panelWatts: 550 }));
    close(r.array.exactPanelCount, 94.946, 0.01, 'exact count');
    assert.equal(r.array.panelCount, 95, 'the board pre-rounds 120.687 kWh to 120 before dividing');
  });

  test('650 W panels: 81, not the 80 the board prints', () => {
    const r = computeSizing(BOARD, S({ peakSunHours: 4, performanceRatio: 0.65, arrayFoS: 1.25, panelWatts: 650 }));
    close(r.array.exactPanelCount, 80.339, 0.01, 'exact count');
    assert.equal(r.array.panelCount, 81);
  });

  test('Leonics cross-check reproduces its own worked example (4 modules)', () => {
    const load: LoadLine[] = [{ name: 'leonics', loadClass: 'capacitive', watts: 1092, qty: 1, hours: 1, surge: 1 }];
    const r = computeSizing(load, S({ arrayPreset: 'leonics', peakSunHours: 5, performanceRatio: 3.43 / 5, panelWatts: 110, panelVoc: 20.7, panelIsc: 7.5, controllerMaxPvVolts: 100 }));
    close(r.array.exactPanelCount, 3.763, 0.01, 'exact count');
    assert.equal(r.array.panelCount, 4);
  });

  test('string voltage never exceeds the controller limit without a warning', () => {
    const load: LoadLine[] = [{ name: 'x', loadClass: 'resistive', watts: 5000, qty: 1, hours: 8, surge: 1 }];
    const r = computeSizing(load, S({ panelVoc: 300, controllerMaxPvVolts: 100 }));
    assert.ok(!r.array.stringVocOk, 'should flag the over-voltage string');
    assert.ok(r.warnings.some((w) => w.includes('open-circuit voltage')), 'should warn about it');
  });
});

describe('Stage 4 — charge controller', () => {
  test('MPPT formula (card: 2800 W / 48 V x 1.25 = 72.9 A -> 80 A)', () => {
    close((2800 / 48) * 1.25, 72.92, 0.01, 'MPPT amps');
  });

  test('PWM formula (card: 7 x 10 A x 1.25 = 87.5 A -> 100 A)', () => {
    close(7 * 10 * 1.25, 87.5, 0.01, 'PWM amps');
  });

  test('a current beyond the largest unit splits across controllers rather than capping', () => {
    const load: LoadLine[] = [{ name: 'big', loadClass: 'resistive', watts: 12000, qty: 1, hours: 12, surge: 1 }];
    const r = computeSizing(load, S({ peakSunHours: 4 }));
    assert.ok(r.controller.ratedAmps * r.controller.unitCount >= r.controller.exactAmps, 'total controller capacity must meet the requirement');
  });
});

describe('Stages 5 & 6 — cables and breakers', () => {
  test('voltage-drop formula (card: 115 A, 2 m, 48 V, 3% -> 5.49 mm²)', () => {
    close((2 * 2 * 115 * COPPER_RESISTIVITY) / (48 * 0.03), 5.494, 0.01, 'volt-drop mm²');
  });

  test('battery-to-inverter breaker (card: 5000 W / 48 V / 0.9 x 1.25 = 144.7 A -> 150 A)', () => {
    close((5000 / (48 * 0.9)) * 1.25, 144.68, 0.01, 'breaker amps');
  });

  test('PV cable is sized from Isc, not P/Voc', () => {
    const load: LoadLine[] = [
      { name: 'led', loadClass: 'resistive', watts: 10, qty: 20, hours: 6, surge: 1 },
      { name: 'fridge', loadClass: 'inductive', watts: 200, qty: 1, hours: 24, surge: 3 },
    ];
    const r = computeSizing(load, S());
    const arrayIsc = r.array.parallelStrings * DEFAULT_SETTINGS.panelIsc;
    close(r.cables[0].amps, arrayIsc * 1.25, 0.01, 'PV segment design current must be Isc x 1.25');
  });

  test('every cable carries its own design current and its breaker', () => {
    const load: LoadLine[] = [
      { name: 'ac', loadClass: 'inductive', watts: 1120, qty: 3, hours: 10, surge: 4 },
      { name: 'heater', loadClass: 'resistive', watts: 3000, qty: 1, hours: 2, surge: 1 },
    ];
    const r = computeSizing(load, S({ peakSunHours: 4.5 }));
    const AMPACITY: Record<number, number> = { 1.5: 15, 2.5: 21, 4: 28, 6: 36, 10: 50, 16: 68, 25: 89, 35: 110, 50: 134, 70: 171, 95: 207, 120: 239, 150: 275, 185: 314, 240: 370 };
    r.cables.forEach((c, i) => {
      const amp = AMPACITY[c.requiredMm2];
      const overflow = r.warnings.some((w) => w.includes('parallel conductors'));
      assert.ok(amp >= c.amps || overflow, `${c.name}: ${c.requiredMm2} mm² (${amp} A) cannot carry ${c.amps.toFixed(0)} A`);
      assert.ok(amp >= r.breakers[i].ratedAmps || overflow, `${c.name}: breaker ${r.breakers[i].ratedAmps} A exceeds cable ampacity ${amp} A`);
    });
  });
});

describe('System voltage', () => {
  test('is driven by the larger of inverter rating and array size', () => {
    // Small peak load, high daily energy: sizing off the inverter alone would
    // pick 12/24 V and demand an unbuildable controller current.
    const load: LoadLine[] = [{ name: 'steady', loadClass: 'capacitive', watts: 450, qty: 1, hours: 24, surge: 1 }];
    const r = computeSizing(load, S({ peakSunHours: 4 }));
    assert.ok(r.array.arrayWatts > 3000, 'precondition: this load needs a >3 kW array');
    assert.equal(r.inverter.systemVolts, 48, 'array size must promote the bank to 48 V');
  });
});
