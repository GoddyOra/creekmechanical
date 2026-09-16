// Robustness — edge cases, input sanitisation, and a randomised sweep.
//
// The sweep is seeded, so a failure here is reproducible. It asserts
// cross-equation invariants, not just the absence of crashes: a result that
// is internally inconsistent is a bug even when every number is finite.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSizing, DEFAULT_SETTINGS, type LoadLine, type SizingSettings,
} from '../../src/lib/solar/engine.ts';
import {
  computeEconomics, DEFAULT_ECONOMIC_SETTINGS, type EconomicSettings,
} from '../../src/lib/solar/economics.ts';
import { DEFAULT_PRICES, DEFAULT_TARIFFS } from '../../src/lib/solar/prices.ts';
import { CURRENCIES, fromNgn, toNgn, formatMoney } from '../../src/lib/solar/currency.ts';
import { formatSolarReport } from '../../src/lib/solar/report.ts';
import { suggestAppliance, fallbackClass } from '../../src/lib/solar/catalog.ts';

const AMPACITY: Record<number, number> = { 1.5: 15, 2.5: 21, 4: 28, 6: 36, 10: 50, 16: 68, 25: 89, 35: 110, 50: 134, 70: 171, 95: 207, 120: 239, 150: 275, 185: 314, 240: 370 };

function assertAllFinite(value: unknown, path: string) {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `${path} is ${value}`);
    return;
  }
  if (Array.isArray(value)) return value.forEach((v, i) => assertAllFinite(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) assertAllFinite(v, `${path}.${k}`);
  }
}

describe('Edge cases', () => {
  const cases: Array<[string, LoadLine[], Partial<SizingSettings>]> = [
    ['empty load list', [], {}],
    ['zero hours', [{ name: 'x', loadClass: 'resistive', watts: 100, qty: 1, hours: 0, surge: 1 }], {}],
    ['zero watts', [{ name: 'x', loadClass: 'resistive', watts: 0, qty: 1, hours: 5, surge: 1 }], {}],
    ['very large load', [{ name: 'x', loadClass: 'inductive', watts: 50000, qty: 10, hours: 24, surge: 7 }], {}],
    ['very small load', [{ name: 'x', loadClass: 'capacitive', watts: 0.5, qty: 1, hours: 0.1, surge: 1 }], {}],
    ['zero peak sun hours', [{ name: 'x', loadClass: 'resistive', watts: 100, qty: 1, hours: 5, surge: 1 }], { peakSunHours: 0 }],
    ['zero depth of discharge', [{ name: 'x', loadClass: 'resistive', watts: 100, qty: 1, hours: 5, surge: 1 }], { depthOfDischarge: 0 }],
    ['negative settings', [{ name: 'x', loadClass: 'resistive', watts: 100, qty: 1, hours: 5, surge: 1 }], { safetyFactor: -2, panelWatts: -550, daysAutonomy: -1 }],
    ['NaN settings', [{ name: 'x', loadClass: 'resistive', watts: 100, qty: 1, hours: 5, surge: 1 }], { peakSunHours: Number.NaN, lossFactor: Number.NaN }],
    ['nightFraction zero', [{ name: 'x', loadClass: 'resistive', watts: 100, qty: 1, hours: 5, surge: 1 }], { nightFraction: 0 }],
  ];

  for (const [label, loads, over] of cases) {
    test(`${label} produces finite output and no NaN in the report`, () => {
      const settings = { ...DEFAULT_SETTINGS, ...over };
      const s = computeSizing(loads, settings);
      const e = computeEconomics(s, settings, DEFAULT_ECONOMIC_SETTINGS, DEFAULT_PRICES, DEFAULT_TARIFFS);
      assertAllFinite(s, 'sizing');
      assertAllFinite(e, 'economics');
      const report = formatSolarReport(s, settings, e, DEFAULT_ECONOMIC_SETTINGS, CURRENCIES[0]);
      assert.ok(!/\bNaN\b|\bInfinity\b/.test(report), 'report must never show NaN or Infinity');
    });
  }

  test('invalid settings are clamped and reported, not silently swallowed', () => {
    const loads: LoadLine[] = [{ name: 'x', loadClass: 'resistive', watts: 100, qty: 1, hours: 5, surge: 1 }];
    const r = computeSizing(loads, { ...DEFAULT_SETTINGS, depthOfDischarge: 0 });
    assert.ok(r.warnings.some((w) => w.toLowerCase().includes('depth of discharge')), 'must say what it changed');
  });
});

describe('Currency', () => {
  test('values round-trip through every currency within 0.01%', () => {
    for (const c of CURRENCIES) {
      for (const ngn of [420, 900, 28000, 225, 1300, 480, 5200]) {
        const displayed = Number(fromNgn(ngn, c).toPrecision(6));
        const back = toNgn(displayed, c);
        const drift = (Math.abs(back - ngn) / ngn) * 100;
        assert.ok(drift < 0.01, `${c.code}: ${ngn} -> ${displayed} -> ${back} (${drift.toFixed(4)}% drift)`);
      }
    }
  });

  test('formatting always carries the symbol and never renders NaN', () => {
    for (const c of CURRENCIES) {
      assert.ok(formatMoney(1234567, c).startsWith(c.symbol), `${c.code} missing symbol`);
      assert.equal(formatMoney(Number.NaN, c), '—');
    }
  });
});

