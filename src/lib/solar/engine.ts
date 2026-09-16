// Solar PV sizing engine — Stages 0-7 of docs/SOLAR_CALCULATOR_PLAN.md.
//
// Pure: no DOM, no fetch, no globals. Every constant is a named, overridable
// field on SizingSettings — nothing is inlined as a magic number.
//
// Verified against the course's own worked examples; see the verification
// table in the plan. Three outputs deliberately differ from the whiteboard
// (lead-acid battery count and both panel counts) because the board rounds
// intermediates before dividing. Do not "fix" those to match the photos.

import { type LoadClass, defaultSurge } from './catalog.ts';

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface LoadLine {
  name: string;
  loadClass: LoadClass;
  /** Running watts per unit. */
  watts: number;
  qty: number;
  /** Hours of use per day. */
  hours: number;
  /** Start-up multiple of running watts. Ignored for R and C. */
  surge: number;
}

export type SurgeConcurrency = 'single' | 'all';
export type InverterBasis = 'largest-surge' | 'class-total';
export type ArrayPreset = 'whiteboard' | 'whatsapp' | 'leonics';
export type BatteryChemistry = 'lead-acid' | 'lithium';

export interface SizingSettings {
  /** Future-buffer multiplier on the design load total. Course: 1.25. */
  safetyFactor: number;
  /** Extra buffer applied to the inverter continuous rating. Card: 1.2. */
  futureBuffer: number;
  /** Inverter conversion efficiency. Card: 85-95%. */
  inverterEfficiency: number;
  /**
   * How much start-up surge the inverter must cover, across the WHOLE load
   * list (not within one line).
   *
   * 'single' (default): only the largest single unit's surge excess anywhere
   *   in the list. Two identical motors do not add — one starts at a time.
   * 'all': every inductive unit's surge excess summed, for a block cold-start
   *   after a grid outage.
   *
   * This affects only the inverter's surge branch. The R/C/I class total
   * always counts every inductive unit at full surge, per the course.
   */
  surgeConcurrency: SurgeConcurrency;
  /**
   * Which figure sizes the inverter.
   * 'largest-surge' (default): continuous load plus the single largest motor
   *   surge — one motor starts at a time, which is what actually happens.
   * 'class-total': the course's class-based grand total, which sums EVERY
   *   inductive load's surge. That is the right figure for the load audit
   *   headline, but using it to pick an inverter assumes every motor in the
   *   building starts simultaneously and will oversize badly.
   */
  inverterBasis: InverterBasis;

  /** Fraction of daily energy drawn from the battery. 1.0 = full-day autonomy. */
  nightFraction: number;
  /** Inverter + wiring loss multiplier on stored energy. Card: 1.15. */
  lossFactor: number;
  /** Days of autonomy. 0.5-1 grid-tied with backup, 2-3 off-grid. */
  daysAutonomy: number;
  batteryChemistry: BatteryChemistry;
  /** Depth of discharge. 0.5 lead-acid, 0.8-0.9 lithium. */
  depthOfDischarge: number;
  /** Nominal volts of one battery unit. */
  batteryUnitVolts: number;
  /** Amp-hours of one battery unit. */
  batteryUnitAh: number;

  /** Array over-sizing factor of safety. Course: 1.25. */
  arrayFoS: number;
  /** Performance ratio. Whiteboard: 0.65. */
  performanceRatio: number;
  arrayPreset: ArrayPreset;
  /** Peak sun hours per day for the site. */
  peakSunHours: number;
  /** Rated watts of one panel. Default 550 W per the course example. */
  panelWatts: number;
  /** Open-circuit volts of one panel, for string and SPD limits. */
  panelVoc: number;
  /** Short-circuit amps of one panel, for PWM and breaker sizing. */
  panelIsc: number;

  /** Max PV input volts of the chosen controller. */
  controllerMaxPvVolts: number;
  /** Fraction of controller max PV volts a string may reach. Card: 20% margin. */
  stringVoltageMargin: number;

  /** Allowed voltage drop, DC side. Card: 3%. */
  dcDropLimit: number;
  /** Allowed voltage drop, AC side. Card: 5%. */
  acDropLimit: number;
  /** Mains voltage. Nigeria: 220-230 V. */
  acVolts: number;
  /** One-way cable run lengths in metres. */
  runLengths: { pvToController: number; controllerToBattery: number; batteryToInverter: number; inverterToLoads: number };

