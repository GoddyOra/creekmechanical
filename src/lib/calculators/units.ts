// Unit conversion for the calculator engine. Every "kind" below defines how to
// convert a value between its metric and imperial display units and the SI
// base unit that formulas.ts computes in. `kind: 'none'` fields (counts,
// ratios, RPM, dimensionless factors) are identical in both systems.

export type UnitSystem = 'metric' | 'imperial';

export interface UnitDef {
  symbol: string;
  toSI: (v: number) => number;
  fromSI: (v: number) => number;
}

export interface UnitKind {
  metric: UnitDef;
  imperial: UnitDef;
}

const identity: UnitDef['toSI'] = (v) => v;

export const UNIT_KINDS: Record<string, UnitKind> = {
  none: {
    metric: { symbol: '', toSI: identity, fromSI: identity },
    imperial: { symbol: '', toSI: identity, fromSI: identity }
  },
  rpm: {
    metric: { symbol: 'RPM', toSI: identity, fromSI: identity },
    imperial: { symbol: 'RPM', toSI: identity, fromSI: identity }
  },
  // Small lengths: fastener/wire/pipe-diameter scale.
  lengthSmall: {
    metric: { symbol: 'mm', toSI: (v) => v / 1000, fromSI: (v) => v * 1000 },
    imperial: { symbol: 'in', toSI: (v) => v * 0.0254, fromSI: (v) => v / 0.0254 }
  },
  // Large lengths: beam/pipe/column span scale.
  lengthLarge: {
    metric: { symbol: 'm', toSI: identity, fromSI: identity },
    imperial: { symbol: 'ft', toSI: (v) => v * 0.3048, fromSI: (v) => v / 0.3048 }
  },
  area: {
    metric: { symbol: 'mm²', toSI: (v) => v * 1e-6, fromSI: (v) => v / 1e-6 },
    imperial: { symbol: 'in²', toSI: (v) => v * 6.4516e-4, fromSI: (v) => v / 6.4516e-4 }
  },
  momentOfInertia: {
    metric: { symbol: 'mm⁴', toSI: (v) => v * 1e-12, fromSI: (v) => v / 1e-12 },
    imperial: { symbol: 'in⁴', toSI: (v) => v * 4.16231426e-7, fromSI: (v) => v / 4.16231426e-7 }
  },
  force: {
    metric: { symbol: 'N', toSI: identity, fromSI: identity },
    imperial: { symbol: 'lbf', toSI: (v) => v * 4.4482216153, fromSI: (v) => v / 4.4482216153 }
  },
  // Larger forces: bearing load ratings, buckling loads.
  forceLarge: {
    metric: { symbol: 'kN', toSI: (v) => v * 1000, fromSI: (v) => v / 1000 },
    imperial: { symbol: 'lbf', toSI: (v) => v * 4.4482216153, fromSI: (v) => v / 4.4482216153 }
  },
  torque: {
    metric: { symbol: 'N·m', toSI: identity, fromSI: identity },
    imperial: { symbol: 'lbf·ft', toSI: (v) => v * 1.35581795, fromSI: (v) => v / 1.35581795 }
  },
  // Modulus of elasticity / shear modulus: GPa vs Mpsi.
  modulus: {
    metric: { symbol: 'GPa', toSI: (v) => v * 1e9, fromSI: (v) => v / 1e9 },
    imperial: { symbol: 'Mpsi', toSI: (v) => v * 6.89475729e9, fromSI: (v) => v / 6.89475729e9 }
  },
  // Stress: MPa vs ksi.
  stress: {
    metric: { symbol: 'MPa', toSI: (v) => v * 1e6, fromSI: (v) => v / 1e6 },
    imperial: { symbol: 'ksi', toSI: (v) => v * 6.89475729e6, fromSI: (v) => v / 6.89475729e6 }
  },
  // Smaller pressures: pipe pressure drop.
  pressureSmall: {
    metric: { symbol: 'kPa', toSI: (v) => v * 1000, fromSI: (v) => v / 1000 },
    imperial: { symbol: 'psi', toSI: (v) => v * 6894.75729, fromSI: (v) => v / 6894.75729 }
  },
  density: {
    metric: { symbol: 'kg/m³', toSI: identity, fromSI: identity },
    imperial: { symbol: 'lb/ft³', toSI: (v) => v * 16.0184634, fromSI: (v) => v / 16.0184634 }
  },
  // Dynamic viscosity: mPa·s and cP are numerically identical.
  viscosity: {
    metric: { symbol: 'mPa·s', toSI: (v) => v / 1000, fromSI: (v) => v * 1000 },
    imperial: { symbol: 'cP', toSI: (v) => v / 1000, fromSI: (v) => v * 1000 }
  },
  flowRate: {
    metric: { symbol: 'L/min', toSI: (v) => v / 60000, fromSI: (v) => v * 60000 },
    imperial: { symbol: 'gpm', toSI: (v) => v * 6.30901964e-5, fromSI: (v) => v / 6.30901964e-5 }
  },
  velocity: {
    metric: { symbol: 'm/s', toSI: identity, fromSI: identity },
    imperial: { symbol: 'ft/s', toSI: (v) => v * 0.3048, fromSI: (v) => v / 0.3048 }
  },
  power: {
    metric: { symbol: 'kW', toSI: (v) => v * 1000, fromSI: (v) => v / 1000 },
    imperial: { symbol: 'hp', toSI: (v) => v * 745.699872, fromSI: (v) => v / 745.699872 }
  },
  // Coefficient of thermal expansion, stored in SI as 1/°C.
  thermalExpansionCoeff: {
    metric: { symbol: 'µm/m·°C', toSI: (v) => v * 1e-6, fromSI: (v) => v / 1e-6 },
    imperial: {
      symbol: 'µin/in·°F',
      toSI: (v) => v * 1e-6 * (9 / 5),
      fromSI: (v) => (v * (5 / 9)) / 1e-6
    }
  },
  // A temperature *change*, not an absolute temperature (no offset needed).
  temperatureDelta: {
    metric: { symbol: '°C', toSI: identity, fromSI: identity },
    imperial: { symbol: '°F', toSI: (v) => v * (5 / 9), fromSI: (v) => v * (9 / 5) }
  },
  springRate: {
    metric: { symbol: 'N/mm', toSI: (v) => v * 1000, fromSI: (v) => v / 1000 },
    imperial: { symbol: 'lbf/in', toSI: (v) => v * 175.126835, fromSI: (v) => v / 175.126835 }
  }
};

export function unitSymbol(kind: string, system: UnitSystem): string {
  return UNIT_KINDS[kind][system].symbol;
}

export function toSI(kind: string, system: UnitSystem, value: number): number {
  return UNIT_KINDS[kind][system].toSI(value);
}

export function fromSI(kind: string, system: UnitSystem, value: number): number {
  return UNIT_KINDS[kind][system].fromSI(value);
}

// Convert a value shown in one system to the equivalent value shown in the
// other system (used when the user flips the Metric/Imperial toggle so the
// number in the box represents the same physical quantity).
export function convertDisplay(kind: string, from: UnitSystem, to: UnitSystem, value: number): number {
  if (from === to) return value;
  const si = toSI(kind, from, value);
  return fromSI(kind, to, si);
}
