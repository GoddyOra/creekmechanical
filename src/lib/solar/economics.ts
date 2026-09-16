// Techno-economic analysis, equations (1)-(13) adapted from
// Sobamowo & Ojolo (2018), "Techno-Economic Analysis of Biomass Energy
// Utilization through Gasification Technology...", Journal of Energy,
// Article ID 4860252. Equation (14), return on investment, is added.
//
// Three structural differences from the biomass case drive the adaptation:
//   (5)  There is no fuel — the term collapses to zero (hybrid case aside).
//   (3)  Storage must be replaced mid-life — a term the paper has no need of.
//   (12) Output degrades — the paper's constant-output annuity shortcut in
//        the LCOE denominator does not hold, so it is year-indexed here.
//
// Two notation problems in the source paper are corrected here rather than
// reproduced: `CF` is overloaded (capacity factor in eq. 2/3/5/6, cost of
// fuel in eq. 1/12) and the nomenclature labels `Re`/`Rd` backwards relative
// to how eq. (13) uses them — the (1-T) tax shield belongs to debt.
//
// All money is in the base currency (NGN); the UI converts for display.
// Pure: no DOM, no fetch.

import { sanitizeSettings, type SizingResult, type SizingSettings } from './engine.ts';
import type { PriceBook, TariffBook } from './prices.ts';

export interface EconomicSettings {
  /** Plant life in years. */
  lifeYears: number;
  /** Battery service life in years, for the replacement term in eq. (3). */
  batteryLifeYears: number;
  /** Annual O&M as a fraction of initial investment (`m` in the paper). */
  omFraction: number;
  /** Real rate of return (`I` in the paper). */
  realRateOfReturn: number;
  /** Annual panel degradation. ~0.005/yr. */
  degradationRate: number;
  /** Annual operating hours (`N`). 8760 for an always-available system. */
  annualHours: number;
  /** Parasitic consumption of controller/monitoring, percent. */
  auxiliaryPercent: number;
  /** Marginal loss factor. ~0 behind the meter. */
  marginalLossFactor: number;
  /** Battery round-trip efficiency. */
  roundTripEfficiency: number;
  /** Annual labour cost (cleaning, inspection). Zero is legitimate. */
  annualLabour: number;

  // Equation (13) — WACC inputs
  /** Equity share of capital, 0-1. */
  equityShare: number;
  /** Cost of equity (nominal). */
  costOfEquity: number;
  /** Cost of debt (nominal). */
  costOfDebt: number;
  /** Company tax rate. Zero for a residential system. */
  taxRate: number;

  /** Benefit basis for eq. (7). */
  benefitBasis: 'avoided-cost' | 'selling-price';
  /** Litres of diesel per year if a generator is retained. Eq. (5). */
  hybridDieselLitresPerYear: number;
}

export const DEFAULT_ECONOMIC_SETTINGS: EconomicSettings = {
  lifeYears: 20,
  batteryLifeYears: 10,
  omFraction: 0.03,
  realRateOfReturn: 0.10,
  degradationRate: 0.005,
  annualHours: 8760,
  auxiliaryPercent: 1,
  marginalLossFactor: 0,
  roundTripEfficiency: 0.9,
  annualLabour: 0,

  equityShare: 1,
  costOfEquity: 0.17,
  costOfDebt: 0.24,
  taxRate: 0,

  benefitBasis: 'avoided-cost',
  hybridDieselLitresPerYear: 0,
};

// ---------------------------------------------------------------------------
// Shared helper — the annuity factor appears in (4), (6), (9), (10) and (11)
// ---------------------------------------------------------------------------

/** A(I, n) = ((1+I)^n - 1) / (I (1+I)^n) */
export function annuityFactor(rate: number, years: number): number {
  if (years <= 0) return 0;
  if (Math.abs(rate) < 1e-12) return years; // limit as I -> 0
  return ((1 + rate) ** years - 1) / (rate * (1 + rate) ** years);
}

// ---------------------------------------------------------------------------
// (1) Total capital investment cost
//     C = C_PV + C_INV + C_BAT + C_CC + C_BOS + C_INST + C_R
// ---------------------------------------------------------------------------

export interface CapitalCost {
  panels: number;
  inverter: number;
  battery: number;
  controller: number;
  balanceOfSystem: number;
  mounting: number;
  installation: number;
  contingency: number;
  total: number;
}