  /** High-lightning site (Port Harcourt and similar) -> Type 1+2, 60 kA. */
  highLightning: boolean;
}

export const DEFAULT_SETTINGS: SizingSettings = {
  safetyFactor: 1.25,
  futureBuffer: 1.2,
  inverterEfficiency: 0.9,
  surgeConcurrency: 'single',
  inverterBasis: 'largest-surge',

  nightFraction: 0.7,
  lossFactor: 1.15,
  daysAutonomy: 1,
  batteryChemistry: 'lithium',
  depthOfDischarge: 0.9,
  // 12 V divides evenly into every system voltage the tool can pick (12/24/48),
  // so it never produces a bank that can't be wired. Larger systems normally
  // use 48 V units — change this once the system voltage is known to be 48 V.
  batteryUnitVolts: 12,
  batteryUnitAh: 200,

  arrayFoS: 1.25,
  performanceRatio: 0.65,
  arrayPreset: 'whiteboard',
  peakSunHours: 4,
  panelWatts: 550,
  panelVoc: 49,
  panelIsc: 14,

  controllerMaxPvVolts: 250,
  stringVoltageMargin: 0.8,

  dcDropLimit: 0.03,
  acDropLimit: 0.05,
  acVolts: 220,
  runLengths: { pvToController: 10, controllerToBattery: 3, batteryToInverter: 2, inverterToLoads: 15 },

  highLightning: false,
};

// ---------------------------------------------------------------------------
// Standard sizes — every result rounds UP to one of these
// ---------------------------------------------------------------------------

export const INVERTER_SIZES_W = [1000, 1500, 2000, 3000, 3500, 5000, 7500, 10000, 15000, 20000, 30000, 50000];
export const CONTROLLER_SIZES_A = [10, 20, 30, 40, 60, 80, 100, 125, 150, 200, 250];
export const CABLE_SIZES_MM2 = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
export const BREAKER_SIZES_A = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630];
export const SPD_DC_VOLTS = [500, 600, 800, 1000, 1500];

/** Copper resistivity in ohm-mm2/m, per the course card. */
export const COPPER_RESISTIVITY = 0.0172;

/**
 * Current-carrying capacity of copper cable in free air, amps by mm2.
 * Conservative figures — the cable must satisfy BOTH this and voltage drop.
 */
const AMPACITY_TABLE: Array<{ mm2: number; amps: number }> = [
  { mm2: 1.5, amps: 15 }, { mm2: 2.5, amps: 21 }, { mm2: 4, amps: 28 },
  { mm2: 6, amps: 36 }, { mm2: 10, amps: 50 }, { mm2: 16, amps: 68 },
  { mm2: 25, amps: 89 }, { mm2: 35, amps: 110 }, { mm2: 50, amps: 134 },
  { mm2: 70, amps: 171 }, { mm2: 95, amps: 207 }, { mm2: 120, amps: 239 },
  { mm2: 150, amps: 275 }, { mm2: 185, amps: 314 }, { mm2: 240, amps: 370 },
];

function roundUpTo(value: number, sizes: number[]): number {
  for (const size of sizes) if (size >= value - 1e-9) return size;
  return sizes[sizes.length - 1];
}

function ampacityMm2(amps: number): number {
  for (const row of AMPACITY_TABLE) if (row.amps >= amps) return row.mm2;
  return AMPACITY_TABLE[AMPACITY_TABLE.length - 1].mm2;
}

// ---------------------------------------------------------------------------
// Stage 0 — load audit
// ---------------------------------------------------------------------------

export interface ClassSubtotal {
  loadClass: LoadClass;
  runningWatts: number;
  /** Running watts for R and C; running x surge for I. */
  designWatts: number;
  energyWh: number;
  lineCount: number;
}

