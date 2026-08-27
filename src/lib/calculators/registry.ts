// Metadata for every calculator: form fields, result fields, and copy. Pure
// data only (must stay JSON-serializable — it's passed to the client script
// via Astro's define:vars). The actual math lives in formulas.ts, looked up
// by `slug`.

export interface SelectOption {
  value: number;
  label: string;
}

export interface CalculatorField {
  id: string;
  label: string;
  kind: string; // key into UNIT_KINDS, or 'none'
  type: 'number' | 'select';
  default: number;
  min?: number;
  step?: number;
  options?: SelectOption[]; // required when type === 'select'
}

export interface CalculatorResult {
  id: string;
  label: string;
  kind: string;
}

export interface CalculatorDef {
  slug: string;
  title: string;
  shortDescription: string;
  intro: string;
  formulaText: string;
  fields: CalculatorField[];
  results: CalculatorResult[];
}

export const calculators: CalculatorDef[] = [
  {
    slug: 'gear-ratio',
    title: 'Gear Ratio & Torque Calculator',
    shortDescription: 'Gear ratio, output speed, and output torque from tooth counts.',
    intro:
      'Enter the tooth counts of a driver and driven gear along with the input torque and speed to get the gear ratio, output speed, and output torque for an ideal (lossless) gear mesh.',
    formulaText: 'GR = N_driven / N_driver · N_out = N_in / GR · T_out = T_in × GR',
    fields: [
      { id: 'driverTeeth', label: 'Driver gear teeth', kind: 'none', type: 'number', default: 20, min: 1, step: 1 },
      { id: 'drivenTeeth', label: 'Driven gear teeth', kind: 'none', type: 'number', default: 60, min: 1, step: 1 },
      { id: 'inputTorque', label: 'Input torque', kind: 'torque', type: 'number', default: 50, min: 0, step: 0.1 },
      { id: 'inputSpeed', label: 'Input speed', kind: 'rpm', type: 'number', default: 1000, min: 0, step: 1 }
    ],
    results: [
      { id: 'gearRatio', label: 'Gear ratio', kind: 'none' },
      { id: 'outputSpeed', label: 'Output speed', kind: 'rpm' },
      { id: 'outputTorque', label: 'Output torque', kind: 'torque' }
    ]
  },
  {
    slug: 'shaft-torque',
    title: 'Shaft Torque, Power & RPM Calculator',
    shortDescription: 'Shaft torque from transmitted power and rotational speed.',
    intro:
      'Enter the power being transmitted through a shaft and its rotational speed to find the resulting torque.',
    formulaText: 'ω = 2π N / 60 · T = P / ω',
    fields: [
      { id: 'power', label: 'Power', kind: 'power', type: 'number', default: 10, min: 0, step: 0.1 },
      { id: 'speed', label: 'Shaft speed', kind: 'rpm', type: 'number', default: 1750, min: 0, step: 1 }
    ],
    results: [{ id: 'torque', label: 'Shaft torque', kind: 'torque' }]
  },
  {
    slug: 'beam-deflection',
    title: 'Beam Deflection & Bending Stress Calculator',
    shortDescription: 'Center-load deflection and bending stress for a simply supported beam.',
    intro:
      'For a simply supported beam with a single point load at midspan, calculate the maximum deflection and maximum bending stress. Enter the section’s moment of inertia and distance to the extreme fiber directly.',
    formulaText: 'δ = F L³ / (48 E I) · M = F L / 4 · σ = M c / I',
    fields: [
      { id: 'force', label: 'Applied force', kind: 'force', type: 'number', default: 2000, min: 0, step: 1 },
      { id: 'length', label: 'Span length', kind: 'lengthLarge', type: 'number', default: 1.5, min: 0, step: 0.01 },
      { id: 'modulusE', label: 'Modulus of elasticity (E)', kind: 'modulus', type: 'number', default: 200, min: 0, step: 1 },
      { id: 'momentOfInertia', label: 'Moment of inertia (I)', kind: 'momentOfInertia', type: 'number', default: 8360000, min: 0, step: 1 },
      { id: 'distanceC', label: 'Distance to extreme fiber (c)', kind: 'lengthSmall', type: 'number', default: 50, min: 0, step: 0.1 }
    ],
    results: [
      { id: 'deflection', label: 'Max deflection', kind: 'lengthSmall' },
      { id: 'stress', label: 'Max bending stress', kind: 'stress' }
    ]
  },
  {
    slug: 'bolt-torque',
    title: 'Bolt Torque & Preload Calculator',
    shortDescription: 'Required tightening torque for a target bolt preload.',
    intro:
      'Enter the bolt’s nominal diameter, the preload (clamp force) you want, and a friction/nut factor K to get the tightening torque. K ≈ 0.20 is a common default for non-lubricated steel fasteners.',
    formulaText: 'T = K F d',
    fields: [
      { id: 'diameter', label: 'Nominal diameter', kind: 'lengthSmall', type: 'number', default: 10, min: 0, step: 0.1 },
      { id: 'preload', label: 'Target preload', kind: 'force', type: 'number', default: 15000, min: 0, step: 10 },
      { id: 'frictionCoefficient', label: 'Friction / nut factor (K)', kind: 'none', type: 'number', default: 0.2, min: 0, step: 0.01 }
    ],
    results: [{ id: 'torque', label: 'Tightening torque', kind: 'torque' }]
  },
  {
    slug: 'bearing-life',
    title: 'Bearing Life (L10) Calculator',
    shortDescription: 'Rated (L10) bearing life in revolutions and hours.',
    intro:
      'Enter a bearing’s basic dynamic load rating (C) and the equivalent dynamic load it sees (P) to get the L10 life — the number of revolutions 90% of a batch of identical bearings are expected to exceed before fatigue failure.',
    formulaText: 'L10 = (C / P)^k · L10h = L10 × 10⁶ / (60 N)',
    fields: [
      { id: 'dynamicLoadRating', label: 'Dynamic load rating (C)', kind: 'forceLarge', type: 'number', default: 25, min: 0, step: 0.1 },
      { id: 'equivalentLoad', label: 'Equivalent dynamic load (P)', kind: 'forceLarge', type: 'number', default: 5, min: 0, step: 0.1 },
      {
        id: 'bearingType',
        label: 'Bearing type',
        kind: 'none',
        type: 'select',
        default: 0,
        options: [
          { value: 0, label: 'Ball bearing (k = 3)' },
          { value: 1, label: 'Roller bearing (k = 10/3)' }
        ]
      },
      { id: 'speed', label: 'Rotational speed', kind: 'rpm', type: 'number', default: 1750, min: 0, step: 1 }
    ],
    results: [
      { id: 'l10', label: 'L10 life', kind: 'none' },
      { id: 'l10h', label: 'L10 life (hours)', kind: 'none' }
    ]
  },
  {
    slug: 'pipe-flow',
    title: 'Pipe Flow & Pressure Drop Calculator',
    shortDescription: 'Velocity, Reynolds number, and Darcy-Weisbach pressure drop in a pipe.',
    intro:
      'Enter the flow rate, pipe geometry, and fluid properties to get flow velocity, Reynolds number, friction factor, and pressure drop over the pipe length. Friction factor uses the Swamee-Jain approximation for turbulent flow, or f = 64/Re for laminar flow.',
    formulaText: 'v = Q / A · Re = ρvD/µ · ΔP = f (L/D)(ρv²/2)',
    fields: [
      { id: 'flowRate', label: 'Flow rate', kind: 'flowRate', type: 'number', default: 200, min: 0, step: 1 },
      { id: 'diameter', label: 'Pipe inner diameter', kind: 'lengthSmall', type: 'number', default: 50, min: 0.1, step: 0.1 },
      { id: 'length', label: 'Pipe length', kind: 'lengthLarge', type: 'number', default: 20, min: 0, step: 0.1 },
      { id: 'density', label: 'Fluid density', kind: 'density', type: 'number', default: 998, min: 0, step: 1 },
      { id: 'viscosity', label: 'Dynamic viscosity', kind: 'viscosity', type: 'number', default: 1.0, min: 0.001, step: 0.001 },
      { id: 'roughness', label: 'Pipe roughness (ε)', kind: 'lengthSmall', type: 'number', default: 0.045, min: 0, step: 0.001 }
    ],
    results: [
      { id: 'velocity', label: 'Flow velocity', kind: 'velocity' },
      { id: 'reynolds', label: 'Reynolds number', kind: 'none' },
      { id: 'frictionFactor', label: 'Friction factor', kind: 'none' },
      { id: 'pressureDrop', label: 'Pressure drop', kind: 'pressureSmall' }
    ]
  },
  {
    slug: 'column-buckling',
    title: 'Column Buckling (Euler) Calculator',
    shortDescription: 'Euler critical buckling load and stress for a slender column.',
    intro:
      'Enter a column’s section properties, length, and end-support condition to get the Euler critical buckling load, critical stress, and slenderness ratio. This applies to long, slender columns where elastic buckling governs.',
    formulaText: 'Pcr = π² E I / (KL)² · σcr = Pcr / A · λ = KL / r',
    fields: [
      { id: 'modulusE', label: 'Modulus of elasticity (E)', kind: 'modulus', type: 'number', default: 200, min: 0, step: 1 },
      { id: 'momentOfInertia', label: 'Moment of inertia (I)', kind: 'momentOfInertia', type: 'number', default: 1000000, min: 0, step: 1 },
      { id: 'length', label: 'Column length (L)', kind: 'lengthLarge', type: 'number', default: 3, min: 0, step: 0.01 },
      { id: 'area', label: 'Cross-sectional area (A)', kind: 'area', type: 'number', default: 1200, min: 0, step: 1 },
      {
        id: 'endCondition',
        label: 'End condition',
        kind: 'none',
        type: 'select',
        default: 1,
        options: [
          { value: 0.5, label: 'Fixed-fixed (K = 0.5)' },
          { value: 0.7, label: 'Fixed-pinned (K = 0.7)' },
          { value: 1, label: 'Pinned-pinned (K = 1.0)' },
          { value: 2, label: 'Fixed-free (K = 2.0)' }
        ]
      }
    ],
    results: [
      { id: 'criticalLoad', label: 'Critical buckling load (Pcr)', kind: 'forceLarge' },
      { id: 'criticalStress', label: 'Critical stress (σcr)', kind: 'stress' },
      { id: 'slendernessRatio', label: 'Slenderness ratio (λ)', kind: 'none' }
    ]
  },
  {
    slug: 'thermal-expansion',
    title: 'Thermal Expansion Calculator',
    shortDescription: 'Linear thermal expansion of a part over a temperature change.',
    intro:
      'Enter a part’s original length, its material’s coefficient of thermal expansion, and the temperature change to get the change in length and the new length.',
    formulaText: 'ΔL = α L₀ ΔT',
    fields: [
      { id: 'originalLength', label: 'Original length (L₀)', kind: 'lengthLarge', type: 'number', default: 2, min: 0, step: 0.01 },
      { id: 'alpha', label: 'Coefficient of thermal expansion (α)', kind: 'thermalExpansionCoeff', type: 'number', default: 12, min: 0, step: 0.1 },
      { id: 'deltaT', label: 'Temperature change (ΔT)', kind: 'temperatureDelta', type: 'number', default: 50, step: 1 }
    ],
    results: [
      { id: 'deltaL', label: 'Change in length (ΔL)', kind: 'lengthSmall' },
      { id: 'newLength', label: 'New length', kind: 'lengthLarge' }
    ]
  },
  {
    slug: 'factor-of-safety',
    title: 'Factor of Safety Calculator',
    shortDescription: 'Factor of safety and margin of safety from failure and applied stress.',
    intro:
      'Enter a material or part’s failure stress (e.g. yield or ultimate strength) and the actual applied stress to get the factor of safety and margin of safety.',
    formulaText: 'FoS = σ_failure / σ_applied · MoS = FoS − 1',
    fields: [
      { id: 'failureStress', label: 'Failure stress', kind: 'stress', type: 'number', default: 250, min: 0, step: 1 },
      { id: 'appliedStress', label: 'Applied stress', kind: 'stress', type: 'number', default: 100, min: 0, step: 1 }
    ],
    results: [
      { id: 'factorOfSafety', label: 'Factor of safety', kind: 'none' },
      { id: 'marginOfSafety', label: 'Margin of safety', kind: 'none' }
    ]
  },
  {
    slug: 'spring-rate',
    title: 'Spring Rate Calculator',
    shortDescription: 'Spring rate and deflection for a helical compression spring.',
    intro:
      'Enter a helical compression spring’s wire diameter, mean coil diameter, active coil count, and shear modulus to get its spring rate, plus the deflection under an applied force.',
    formulaText: 'k = G d⁴ / (8 D³ n) · δ = F / k',
    fields: [
      { id: 'shearModulusG', label: 'Shear modulus (G)', kind: 'modulus', type: 'number', default: 79.3, min: 0, step: 0.1 },
      { id: 'wireDiameter', label: 'Wire diameter (d)', kind: 'lengthSmall', type: 'number', default: 3, min: 0, step: 0.01 },
      { id: 'coilDiameter', label: 'Mean coil diameter (D)', kind: 'lengthSmall', type: 'number', default: 25, min: 0, step: 0.1 },
      { id: 'numCoils', label: 'Active coils (n)', kind: 'none', type: 'number', default: 10, min: 1, step: 1 },
      { id: 'appliedForce', label: 'Applied force (for deflection)', kind: 'force', type: 'number', default: 100, min: 0, step: 1 }
    ],
    results: [
      { id: 'springRate', label: 'Spring rate (k)', kind: 'springRate' },
      { id: 'deflection', label: 'Deflection under load', kind: 'lengthSmall' }
    ]
  }
];

export function getCalculator(slug: string): CalculatorDef | undefined {
  return calculators.find((c) => c.slug === slug);
}