export function computeCapitalCost(
  sizing: SizingResult,
  sizingSettings: SizingSettings,
  prices: PriceBook
): CapitalCost {
  const panels = sizing.array.arrayWatts * prices.panelPerWatt;
  const inverter = sizing.inverter.ratedWatts * prices.inverterPerWatt;
  const batteryRate =
    sizingSettings.batteryChemistry === 'lithium' ? prices.batteryPerWhLithium : prices.batteryPerWhLeadAcid;
  const battery = sizing.battery.installedWh * batteryRate;
  // A big array splits across several controllers, and each one brings its
  // own run to the bank plus its own breaker.
  const controllerUnits = sizing.controller.unitCount;
  const controller = sizing.controller.ratedAmps * controllerUnits * prices.controllerPerAmp;

  const cableCost = sizing.cables.reduce((sum, seg) => {
    const runs = seg.name.includes('Controller → battery') ? controllerUnits : 1;
    return sum + seg.lengthM * 2 * seg.requiredMm2 * prices.cablePerMetreMm2 * runs;
  }, 0);
  const breakerCost = (sizing.breakers.length + (controllerUnits - 1)) * prices.breakerEach;
  const spdCost = 2 * prices.spdEach; // one DC, one AC
  const balanceOfSystem = cableCost + breakerCost + spdCost;

  const mounting = sizing.array.panelCount * prices.mountingPerPanel;

  const hardware = panels + inverter + battery + controller + balanceOfSystem + mounting;
  const installation = hardware * prices.installFraction;
  const contingency = hardware * prices.contingencyFraction;

  return {
    panels,
    inverter,
    battery,
    controller,
    balanceOfSystem,
    mounting,
    installation,
    contingency,
    total: hardware + installation + contingency,
  };
}

// ---------------------------------------------------------------------------
// (2) Annual energy delivered
//     Et = P_array x PSH x 365 x PR x (1 - P_aux/100) x (1 - MLF)
// ---------------------------------------------------------------------------

export interface EnergyResult {
  /** Gross generation in kWh/yr, before storage losses. */
  generatedKwh: number;
  /** After the round-trip hit on the stored fraction. */
  deliveredKwh: number;
  capacityFactor: number;
}

export function computeAnnualEnergy(
  sizing: SizingResult,
  sizingSettings: SizingSettings,
  econ: EconomicSettings
): EnergyResult {
  const generatedKwh =
    (sizing.array.arrayWatts / 1000) *
    sizingSettings.peakSunHours *
    365 *
    sizing.array.effectivePR *
    (1 - econ.auxiliaryPercent / 100) *
    (1 - econ.marginalLossFactor);

  // Only the stored fraction takes the round-trip loss.
  const stored = sizingSettings.nightFraction;
  const deliveredKwh = generatedKwh * ((1 - stored) + stored * econ.roundTripEfficiency);

  const capacityFactor = (sizingSettings.peakSunHours * sizing.array.effectivePR) / 24;

  return { generatedKwh, deliveredKwh, capacityFactor };
}

// ---------------------------------------------------------------------------
// (3) Operation and maintenance cost — WITH the battery replacement term
//     M = SUM(K_i C_i) + labour + M_repl
//     M_repl = C_BAT x (CEIL(n / L_batt) - 1) / n
// ---------------------------------------------------------------------------

export interface OmResult {
  baseOm: number;
  batteryReplacementAnnualised: number;
  labour: number;
  total: number;
  replacementCount: number;
  replacementYears: number[];
}

export function computeOm(capital: CapitalCost, econ: EconomicSettings): OmResult {
  const baseOm = capital.total * econ.omFraction;

  const replacementYears: number[] = [];
  if (econ.batteryLifeYears > 0) {
    for (let t = econ.batteryLifeYears; t < econ.lifeYears; t += econ.batteryLifeYears) {
      replacementYears.push(t);
    }
  }
  const replacementCount = replacementYears.length;
  const batteryReplacementAnnualised =
    econ.lifeYears > 0 ? (capital.battery * replacementCount) / econ.lifeYears : 0;

  return {
    baseOm,
    batteryReplacementAnnualised,
    labour: econ.annualLabour,
    total: baseOm + batteryReplacementAnnualised + econ.annualLabour,
    replacementCount,
    replacementYears,
  };
}

// ---------------------------------------------------------------------------
// (4) Annual revenue   AR = (C/n)[1 + m A(I,n)]
// ---------------------------------------------------------------------------