export interface LoadAudit {
  lines: Array<LoadLine & { runningWatts: number; designWatts: number; energyWh: number; surgeWatts: number; surgeExcessPerUnit: number; surgeExcessAll: number }>;
  byClass: Record<LoadClass, ClassSubtotal>;
  /** Sum of running watts across every class, no surge. */
  totalRunningWatts: number;
  /**
   * The course's "Grand Total Power": R and C at running power, I at
   * running x qty x surge, then the safety factor.
   *
   * This deliberately does NOT depend on `surgeConcurrency`. Whiteboard photo
   * 3 sizes its 5-unit line as 1500 x 5 x 3 = 22,500 W — every unit at full
   * surge — so the class total is a connected-load figure, not a
   * one-motor-at-a-time figure. Keeping the two separate is what stops the
   * answer changing depending on whether a user typed "AC x2" as one row or
   * two.
   */
  grandTotalDesignWatts: number;
  totalEnergyWh: number;
  /**
   * Surge allowance added to the inverter's continuous load — the EXTRA draw
   * above running power, not the full surge.
   *
   * 'single': the largest single unit's excess anywhere in the list. Two
   *   identical motors do not add, because only one starts at a time.
   * 'all': every inductive unit's excess summed, for a block cold-start.
   */
  surgeAllowanceWatts: number;
  /** Which line set the allowance under 'single'. Null under 'all'. */
  largestSurgeLine: string | null;
}

export function auditLoads(lines: LoadLine[], settings: SizingSettings): LoadAudit {
  const byClass: Record<LoadClass, ClassSubtotal> = {
    resistive: { loadClass: 'resistive', runningWatts: 0, designWatts: 0, energyWh: 0, lineCount: 0 },
    capacitive: { loadClass: 'capacitive', runningWatts: 0, designWatts: 0, energyWh: 0, lineCount: 0 },
    inductive: { loadClass: 'inductive', runningWatts: 0, designWatts: 0, energyWh: 0, lineCount: 0 },
  };

  const detailed = lines.map((line) => {
    const inductive = line.loadClass === 'inductive';
    const surge = inductive ? Math.max(1, line.surge) : 1;

    const runningWatts = line.watts * line.qty;
    // Full inrush draw of the whole line, every unit starting.
    const surgeWatts = line.watts * surge * line.qty;
    // R/C/I rule: only inductive loads carry surge into the design total.
    const designWatts = inductive ? surgeWatts : runningWatts;
    const energyWh = runningWatts * line.hours;

    // Excess above running — what the inverter must supply on top of the
    // continuous load. Per one unit, and for the whole line.
    const surgeExcessPerUnit = inductive ? line.watts * (surge - 1) : 0;
    const surgeExcessAll = surgeExcessPerUnit * line.qty;

    const bucket = byClass[line.loadClass];
    bucket.runningWatts += runningWatts;
    bucket.designWatts += designWatts;
    bucket.energyWh += energyWh;
    bucket.lineCount += 1;

    return { ...line, runningWatts, designWatts, energyWh, surgeWatts, surgeExcessPerUnit, surgeExcessAll };
  });

  // The surge allowance is computed ACROSS the whole list, not within a line,
  // so splitting "2 x AC" into two rows gives the same answer as one row.
  let surgeAllowanceWatts = 0;
  let largestSurgeLine: string | null = null;
  if (settings.surgeConcurrency === 'all') {
    surgeAllowanceWatts = detailed.reduce((sum, l) => sum + l.surgeExcessAll, 0);
  } else {
    for (const l of detailed) {
      if (l.surgeExcessPerUnit > surgeAllowanceWatts) {
        surgeAllowanceWatts = l.surgeExcessPerUnit;
        largestSurgeLine = l.name;
      }
    }
  }

  const totalRunningWatts = detailed.reduce((s, l) => s + l.runningWatts, 0);
  const rawDesign = detailed.reduce((s, l) => s + l.designWatts, 0);

  return {
    lines: detailed,
    byClass,
    totalRunningWatts,
    grandTotalDesignWatts: rawDesign * settings.safetyFactor,
    totalEnergyWh: detailed.reduce((s, l) => s + l.energyWh, 0),
    surgeAllowanceWatts,
    largestSurgeLine,
  };
}

// ---------------------------------------------------------------------------
// Stage 1 — inverter
// ---------------------------------------------------------------------------

