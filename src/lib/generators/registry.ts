// Field metadata per generator — same shape as CalculatorField (Stage 3),
// pure data, JSON-serializable via data-* attributes. Values are plain
// mm/degree/count numbers; no metric/imperial toggle, since parametric-CAD
// tools are conventionally dimensioned in mm (matches 3D-printing/CAD
// convention, and every downstream STL consumer expects it).

export interface SelectOption {
  value: number;
  label: string;
}

export interface GeneratorField {
  id: string;
  label: string;
  unit: string; // display suffix only (mm, °, or '' for counts) — not a conversion system
  type: 'number' | 'select';
  default: number;
  min?: number;
  step?: number;
  options?: SelectOption[];
}

export interface GeneratorDef {
  slug: string;
  title: string;
  shortDescription: string;
  intro: string;
  notice?: string; // shown prominently — used for the sprocket/fastener scope disclaimers
  fields: GeneratorField[];
}

export const generators: GeneratorDef[] = [
  {
    slug: 'spur-gear-generator',
    title: 'Spur & Helical Gear Generator',
    shortDescription: 'Generate an involute spur or helical gear from module, tooth count, and pressure angle — live 3D preview, STL export.',
    intro:
      'Enter standard involute gear parameters to generate a 3D model. Set helix angle to 0° for a spur gear, or any other value for a helical gear.',
    fields: [
      { id: 'module', label: 'Module', unit: 'mm', type: 'number', default: 2, min: 0.2, step: 0.1 },
      { id: 'teeth', label: 'Number of teeth', unit: '', type: 'number', default: 20, min: 4, step: 1 },
      { id: 'pressureAngleDeg', label: 'Pressure angle', unit: '°', type: 'number', default: 20, min: 10, step: 0.5 },
      { id: 'helixAngleDeg', label: 'Helix angle (0 = spur)', unit: '°', type: 'number', default: 0, min: 0, step: 1 },
      { id: 'faceWidth', label: 'Face width', unit: 'mm', type: 'number', default: 10, min: 1, step: 0.5 },
      { id: 'boreDiameter', label: 'Bore diameter (0 = none)', unit: 'mm', type: 'number', default: 6, min: 0, step: 0.5 }
    ]
  },
  {
    slug: 'sprocket-generator',
    title: 'Roller Chain Sprocket Generator',
    shortDescription: 'Generate a roller-chain sprocket from chain pitch, roller diameter, and tooth count — live 3D preview, STL export.',
    intro:
      'Enter roller-chain parameters to generate a sprocket model. Pitch diameter is exact; the tooth profile is a functional approximation.',
    notice:
      'This is a functional approximation of a roller-chain sprocket, not an ANSI B29.1 / ISO 606 certified tooth profile. Pitch diameter is exact; the seat/tip curve shape is a smooth approximation, not a precise seating-curve construction. Verify against your chain manufacturer’s spec before machining a load-bearing part.',
    fields: [
      { id: 'pitch', label: 'Chain pitch', unit: 'mm', type: 'number', default: 12.7, min: 1, step: 0.1 },
      { id: 'rollerDiameter', label: 'Roller diameter', unit: 'mm', type: 'number', default: 7.75, min: 0.5, step: 0.05 },
      { id: 'teeth', label: 'Number of teeth', unit: '', type: 'number', default: 16, min: 6, step: 1 },
      { id: 'thickness', label: 'Thickness', unit: 'mm', type: 'number', default: 5, min: 1, step: 0.5 },
      { id: 'boreDiameter', label: 'Bore diameter (0 = none)', unit: 'mm', type: 'number', default: 8, min: 0, step: 0.5 }
    ]
  },
  {
    slug: 'flange-generator',
    title: 'Flange Generator',
    shortDescription: 'Generate a circular flange with a bore and a bolt-hole pattern — live 3D preview, STL export.',
    intro: 'Enter flange dimensions and a bolt-circle pattern to generate a 3D model.',
    fields: [
      { id: 'outerDiameter', label: 'Outer diameter', unit: 'mm', type: 'number', default: 60, min: 5, step: 1 },
      { id: 'thickness', label: 'Thickness', unit: 'mm', type: 'number', default: 8, min: 1, step: 0.5 },
      { id: 'boreDiameter', label: 'Bore diameter (0 = none)', unit: 'mm', type: 'number', default: 20, min: 0, step: 0.5 },
      { id: 'boltCircleDiameter', label: 'Bolt-circle diameter', unit: 'mm', type: 'number', default: 45, min: 1, step: 1 },
      { id: 'boltCount', label: 'Bolt count (0 = none)', unit: '', type: 'number', default: 6, min: 0, step: 1 },
      { id: 'boltHoleDiameter', label: 'Bolt hole diameter', unit: 'mm', type: 'number', default: 5, min: 0.5, step: 0.5 }
    ]
  },
  {
    slug: 'l-bracket-generator',
    title: 'L-Bracket & Mounting Plate Generator',
    shortDescription: 'Generate an L-bracket (or a flat mounting plate) with mounting holes — live 3D preview, STL export.',
    intro: 'Set leg length 2 to 0 for a flat mounting plate, or a positive value for an L-bracket.',
    fields: [
      { id: 'legLength1', label: 'Leg 1 length', unit: 'mm', type: 'number', default: 50, min: 5, step: 1 },
      { id: 'legLength2', label: 'Leg 2 length (0 = flat plate)', unit: 'mm', type: 'number', default: 40, min: 0, step: 1 },
      { id: 'width', label: 'Width', unit: 'mm', type: 'number', default: 20, min: 2, step: 1 },
      { id: 'thickness', label: 'Thickness', unit: 'mm', type: 'number', default: 3, min: 0.5, step: 0.5 },
      { id: 'holeDiameter', label: 'Hole diameter (0 = none)', unit: 'mm', type: 'number', default: 5, min: 0, step: 0.5 },
      { id: 'holeInset', label: 'Hole inset from end', unit: 'mm', type: 'number', default: 8, min: 1, step: 0.5 }
    ]
  },
  {
    slug: 'enclosure-generator',
    title: 'Enclosure / Project Box Generator',
    shortDescription: 'Generate an open-top enclosure shell, optionally with a flat lid — live 3D preview, STL export.',
    intro: 'Enter outer dimensions and wall thickness to generate an open-top box shell.',
    fields: [
      { id: 'width', label: 'Width', unit: 'mm', type: 'number', default: 60, min: 10, step: 1 },
      { id: 'depth', label: 'Depth', unit: 'mm', type: 'number', default: 40, min: 10, step: 1 },
      { id: 'height', label: 'Height', unit: 'mm', type: 'number', default: 25, min: 5, step: 1 },
      { id: 'wallThickness', label: 'Wall thickness', unit: 'mm', type: 'number', default: 2, min: 0.8, step: 0.2 },
      {
        id: 'includeLid',
        label: 'Include lid',
        unit: '',
        type: 'select',
        default: 1,
        options: [
          { value: 0, label: 'No' },
          { value: 1, label: 'Yes (flat lid, shown beside the body)' }
        ]
      }
    ]
  },
  {
    slug: 'fastener-generator',
    title: 'Standard Fastener Generator',
    shortDescription: 'Generate a simplified hex bolt or hex nut model — live 3D preview, STL export.',
    intro: 'Enter a nominal diameter to generate a simplified fastener model.',
    notice:
      'This is a simplified, unthreaded display model (smooth shank/bore) — not a functional thread. Hex proportions use a common rule of thumb (across-flats ≈ 1.6× diameter), not a specific ISO 4014/4032 size table.',
    fields: [
      {
        id: 'type',
        label: 'Type',
        unit: '',
        type: 'select',
        default: 0,
        options: [
          { value: 0, label: 'Hex bolt' },
          { value: 1, label: 'Hex nut' }
        ]
      },
      { id: 'majorDiameter', label: 'Major diameter', unit: 'mm', type: 'number', default: 6, min: 1, step: 0.5 },
      { id: 'length', label: 'Length (bolt only)', unit: 'mm', type: 'number', default: 30, min: 1, step: 1 }
    ]
  }
];

export function getGenerator(slug: string): GeneratorDef | undefined {
  return generators.find((g) => g.slug === slug);
}