export function computeAnnualRevenue(capital: number, omFraction: number, econ: EconomicSettings): number {
  const A = annuityFactor(econ.realRateOfReturn, econ.lifeYears);
  return (capital / econ.lifeYears) * (1 + omFraction * A);
}

// ---------------------------------------------------------------------------
// (5) Cost of fuel — ZERO for solar
// ---------------------------------------------------------------------------

/**
 * The paper's C_F = 8760 x CF x P_rated x C_B x SFCR. Sunlight has no
 * specific fuel consumption rate, so the whole term vanishes. Removing it is
 * most of why a PV system clears BCR > 1 at a tariff far below the paper's
 * $0.727/kWh — in Table 16 the biomass plant's fuel alone runs to $10.8M/yr.
 *
 * The one exception is a retained backup generator, which does burn fuel and
 * must be entered rather than assumed away. Note that *displaced* diesel is a
 * benefit and belongs in (7), not here.
 */
export function computeFuelCost(econ: EconomicSettings, tariffs: TariffBook): number {
  return econ.hybridDieselLitresPerYear * tariffs.dieselPerLitre;
}

// ---------------------------------------------------------------------------
// (6) Cost per kWh generated
//     C_pkW = (C / (N n)) (1 / (P_R x capacityFactor)) [1 + m A(I,n)]
// ---------------------------------------------------------------------------

export function computeCostPerKwh(
  capital: number,
  arrayKw: number,
  energy: EnergyResult,
  omFraction: number,
  econ: EconomicSettings
): number {
  const annualKwh = econ.annualHours * arrayKw * energy.capacityFactor;
  if (annualKwh <= 0 || econ.lifeYears <= 0) return Number.NaN;
  const A = annuityFactor(econ.realRateOfReturn, econ.lifeYears);
  return (capital / (annualKwh * econ.lifeYears)) * (1 + omFraction * A);
}

// ---------------------------------------------------------------------------
// (7) Benefit delivered annually
// ---------------------------------------------------------------------------

export interface BenefitResult {
  basis: EconomicSettings['benefitBasis'];
  gridSavings: number;
  dieselSavings: number;
  total: number;
}

export function computeAnnualBenefit(
  energy: EnergyResult,
  econ: EconomicSettings,
  tariffs: TariffBook,
  costPerKwh: number
): BenefitResult {
  if (econ.benefitBasis === 'selling-price') {
    // The paper's own framing: what would this have to sell for?
    return { basis: 'selling-price', gridSavings: 0, dieselSavings: 0, total: energy.deliveredKwh * costPerKwh };
  }

  // Avoided cost — what a Nigerian household or SME actually experiences.
  const dieselKwh = energy.deliveredKwh * tariffs.generatorDisplacedFraction;
  const gridKwh = energy.deliveredKwh - dieselKwh;
  const gridSavings = gridKwh * tariffs.gridTariffPerKwh;
  const dieselSavings = dieselKwh * tariffs.generatorLitresPerKwh * tariffs.dieselPerLitre;
  return { basis: 'avoided-cost', gridSavings, dieselSavings, total: gridSavings + dieselSavings };
}

// ---------------------------------------------------------------------------
// (8) Payback period
//     n = -ln(1 - IC/(B_A - m C)) / ln(1 + I)
// ---------------------------------------------------------------------------

export interface PaybackResult {
  years: number | null;
  reason: string | null;
}

export function computePayback(
  capital: number,
  benefit: number,
  omAnnual: number,
  econ: EconomicSettings
): PaybackResult {
  const net = benefit - omAnnual;
  if (net <= 0) {
    return { years: null, reason: 'Annual benefit does not exceed annual running costs, so the system never pays back.' };
  }
  const i = econ.realRateOfReturn;
  if (Math.abs(i) < 1e-12) {
    // Undiscounted limit: the discounted formula is indeterminate at i = 0.
    return { years: capital / net, reason: null };
  }
  const inner = 1 - (capital * i) / net;
  if (inner <= 0) {
    return {
      years: null,
      reason: `At a ${(i * 100).toFixed(1)}% required return the discounted value of every future year of benefit still never reaches the capital cost, so the system does not pay back within any number of years.`,
    };
  }
  const years = -Math.log(inner) / Math.log(1 + i);
  return { years: years > econ.lifeYears ? years : years, reason: null };
}

// ---------------------------------------------------------------------------
// (9) Net present value     NPV = B_A A(I,n) - C[1 + m A(I,n)]
// ---------------------------------------------------------------------------