export interface InverterResult {
  continuousWatts: number;
  /** Card rule: continuous + biggest motor's extra surge draw. */
  surgeRequirementWatts: number;
  /** Course rule: the class-based grand total. */
  classDesignWatts: number;
  /** The branch that decided the rating. */
  governedBy: 'continuous' | 'surge' | 'class-total';
  requiredWatts: number;
  ratedWatts: number;
  systemVolts: 12 | 24 | 48;
  /** True when the requirement exceeds the largest standard single unit. */
  exceedsStandardSizes: boolean;
}

/**
 * `arrayWatts` participates in the system-voltage choice because the bank
 * voltage has to suit BOTH ends: a modest peak load with high daily energy
 * gives a small inverter and a large array, and picking 12 V off the inverter
 * alone would then force an unbuildable charge-controller current. Take the
 * larger of the two demands.
 */
export function sizeInverter(audit: LoadAudit, settings: SizingSettings, arrayWatts = 0): InverterResult {
  const continuousWatts = (audit.totalRunningWatts * settings.futureBuffer) / settings.inverterEfficiency;
  const surgeRequirementWatts = continuousWatts + audit.surgeAllowanceWatts;
  const classDesignWatts = audit.grandTotalDesignWatts;

  type Branch = { key: InverterResult['governedBy']; value: number };
  const branches: Branch[] = [
    { key: 'continuous', value: audit.totalRunningWatts * settings.safetyFactor },
    { key: 'surge', value: surgeRequirementWatts },
  ];
  if (settings.inverterBasis === 'class-total') {
    branches.push({ key: 'class-total', value: classDesignWatts });
  }
  const winner = branches.reduce((a, b) => (b.value > a.value ? b : a));
  const ratedWatts = roundUpTo(winner.value, INVERTER_SIZES_W);

  const voltageDriver = Math.max(ratedWatts, arrayWatts);
  const systemVolts: 12 | 24 | 48 = voltageDriver <= 1500 ? 12 : voltageDriver <= 3000 ? 24 : 48;

  return {
    continuousWatts,
    surgeRequirementWatts,
    classDesignWatts,
    governedBy: winner.key,
    requiredWatts: winner.value,
    ratedWatts,
    systemVolts,
    exceedsStandardSizes: winner.value > INVERTER_SIZES_W[INVERTER_SIZES_W.length - 1] + 1e-9,
  };
}

// ---------------------------------------------------------------------------
// Stage 2 — battery bank
// ---------------------------------------------------------------------------

export interface BatteryResult {
  energyFromBatteryWh: number;
  bankNameplateWh: number;
  unitWh: number;
  unitCount: number;
  installedWh: number;
  /** Units in series to reach the system voltage, and parallel strings. */
  seriesCount: number;
  parallelStrings: number;
}

export function sizeBattery(audit: LoadAudit, settings: SizingSettings, systemVolts: number): BatteryResult {
  const energyFromBatteryWh =
    audit.totalEnergyWh * settings.nightFraction * settings.daysAutonomy * settings.lossFactor;
  const bankNameplateWh = energyFromBatteryWh / settings.depthOfDischarge;
  const unitWh = settings.batteryUnitVolts * settings.batteryUnitAh;
  const unitCount = Math.max(1, Math.ceil(bankNameplateWh / unitWh));

  const seriesCount = Math.max(1, Math.round(systemVolts / settings.batteryUnitVolts));
  const parallelStrings = Math.max(1, Math.ceil(unitCount / seriesCount));

  return {
    energyFromBatteryWh,
    bankNameplateWh,
    unitWh,
    unitCount: seriesCount * parallelStrings,
    installedWh: seriesCount * parallelStrings * unitWh,
    seriesCount,
    parallelStrings,
  };
}

// ---------------------------------------------------------------------------
// Stage 3 — PV array
// ---------------------------------------------------------------------------

export interface ArrayResult {
  effectiveFoS: number;
  effectivePR: number;
  exactPanelCount: number;
  panelCount: number;
  arrayWatts: number;
  seriesPerString: number;
  parallelStrings: number;
  stringVoc: number;
  stringVocLimit: number;
  stringVocOk: boolean;
}