describe('Load classification', () => {
  const expected: Array<[string, string]> = [
    ['Split unit AC', 'inductive'], ['water heater', 'resistive'], ['ceiling fan', 'inductive'],
    ['LED bulb', 'resistive'], ['laptop', 'capacitive'], ['deep freezer', 'inductive'],
    ['electric iron', 'resistive'], ['router', 'capacitive'], ['borehole pump', 'inductive'],
    ['microwave', 'inductive'], ['air fryer', 'resistive'], ['desktop', 'capacitive'],
  ];

  for (const [name, want] of expected) {
    test(`"${name}" is classified ${want}`, () => {
      const hit = suggestAppliance(name);
      assert.equal(hit ? hit.loadClass : fallbackClass(name), want);
    });
  }

  test('longest match wins, so "water heater" beats "heater"', () => {
    assert.equal(suggestAppliance('water heater')?.name, 'Water heater');
    assert.equal(suggestAppliance('ceiling fan')?.name, 'Ceiling fan');
  });

  test('no match returns null rather than guessing silently', () => {
    assert.equal(suggestAppliance(''), null);
    assert.equal(suggestAppliance('zzzqqq'), null);
  });
});

describe('Randomised sweep', () => {
  test('2000 seeded configurations hold every invariant', () => {
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
    const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);
    const classes = ['resistive', 'capacitive', 'inductive'] as const;

    for (let i = 0; i < 2000; i++) {
      const loads: LoadLine[] = Array.from({ length: 1 + Math.floor(rnd() * 8) }, (_, j) => ({
        name: `L${j}`, loadClass: pick(classes),
        watts: between(1, 5000), qty: 1 + Math.floor(rnd() * 8),
        hours: between(0, 24), surge: between(1, 7),
      }));
      const settings: SizingSettings = {
        ...DEFAULT_SETTINGS,
        safetyFactor: between(1, 2), futureBuffer: between(1, 2),
        inverterEfficiency: between(0.6, 1),
        surgeConcurrency: pick(['single', 'all'] as const),
        inverterBasis: pick(['largest-surge', 'class-total'] as const),
        nightFraction: between(0, 1), lossFactor: between(1, 1.5), daysAutonomy: between(0.5, 5),
        depthOfDischarge: between(0.2, 1), batteryUnitVolts: pick([12, 24, 48]), batteryUnitAh: between(50, 400),
        arrayFoS: between(1, 2), performanceRatio: between(0.4, 1),
        arrayPreset: pick(['whiteboard', 'whatsapp', 'leonics'] as const),
        peakSunHours: between(1, 8), panelWatts: pick([300, 400, 550, 650]),
        panelVoc: between(20, 60), panelIsc: between(5, 20),
        controllerMaxPvVolts: pick([100, 150, 250, 500]), highLightning: rnd() > 0.5,
      };
      const econ: EconomicSettings = {
        ...DEFAULT_ECONOMIC_SETTINGS,
        lifeYears: 5 + Math.floor(rnd() * 25), batteryLifeYears: 2 + Math.floor(rnd() * 15),
        omFraction: between(0, 0.3), realRateOfReturn: between(0, 0.4),
        degradationRate: between(0, 0.02), equityShare: between(0, 1),
        costOfEquity: between(0, 0.5), costOfDebt: between(0, 0.5), taxRate: between(0, 0.5),
        benefitBasis: pick(['avoided-cost', 'selling-price'] as const),
        hybridDieselLitresPerYear: rnd() > 0.8 ? between(0, 5000) : 0,
      };

      const ctx = `iteration ${i} (seed 12345)`;
      const s = computeSizing(loads, settings);
      const e = computeEconomics(s, settings, econ, DEFAULT_PRICES, DEFAULT_TARIFFS);

      assertAllFinite(s, `${ctx} sizing`);
      assertAllFinite(e, `${ctx} economics`);

      // Every component must meet the requirement it was sized against.
      assert.ok(s.inverter.ratedWatts >= s.inverter.requiredWatts - 1e-6 || s.inverter.exceedsStandardSizes, `${ctx}: inverter below requirement`);
      assert.ok(s.battery.installedWh + 1e-6 >= s.battery.bankNameplateWh, `${ctx}: battery below requirement`);
      assert.ok(s.controller.ratedAmps * s.controller.unitCount + 1e-6 >= s.controller.exactAmps, `${ctx}: controller below requirement`);

      // Cables carry their own current and their breaker, or the overflow is warned.
      const overflow = s.warnings.some((w) => w.includes('parallel conductors'));
      s.cables.forEach((c, k) => {
        const amp = AMPACITY[c.requiredMm2] ?? 0;
        assert.ok(amp + 1e-6 >= c.amps || overflow, `${ctx}: ${c.name} cable below design current`);
        assert.ok(amp >= s.breakers[k].ratedAmps || overflow, `${ctx}: ${c.name} breaker above cable ampacity`);
      });

      // Indicators must agree with each other.
      if (Number.isFinite(e.bcr) && Number.isFinite(e.npv) && e.bcr > 0) {
        assert.equal(e.bcr > 1, e.npv > 0, `${ctx}: BCR ${e.bcr.toFixed(3)} disagrees with NPV ${e.npv.toFixed(0)}`);
      }
      if (e.irr !== null && Number.isFinite(e.npv)) {
        assert.equal(e.irr > econ.realRateOfReturn, e.npv > 0, `${ctx}: IRR disagrees with NPV`);
      }
      assert.ok(e.payback.years === null || e.payback.years >= 0, `${ctx}: negative payback`);
      assert.ok(e.om.replacementYears.every((y) => y < econ.lifeYears), `${ctx}: replacement scheduled at or past end of life`);

      const report = formatSolarReport(s, settings, e, econ, pick(CURRENCIES));
      assert.ok(!/\bNaN\b|\bInfinity\b/.test(report), `${ctx}: report contains NaN/Infinity`);
    }
  });
});