export function computeNpv(capital: number, benefit: number, omAnnual: number, econ: EconomicSettings): number {
  const A = annuityFactor(econ.realRateOfReturn, econ.lifeYears);
  // Algebraically identical to the paper's B_A·A - C(1 + m·A), with m·C
  // replaced by the absolute annual O&M so the battery replacement term added
  // to equation (3) actually reaches this indicator.
  return (benefit - omAnnual) * A - capital;
}

// ---------------------------------------------------------------------------
// (10) Benefit cost ratio   BCR = (B_A/C) [A / (1 + m A)]
// ---------------------------------------------------------------------------

export function computeBcr(capital: number, benefit: number, omAnnual: number, econ: EconomicSettings): number {
  if (capital <= 0) return Number.NaN;
  const A = annuityFactor(econ.realRateOfReturn, econ.lifeYears);
  const discountedCost = capital + omAnnual * A;
  return discountedCost > 0 ? (benefit * A) / discountedCost : Number.NaN;
}

// ---------------------------------------------------------------------------
// (11) Internal rate of return
//      Solve B_A A(IRR,n) = C[1 + m A(IRR,n)]
// ---------------------------------------------------------------------------

/**
 * Rearranging, A(IRR, n) = C / (B_A - m C). A is strictly decreasing in the
 * rate with a maximum of n at rate 0, which makes the root both unique and
 * easy to bracket — so Newton-Raphson (as the paper specifies) runs with a
 * bisection guard rather than bare, and a flat derivative can't send it off
 * to a garbage root.
 */
export function computeIrr(capital: number, benefit: number, omAnnual: number, econ: EconomicSettings): number | null {
  const n = econ.lifeYears;
  const net = benefit - omAnnual;
  if (net <= 0 || capital <= 0 || n <= 0) return null;

  const target = capital / net;
  if (target >= n) return null; // even at a zero discount rate it never repays
  if (target <= 0) return null;

  const f = (r: number) => annuityFactor(r, n) - target;

  let lo = 1e-9;
  let hi = 1;
  let fLo = f(lo);
  let fHi = f(hi);
  let guard = 0;
  while (fHi > 0 && guard < 60) {
    hi *= 2;
    fHi = f(hi);
    guard += 1;
  }
  if (fLo < 0 || fHi > 0) return null;

  let r = Math.min(Math.max(econ.realRateOfReturn, lo), hi);
  for (let i = 0; i < 100; i++) {
    const fr = f(r);
    if (Math.abs(fr) < 1e-10) return r;
    if (fr > 0) { lo = r; fLo = fr; } else { hi = r; fHi = fr; }

    const h = Math.max(1e-7, r * 1e-5);
    const derivative = (f(r + h) - f(r - h)) / (2 * h);
    let next = Number.isFinite(derivative) && Math.abs(derivative) > 1e-12 ? r - fr / derivative : Number.NaN;
    // Bisection guard: reject any Newton step that leaves the bracket.
    if (!Number.isFinite(next) || next <= lo || next >= hi) next = (lo + hi) / 2;
    if (Math.abs(next - r) < 1e-12) return next;
    r = next;
  }
  return r;
}

// ---------------------------------------------------------------------------
// (12) Levelized cost of electricity — YEAR-INDEXED for panel degradation
// ---------------------------------------------------------------------------

export interface LcoeResult {
  value: number;
  discountedCost: number;
  discountedEnergyKwh: number;
  /** Energy in the final year, to show how far degradation carries. */
  finalYearKwh: number;
}

/**
 * The paper annuitizes the denominator, which silently assumes constant
 * annual output. Panels lose ~0.5%/yr, so the series is indexed by year here:
 *
 *            C + SUM_t [ (1-T)(C_F + M_t) / (1+d)^t ]
 *   LCOE =  ------------------------------------------
 *                   SUM_t [ E_t / (1+d)^t ]
 *
 * with E_t = Et (1 - delta)^(t-1) and M_t carrying the battery replacement in
 * the years it actually falls — which is the whole reason to index by year
 * rather than annuitize.
 */