export function sizeArray(audit: LoadAudit, settings: SizingSettings): ArrayResult {
  // All three source methods are the same formula with different constants;
  // see discrepancy 1 in the plan.
  const effectiveFoS = settings.arrayPreset === 'leonics' ? 1.3 : settings.arrayFoS;
  const effectivePR = settings.arrayPreset === 'whatsapp' ? 1 : settings.performanceRatio;

  const denominator = effectivePR * settings.peakSunHours * settings.panelWatts;
  const exactPanelCount = denominator > 0 ? (audit.totalEnergyWh * effectiveFoS) / denominator : 0;
  const panelCount = Math.max(1, Math.ceil(exactPanelCount));

  const stringVocLimit = settings.controllerMaxPvVolts * settings.stringVoltageMargin;
  const maxSeries = Math.max(1, Math.floor(stringVocLimit / settings.panelVoc));
  const seriesPerString = Math.min(panelCount, maxSeries);
  const parallelStrings = Math.ceil(panelCount / seriesPerString);
  const stringVoc = seriesPerString * settings.panelVoc;

  return {
    effectiveFoS,
    effectivePR,
    exactPanelCount,
    panelCount,
    arrayWatts: panelCount * settings.panelWatts,
    seriesPerString,
    parallelStrings,
    stringVoc,
    stringVocLimit,
    stringVocOk: stringVoc <= stringVocLimit + 1e-9,
  };
}

// ---------------------------------------------------------------------------
// Stage 4 — charge controller
// ---------------------------------------------------------------------------

export interface ControllerResult {
  type: 'MPPT' | 'PWM';
  reason: string;
  exactAmps: number;
  /** Rating of ONE controller. */
  ratedAmps: number;
  /**
   * Controllers needed in parallel. A single unit tops out at the largest
   * standard size, so a big array splits across several rather than being
   * silently capped at a rating that cannot carry it.
   */
  unitCount: number;
  arrayIsc: number;
}

export function sizeController(array: ArrayResult, settings: SizingSettings, systemVolts: number): ControllerResult {
  const useMppt = array.arrayWatts > 1000 || systemVolts === 48;
  const arrayIsc = array.parallelStrings * settings.panelIsc;

  const exactAmps = useMppt
    ? (array.arrayWatts / systemVolts) * 1.25
    : arrayIsc * 1.25;

  const maxUnit = CONTROLLER_SIZES_A[CONTROLLER_SIZES_A.length - 1];
  const unitCount = Math.max(1, Math.ceil(exactAmps / maxUnit));
  const ratedAmps = roundUpTo(exactAmps / unitCount, CONTROLLER_SIZES_A);

  const base = useMppt
    ? `Array is ${array.arrayWatts >= 1000 ? 'over 1 kW' : 'on a 48 V bank'} — MPPT is 95-98% efficient against 70-75% for PWM.`
    : 'Small array on a low-voltage bank — PWM is adequate and cheaper.';

  return {
    type: useMppt ? 'MPPT' : 'PWM',
    reason:
      unitCount > 1
        ? `${base} ${exactAmps.toFixed(0)} A exceeds the largest single ${maxUnit} A unit, so the array splits across ${unitCount} controllers.`
        : base,
    exactAmps,
    ratedAmps,
    unitCount,
    arrayIsc,
  };
}

// ---------------------------------------------------------------------------
// Stages 5 & 6 — cables and breakers
//
// These are computed together on purpose. Sizing them separately let the two
// disagree about how much current a circuit actually carries, which produced
// PV cables sized from P/Voc while their breakers were sized from Isc — the
// cable came out below the array's own short-circuit current. One design
// current per segment feeds both, and the cable is then grown until it can
// carry its breaker rather than the breaker being shrunk to fit the cable.
// ---------------------------------------------------------------------------

export interface CableSegment {
  name: string;
  amps: number;
  volts: number;
  lengthM: number;
  dropLimit: number;
  voltDropMm2: number;
  ampacityMm2: number;
  requiredMm2: number;
  governedBy: 'voltage drop' | 'ampacity' | 'breaker rating';
}

export interface BreakerSpec {
  name: string;
  exactAmps: number;
  ratedAmps: number;
  kind: 'DC' | 'AC';
  note: string;
  /** True when the requirement exceeds the largest standard single device. */
  exceedsStandardSizes: boolean;
}

/** Amps a given copper cross-section can carry. */
function ampacityAmps(mm2: number): number {
  const row = AMPACITY_TABLE.find((r) => r.mm2 === mm2);
  return row ? row.amps : 0;
}

interface CircuitInput {
  name: string;
  kind: 'DC' | 'AC';
  /** Continuous design current the cable must carry. */
  designAmps: number;
  /** Breaker requirement — usually the same, but 1.56x for a PV array. */
  breakerAmps: number;
  volts: number;
  lengthM: number;
  dropLimit: number;
  note: string;
}

export function sizeCircuits(
  array: ArrayResult,
  controller: ControllerResult,
  inverter: InverterResult,
  settings: SizingSettings
): { cables: CableSegment[]; breakers: BreakerSpec[]; warnings: string[] } {
  const v = inverter.systemVolts;
  const L = settings.runLengths;
  const arrayIsc = controller.arrayIsc;

  const circuits: CircuitInput[] = [
    {
      name: 'PV array → controller',
      kind: 'DC',
      // PV current is set by short-circuit current, NOT by P/V. Voc overstates
      // the operating voltage and so understates the current.
      designAmps: arrayIsc * 1.25,
      breakerAmps: arrayIsc * 1.56, // 1.25 irradiance x 1.25 safety
      volts: Math.max(array.stringVoc, v),
      lengthM: L.pvToController,
      dropLimit: settings.dcDropLimit,
      note: 'Breaker voltage rating must exceed the maximum string Voc — use a 500 V or 1000 V DC device, 2-pole or one per polarity.',
    },
    {
      name: 'Controller → battery (each)',
      kind: 'DC',
      designAmps: controller.ratedAmps * 1.25,
      breakerAmps: controller.ratedAmps * 1.25,
      volts: v,
      lengthM: L.controllerToBattery,
      dropLimit: settings.dcDropLimit,
      note: `Protects the controller and its cable. One per controller${controller.unitCount > 1 ? ` — ${controller.unitCount} needed` : ''}.`,
    },
    {
      name: 'Battery → inverter',
      kind: 'DC',
      designAmps: (inverter.ratedWatts / (v * settings.inverterEfficiency)) * 1.25,
      breakerAmps: (inverter.ratedWatts / (v * settings.inverterEfficiency)) * 1.25,
      volts: v,
      lengthM: L.batteryToInverter,
      dropLimit: settings.dcDropLimit,
      note: 'The largest breaker in the system. Use a DC-rated MCCB or Class T fuse — an AC breaker will arc and weld on DC.',
    },
    {
      name: 'Inverter → AC loads',
      kind: 'AC',
      designAmps: (inverter.ratedWatts / settings.acVolts) * 1.25,
      breakerAmps: (inverter.ratedWatts / settings.acVolts) * 1.25,
      volts: settings.acVolts,
      lengthM: L.inverterToLoads,
      dropLimit: settings.acDropLimit,
      note: 'Standard AC MCB, plus a 30 mA RCD/RCBO for shock protection.',
    },
  ];

  const cables: CableSegment[] = [];
  const breakers: BreakerSpec[] = [];
  const warnings: string[] = [];
  const maxBreaker = BREAKER_SIZES_A[BREAKER_SIZES_A.length - 1];

  for (const c of circuits) {
    const voltDropMm2 = (2 * c.lengthM * c.designAmps * COPPER_RESISTIVITY) / (c.volts * c.dropLimit);
    const ampacityMm2Value = ampacityMm2(c.designAmps);

    const breakerRated = roundUpTo(c.breakerAmps, BREAKER_SIZES_A);
    const exceedsStandardSizes = c.breakerAmps > maxBreaker + 1e-9;

    // The cable must satisfy voltage drop, its own ampacity, AND be able to
    // carry the breaker that protects it.
    let requiredMm2 = roundUpTo(Math.max(voltDropMm2, ampacityMm2Value), CABLE_SIZES_MM2);
    let governedBy: CableSegment['governedBy'] =
      voltDropMm2 > ampacityMm2Value ? 'voltage drop' : 'ampacity';
    while (ampacityAmps(requiredMm2) < breakerRated && requiredMm2 < CABLE_SIZES_MM2[CABLE_SIZES_MM2.length - 1]) {
      requiredMm2 = CABLE_SIZES_MM2[CABLE_SIZES_MM2.indexOf(requiredMm2) + 1];
      governedBy = 'breaker rating';
    }

    cables.push({
      name: c.name,
      amps: c.designAmps,
      volts: c.volts,
      lengthM: c.lengthM,
      dropLimit: c.dropLimit,
      voltDropMm2,
      ampacityMm2: ampacityMm2Value,
      requiredMm2,
      governedBy,
    });

    breakers.push({
      name: c.name,
      exactAmps: c.breakerAmps,
      ratedAmps: breakerRated,
      kind: c.kind,
      note: c.note,
      exceedsStandardSizes,
    });

    if (exceedsStandardSizes) {
      warnings.push(
        `${c.name} needs ${c.breakerAmps.toFixed(0)} A of protection, which is beyond the largest standard ${maxBreaker} A device. Split the circuit across parallel runs or raise the system voltage — do not fit a smaller breaker and hope.`
      );
    }
    const finalAmpacity = ampacityAmps(requiredMm2);
    if (finalAmpacity < c.designAmps || finalAmpacity < breakerRated) {
      const need = Math.max(c.designAmps, breakerRated);
      warnings.push(
        `${c.name} carries ${need.toFixed(0)} A, more than a single ${CABLE_SIZES_MM2[CABLE_SIZES_MM2.length - 1]} mm² conductor can take (${finalAmpacity} A). Use parallel conductors or raise the system voltage — do not fit this cable as a single run.`
      );
    }
  }

  return { cables, breakers, warnings };
}