export function computeLcoe(
  capital: CapitalCost,
  energy: EnergyResult,
  om: OmResult,
  fuelCost: number,
  econ: EconomicSettings,
  discountRate: number
): LcoeResult {
  const baseAnnualCost = om.baseOm + om.labour + fuelCost;
  let discountedCost = capital.total;
  let discountedEnergyKwh = 0;
  let finalYearKwh = 0;

  for (let t = 1; t <= econ.lifeYears; t++) {
    const isReplacementYear = om.replacementYears.includes(t);
    const costT = baseAnnualCost + (isReplacementYear ? capital.battery : 0);
    discountedCost += ((1 - econ.taxRate) * costT) / (1 + discountRate) ** t;

    const energyT = energy.deliveredKwh * (1 - econ.degradationRate) ** (t - 1);
    discountedEnergyKwh += energyT / (1 + discountRate) ** t;
    finalYearKwh = energyT;
  }

  return {
    value: discountedEnergyKwh > 0 ? discountedCost / discountedEnergyKwh : Number.NaN,
    discountedCost,
    discountedEnergyKwh,
    finalYearKwh,
  };
}

// ---------------------------------------------------------------------------
// (13) Discount rate (WACC)
//      d = (W R_e)/V + (X R_d)/V (1 - T)
// ---------------------------------------------------------------------------

export function computeWacc(econ: EconomicSettings): number {
  const equity = Math.min(Math.max(econ.equityShare, 0), 1);
  const debt = 1 - equity;
  return equity * econ.costOfEquity + debt * econ.costOfDebt * (1 - econ.taxRate);
}

// ---------------------------------------------------------------------------
// (14) Return on investment — added, not from the paper
// ---------------------------------------------------------------------------

export interface RoiResult {
  /** (14)  Simple lifetime ROI, undiscounted. The headline number. */
  simple: number;
  /** (14a) Discounted ROI = NPV/C. Consistent with equation (9). */
  discounted: number;
  /** (14b) Simple annual return. */
  annual: number;
  /**
   * True when the simple and discounted figures disagree in sign — a system
   * that looks profitable undiscounted but is not once the time value of
   * money is restored. The UI must surface this rather than bury it.
   */
  divergenceWarning: boolean;
}