// ---------------------------------------------------------------------------
// Stage 7 — surge protection
// ---------------------------------------------------------------------------

export interface SpdResult {
  dcVolts: number;
  acVolts: number;
  type: 'Type 2' | 'Type 1+2';
  kA: number;
  note: string;
}

export function sizeSpd(array: ArrayResult, settings: SizingSettings): SpdResult {
  const dcVolts = roundUpTo(array.stringVoc * 1.2, SPD_DC_VOLTS);
  return {
    dcVolts,
    acVolts: 275,
    type: settings.highLightning ? 'Type 1+2' : 'Type 2',
    kA: settings.highLightning ? 60 : 40,
    note: settings.highLightning
      ? 'High-lightning site — Type 1+2 at 60 kA or more, one on the DC side in the PV combiner and one on the AC side.'
      : '40 kA minimum for Nigeria. Keep SPD leads under 50 cm and bond to an earth rod below 10 ohms.',
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Input sanitisation
//
// Settings can arrive from a restored localStorage blob or a hand-typed field,
// so a zero or negative can reach the maths and turn the whole result into
// Infinity or NaN. Clamp to physically meaningful bounds and say what was
// changed rather than rendering "NaN" at the user.
// ---------------------------------------------------------------------------

function clamp(value: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, lo), hi);
}

export function sanitizeSettings(input: SizingSettings): { settings: SizingSettings; warnings: string[] } {
  const warnings: string[] = [];
  const s: SizingSettings = { ...input };
  const fix = (key: keyof SizingSettings, lo: number, hi: number, label: string) => {
    const before = Number(s[key]);
    const after = clamp(before, lo, hi, lo);
    if (after !== before) {
      warnings.push(`${label} was ${Number.isFinite(before) ? before : 'not a number'}, which is outside the workable range — using ${after}.`);
      (s as unknown as Record<string, number>)[key as string] = after;
    }
  };

  fix('safetyFactor', 1, 5, 'Load safety factor');
  fix('futureBuffer', 1, 5, 'Inverter future buffer');
  fix('inverterEfficiency', 0.5, 1, 'Inverter efficiency');
  fix('nightFraction', 0, 1, 'Fraction drawn from battery');
  fix('lossFactor', 1, 3, 'Storage loss factor');
  fix('daysAutonomy', 0.25, 30, 'Days of autonomy');
  fix('depthOfDischarge', 0.05, 1, 'Depth of discharge');
  fix('batteryUnitVolts', 2, 1000, 'Battery unit voltage');
  fix('batteryUnitAh', 1, 100000, 'Battery unit capacity');
  fix('arrayFoS', 1, 5, 'Array factor of safety');
  fix('performanceRatio', 0.05, 1.5, 'Performance ratio');
  fix('peakSunHours', 0.1, 24, 'Peak sun hours');
  fix('panelWatts', 1, 2000, 'Panel rating');
  fix('panelVoc', 1, 500, 'Panel Voc');
  fix('panelIsc', 0.1, 100, 'Panel Isc');
  fix('controllerMaxPvVolts', 12, 2000, 'Controller max PV volts');
  fix('stringVoltageMargin', 0.1, 1, 'String voltage margin');
  fix('dcDropLimit', 0.001, 0.2, 'DC volt-drop limit');
  fix('acDropLimit', 0.001, 0.2, 'AC volt-drop limit');
  fix('acVolts', 50, 1000, 'Mains voltage');

  return { settings: s, warnings };
}

export interface SizingResult {
  audit: LoadAudit;
  inverter: InverterResult;
  battery: BatteryResult;
  array: ArrayResult;
  controller: ControllerResult;
  cables: CableSegment[];
  breakers: BreakerSpec[];
  spd: SpdResult;
  warnings: string[];
}

export function computeSizing(lines: LoadLine[], rawSettings: SizingSettings): SizingResult {
  const { settings, warnings: settingWarnings } = sanitizeSettings(rawSettings);
  // Load lines come from user input too.
  const lines2 = lines.map((l) => ({
    ...l,
    watts: Number.isFinite(l.watts) ? Math.max(0, l.watts) : 0,
    qty: Number.isFinite(l.qty) ? Math.max(1, Math.round(l.qty)) : 1,
    hours: Number.isFinite(l.hours) ? Math.min(Math.max(0, l.hours), 24) : 0,
    surge: Number.isFinite(l.surge) ? Math.min(Math.max(1, l.surge), 20) : 1,
  }));
  const audit = auditLoads(lines2, settings);
  // Array first: it depends only on energy, and its size feeds the system
  // voltage decision inside sizeInverter.
  const array = sizeArray(audit, settings);
  const inverter = sizeInverter(audit, settings, array.arrayWatts);
  const battery = sizeBattery(audit, settings, inverter.systemVolts);
  const controller = sizeController(array, settings, inverter.systemVolts);
  const circuits = sizeCircuits(array, controller, inverter, settings);
  const cables = circuits.cables;
  const breakers = circuits.breakers;
  const spd = sizeSpd(array, settings);

  const warnings: string[] = [...settingWarnings, ...circuits.warnings];
  if (!array.stringVocOk) {
    warnings.push(
      `String open-circuit voltage (${array.stringVoc.toFixed(0)} V) exceeds the ${array.stringVocLimit.toFixed(0)} V safe limit for a ${settings.controllerMaxPvVolts} V controller. Split the array into more parallel strings or choose a higher-voltage controller — exceeding max PV voltage destroys the controller instantly.`
    );
  }
  if (settings.batteryChemistry === 'lead-acid' && settings.depthOfDischarge > 0.5) {
    warnings.push('Depth of discharge above 50% will shorten lead-acid battery life sharply.');
  }
  if (settings.batteryUnitVolts > inverter.systemVolts) {
    warnings.push(
      `Battery unit voltage (${settings.batteryUnitVolts} V) exceeds the ${inverter.systemVolts} V system voltage this load needs. Pick a lower-voltage battery unit or check the load list.`
    );
  }
  if (inverter.exceedsStandardSizes) {
    warnings.push(
      `The load needs ${(inverter.requiredWatts / 1000).toFixed(1)} kW of inverter, beyond the largest single ${(INVERTER_SIZES_W[INVERTER_SIZES_W.length - 1] / 1000).toFixed(0)} kW unit listed. Use parallel or three-phase inverters — the figure shown is the largest single unit, not enough on its own.`
    );
  }
  const batteryToInverterAmps = inverter.ratedWatts / (inverter.systemVolts * settings.inverterEfficiency);
  if (batteryToInverterAmps > 250) {
    warnings.push(
      `Battery-to-inverter current is ${batteryToInverterAmps.toFixed(0)} A at ${inverter.systemVolts} V, which needs very heavy cable and a large DC breaker. A higher-voltage battery bank would cut this current proportionally — worth pricing before committing to this layout.`
    );
  }
  if (audit.totalEnergyWh === 0) {
    warnings.push('No energy demand — add at least one load with running hours above zero.');
  }
  return { audit, inverter, battery, array, controller, cables, breakers, spd, warnings };
}

export { defaultSurge };