export function computeRoi(
  capital: number,
  benefit: number,
  om: number,
  npv: number,
  econ: EconomicSettings
): RoiResult {
  if (capital <= 0) {
    return { simple: Number.NaN, discounted: Number.NaN, annual: Number.NaN, divergenceWarning: false };
  }
  const netAnnual = benefit - om;
  const simple = ((netAnnual * econ.lifeYears - capital) / capital) * 100;
  const discounted = (npv / capital) * 100;
  const annual = (netAnnual / capital) * 100;
  return {
    simple,
    discounted,
    annual,
    divergenceWarning: simple > 0 && discounted < 0,
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export interface EconomicsResult {
  capital: CapitalCost;
  energy: EnergyResult;
  om: OmResult;
  annualRevenue: number;
  fuelCost: number;
  costPerKwh: number;
  benefit: BenefitResult;
  payback: PaybackResult;
  npv: number;
  bcr: number;
  irr: number | null;
  lcoe: LcoeResult;
  discountRate: number;
  roi: RoiResult;
  notes: string[];
}

/**
 * Clamp economic inputs the same way the sizing engine clamps its own: a zero
 * life or a negative rate arriving from a restored settings blob would
 * otherwise put NaN straight into the headline figures.
 */
export function sanitizeEconomicSettings(input: EconomicSettings): EconomicSettings {
  const num = (v: number, lo: number, hi: number, fallback: number) =>
    Number.isFinite(v) ? Math.min(Math.max(v, lo), hi) : fallback;
  return {
    ...input,
    lifeYears: Math.round(num(input.lifeYears, 1, 100, 20)),
    batteryLifeYears: Math.round(num(input.batteryLifeYears, 1, 100, 10)),
    omFraction: num(input.omFraction, 0, 5, 0.03),
    realRateOfReturn: num(input.realRateOfReturn, 0, 5, 0.1),
    degradationRate: num(input.degradationRate, 0, 0.5, 0.005),
    annualHours: num(input.annualHours, 1, 8784, 8760),
    auxiliaryPercent: num(input.auxiliaryPercent, 0, 99, 1),
    marginalLossFactor: num(input.marginalLossFactor, 0, 0.99, 0),
    roundTripEfficiency: num(input.roundTripEfficiency, 0.1, 1, 0.9),
    annualLabour: num(input.annualLabour, 0, Number.MAX_SAFE_INTEGER, 0),
    equityShare: num(input.equityShare, 0, 1, 1),
    costOfEquity: num(input.costOfEquity, 0, 5, 0.17),
    costOfDebt: num(input.costOfDebt, 0, 5, 0.24),
    taxRate: num(input.taxRate, 0, 0.99, 0),
    hybridDieselLitresPerYear: num(input.hybridDieselLitresPerYear, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

export function computeEconomics(
  sizing: SizingResult,
  rawSizingSettings: SizingSettings,
  rawEcon: EconomicSettings,
  prices: PriceBook,
  tariffs: TariffBook
): EconomicsResult {
  const econ = sanitizeEconomicSettings(rawEcon);
  // computeSizing clamps its own copy; this module gets the settings object
  // separately, so it has to clamp too or a zero peak-sun-hours reaches the
  // capacity factor and turns LCOE into NaN.
  const { settings: sizingSettings } = sanitizeSettings(rawSizingSettings);
  const capital = computeCapitalCost(sizing, sizingSettings, prices);
  const energy = computeAnnualEnergy(sizing, sizingSettings, econ);
  const om = computeOm(capital, econ);
  const fuelCost = computeFuelCost(econ, tariffs);
  const discountRate = computeWacc(econ);

  const arrayKw = sizing.array.arrayWatts / 1000;
  // Effective m: real annual O&M as a fraction of capital, so equations (4)
  // and (6) see the battery replacement too.
  const effectiveOmFraction = capital.total > 0 ? om.total / capital.total : econ.omFraction;
  const costPerKwh = computeCostPerKwh(capital.total, arrayKw, energy, effectiveOmFraction, econ);
  const benefit = computeAnnualBenefit(energy, econ, tariffs, costPerKwh);
  const annualRevenue = computeAnnualRevenue(capital.total, effectiveOmFraction, econ);

  // Every annuity-based indicator uses the ABSOLUTE annual O&M from equation
  // (3), not m·C — otherwise the battery replacement term never reaches them.
  const omAnnual = om.total;
  const npv = computeNpv(capital.total, benefit.total, omAnnual, econ);
  const bcr = computeBcr(capital.total, benefit.total, omAnnual, econ);
  const irr = computeIrr(capital.total, benefit.total, omAnnual, econ);
  const payback = computePayback(capital.total, benefit.total, omAnnual, econ);
  const lcoe = computeLcoe(capital, energy, om, fuelCost, econ, discountRate);
  const roi = computeRoi(capital.total, benefit.total, om.total, npv, econ);

  const notes: string[] = [];
  notes.push('Equation (5), cost of fuel, is zero: sunlight has no fuel cost. This is the largest structural difference from the biomass case the equations came from.');
  notes.push('Equation (8) is implemented as the standard discounted payback, -ln(1 - C·I/(B_A - M))/ln(1+I). The source paper prints it without the interest multiplier on C, which makes the logarithm undefined for any project whose annual benefit is smaller than its capital cost — i.e. essentially all of them.');
  if (om.replacementCount > 0) {
    notes.push(
      `Equation (3) includes ${om.replacementCount} battery replacement${om.replacementCount > 1 ? 's' : ''} at year ${om.replacementYears.join(', ')} — the paper has no analogue for this, and leaving it out would flatter the result badly.`
    );
  } else {
    notes.push('No battery replacement falls inside the system life at the chosen battery life, so equation (3) carries no replacement term.');
  }
  notes.push(
    `Equation (12) is year-indexed at ${(econ.degradationRate * 100).toFixed(2)}%/yr degradation, so output falls to ${lcoe.finalYearKwh.toFixed(0)} kWh by year ${econ.lifeYears}. The paper's constant-output annuity shortcut would overstate lifetime energy.`
  );
  if (econ.hybridDieselLitresPerYear > 0) {
    notes.push('A backup generator is retained, so equation (5) is not zero — its diesel is counted as a cost.');
  }
  if (!Number.isFinite(lcoe.value) || !Number.isFinite(costPerKwh)) {
    notes.push('Cost per kWh and LCOE cannot be computed because the system delivers no energy — check peak sun hours, panel rating and the load list.');
  }
  if (roi.divergenceWarning) {
    notes.push(
      `Simple ROI is positive (${roi.simple.toFixed(0)}%) but discounted ROI is negative (${roi.discounted.toFixed(0)}%) at a ${(discountRate * 100).toFixed(1)}% discount rate. The system returns more cash than it cost, but not enough to beat the cost of capital.`
    );
  }
  if (irr === null) {
    notes.push('No real internal rate of return exists for this cash flow — the benefit never repays the capital within the system life.');
  }

  return {
    capital, energy, om, annualRevenue, fuelCost, costPerKwh, benefit,
    payback, npv, bcr, irr, lcoe, discountRate, roi, notes,
  };
}
