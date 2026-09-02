// Static reference data for Stage 4. Pure data, no logic — rendered by
// ReferenceTable.astro, which handles sorting/filtering/copy generically.
// Values below are representative/typical figures compiled from common
// published engineering references (handbooks, ASTM/ISO/ASME standards).
// They are not pulled from a live current standard — always verify against
// the governing standard or a manufacturer datasheet before relying on them
// for production work. See each table's `sourceNote`.

export interface ReferenceColumn {
  id: string;
  label: string;
  numeric?: boolean;
}

export interface ReferenceTableDef {
  slug: string;
  title: string;
  shortDescription: string;
  intro: string;
  sourceNote: string;
  relatedGuide?: { href: string; label: string };
  columns: ReferenceColumn[];
  rows: Record<string, string | number>[];
}

export const referenceTables: ReferenceTableDef[] = [
  {
    slug: 'tap-drill-clearance-hole-sizes',
    title: 'Tap Drill & Clearance Hole Sizes (Metric)',
    shortDescription: 'Recommended tap drill and clearance hole diameters for common ISO metric threads.',
    intro:
      'Tap drill sizes below target roughly 75% thread engagement, the common machine-shop default. Clearance holes give a close (precise location) or normal (easier assembly) fit for a through-bolt.',
    sourceNote:
      'Typical values for ISO metric coarse-pitch threads, compiled from common machinist reference tables (cf. ISO 261 / ISO 273 close and medium fit classes). Confirm against your tap manufacturer’s chart for critical fits.',
    columns: [
      { id: 'thread', label: 'Thread' },
      { id: 'pitch', label: 'Pitch (mm)', numeric: true },
      { id: 'tapDrill', label: 'Tap Drill (mm)', numeric: true },
      { id: 'clearanceClose', label: 'Clearance, Close Fit (mm)', numeric: true },
      { id: 'clearanceFree', label: 'Clearance, Normal Fit (mm)', numeric: true }
    ],
    rows: [
      { thread: 'M2', pitch: 0.4, tapDrill: 1.6, clearanceClose: 2.2, clearanceFree: 2.4 },
      { thread: 'M2.5', pitch: 0.45, tapDrill: 2.05, clearanceClose: 2.7, clearanceFree: 2.9 },
      { thread: 'M3', pitch: 0.5, tapDrill: 2.5, clearanceClose: 3.2, clearanceFree: 3.4 },
      { thread: 'M4', pitch: 0.7, tapDrill: 3.3, clearanceClose: 4.3, clearanceFree: 4.5 },
      { thread: 'M5', pitch: 0.8, tapDrill: 4.2, clearanceClose: 5.3, clearanceFree: 5.5 },
      { thread: 'M6', pitch: 1.0, tapDrill: 5.0, clearanceClose: 6.4, clearanceFree: 6.6 },
      { thread: 'M8', pitch: 1.25, tapDrill: 6.8, clearanceClose: 8.4, clearanceFree: 9.0 },
      { thread: 'M10', pitch: 1.5, tapDrill: 8.5, clearanceClose: 10.5, clearanceFree: 11.0 },
      { thread: 'M12', pitch: 1.75, tapDrill: 10.2, clearanceClose: 13.0, clearanceFree: 13.5 },
      { thread: 'M14', pitch: 2.0, tapDrill: 12.0, clearanceClose: 15.0, clearanceFree: 15.5 },
      { thread: 'M16', pitch: 2.0, tapDrill: 14.0, clearanceClose: 17.0, clearanceFree: 17.5 },
      { thread: 'M20', pitch: 2.5, tapDrill: 17.5, clearanceClose: 21.0, clearanceFree: 22.0 },
      { thread: 'M24', pitch: 3.0, tapDrill: 21.0, clearanceClose: 25.0, clearanceFree: 26.0 }
    ]
  },
  {
    slug: 'bolt-torque-specifications',
    title: 'Bolt Torque Specifications by Grade',
    shortDescription: 'Typical dry tightening torque by bolt size and strength grade.',
    intro:
      'Typical dry (unlubricated, K ≈ 0.20) tightening torque for common bolt sizes across standard strength grades. For a specific preload target instead of a typical grade torque, use the ',
    sourceNote:
      'Approximate values compiled from commonly published fastener torque charts. Required torque depends heavily on friction/lubrication condition, plating, and application — verify against the fastener manufacturer’s specification before use on a critical joint.',
    relatedGuide: { href: '/guides/choosing-bolt-torque-spec/', label: 'Choosing a Bolt Torque Spec' },
    columns: [
      { id: 'size', label: 'Size' },
      { id: 'sae5', label: 'SAE Grade 5 (ft·lb)', numeric: true },
      { id: 'sae8', label: 'SAE Grade 8 (ft·lb)', numeric: true },
      { id: 'class88', label: 'Metric 8.8 (N·m)', numeric: true },
      { id: 'class109', label: 'Metric 10.9 (N·m)', numeric: true },
      { id: 'class129', label: 'Metric 12.9 (N·m)', numeric: true }
    ],
    rows: [
      { size: '1/4"', sae5: 8, sae8: 12, class88: '—', class109: '—', class129: '—' },
      { size: '5/16"', sae5: 17, sae8: 25, class88: '—', class109: '—', class129: '—' },
      { size: '3/8"', sae5: 31, sae8: 44, class88: '—', class109: '—', class129: '—' },
      { size: '7/16"', sae5: 49, sae8: 71, class88: '—', class109: '—', class129: '—' },
      { size: '1/2"', sae5: 76, sae8: 108, class88: '—', class109: '—', class129: '—' },
      { size: '5/8"', sae5: 150, sae8: 220, class88: '—', class109: '—', class129: '—' },
      { size: '3/4"', sae5: 266, sae8: 380, class88: '—', class109: '—', class129: '—' },
      { size: 'M6', sae5: '—', sae8: '—', class88: 10, class109: 14, class129: 17 },
      { size: 'M8', sae5: '—', sae8: '—', class88: 25, class109: 34, class129: 41 },
      { size: 'M10', sae5: '—', sae8: '—', class88: 50, class109: 68, class129: 82 },
      { size: 'M12', sae5: '—', sae8: '—', class88: 87, class109: 120, class129: 145 },
      { size: 'M14', sae5: '—', sae8: '—', class88: 138, class109: 190, class129: 230 },
      { size: 'M16', sae5: '—', sae8: '—', class88: 214, class109: 295, class129: 355 },
      { size: 'M20', sae5: '—', sae8: '—', class88: 425, class109: 585, class129: 705 }
    ]
  },
  {
    slug: 'thread-specifications',
    title: 'Thread Specifications (Metric & Imperial)',
    shortDescription: 'Pitch/TPI and approximate minor diameter for common metric and UNC/UNF threads.',
    intro:
      'Major diameter, pitch (metric) or threads-per-inch (imperial), and approximate minor diameter for commonly used external thread sizes.',
    sourceNote:
      'Metric minor diameters are the standard ISO 724 basic (theoretical) minor diameter, computed as major − 1.0825 × pitch. Imperial minor diameters are the ASME B1.1 basic external-thread minor diameter for each designation. Neither includes a specific tolerance class allowance — verify against ISO 724 or ASME B1.1 directly for critical tolerancing.',
    columns: [
      { id: 'designation', label: 'Designation' },
      { id: 'series', label: 'Series' },
      { id: 'pitchOrTpi', label: 'Pitch (mm) / TPI' },
      { id: 'majorDia', label: 'Major Ø', numeric: true },
      { id: 'minorDia', label: 'Minor Ø (approx.)', numeric: true }
    ],
    rows: [
      { designation: 'M3 × 0.5', series: 'Metric coarse', pitchOrTpi: '0.5', majorDia: '3.000 mm', minorDia: '2.459 mm' },
      { designation: 'M4 × 0.7', series: 'Metric coarse', pitchOrTpi: '0.7', majorDia: '4.000 mm', minorDia: '3.242 mm' },
      { designation: 'M5 × 0.8', series: 'Metric coarse', pitchOrTpi: '0.8', majorDia: '5.000 mm', minorDia: '4.134 mm' },
      { designation: 'M6 × 1.0', series: 'Metric coarse', pitchOrTpi: '1.0', majorDia: '6.000 mm', minorDia: '4.917 mm' },
      { designation: 'M8 × 1.25', series: 'Metric coarse', pitchOrTpi: '1.25', majorDia: '8.000 mm', minorDia: '6.647 mm' },
      { designation: 'M8 × 1.0', series: 'Metric fine', pitchOrTpi: '1.0', majorDia: '8.000 mm', minorDia: '6.917 mm' },
      { designation: 'M10 × 1.5', series: 'Metric coarse', pitchOrTpi: '1.5', majorDia: '10.000 mm', minorDia: '8.376 mm' },
      { designation: 'M10 × 1.25', series: 'Metric fine', pitchOrTpi: '1.25', majorDia: '10.000 mm', minorDia: '8.647 mm' },
      { designation: 'M12 × 1.75', series: 'Metric coarse', pitchOrTpi: '1.75', majorDia: '12.000 mm', minorDia: '10.106 mm' },
      { designation: '1/4-20 UNC', series: 'Imperial coarse', pitchOrTpi: '20', majorDia: '0.2500 in', minorDia: '0.1905 in' },
      { designation: '1/4-28 UNF', series: 'Imperial fine', pitchOrTpi: '28', majorDia: '0.2500 in', minorDia: '0.2075 in' },
      { designation: '5/16-18 UNC', series: 'Imperial coarse', pitchOrTpi: '18', majorDia: '0.3125 in', minorDia: '0.2458 in' },
      { designation: '5/16-24 UNF', series: 'Imperial fine', pitchOrTpi: '24', majorDia: '0.3125 in', minorDia: '0.2624 in' },
      { designation: '3/8-16 UNC', series: 'Imperial coarse', pitchOrTpi: '16', majorDia: '0.3750 in', minorDia: '0.3006 in' },
      { designation: '1/2-13 UNC', series: 'Imperial coarse', pitchOrTpi: '13', majorDia: '0.5000 in', minorDia: '0.4084 in' },
      { designation: '1/2-20 UNF', series: 'Imperial fine', pitchOrTpi: '20', majorDia: '0.5000 in', minorDia: '0.4405 in' },
      { designation: '3/4-10 UNC', series: 'Imperial coarse', pitchOrTpi: '10', majorDia: '0.7500 in', minorDia: '0.6309 in' },
      { designation: '1-8 UNC', series: 'Imperial coarse', pitchOrTpi: '8', majorDia: '1.0000 in', minorDia: '0.8512 in' }
    ]
  },
  {
    slug: 'material-properties',
    title: 'Material Property Reference',
    shortDescription: 'Density, elastic modulus, yield, and ultimate tensile strength for common steels, aluminums, and plastics.',
    intro:
      'Typical mechanical properties for common engineering materials. Actual properties vary significantly with temper, heat treatment, processing, and supplier — always confirm against a current mill certificate or datasheet for design work.',
    sourceNote:
      'Representative typical values compiled from common engineering material references. Not a substitute for a material certification or datasheet.',
    columns: [
      { id: 'material', label: 'Material' },
      { id: 'density', label: 'Density (kg/m³)', numeric: true },
      { id: 'modulusE', label: 'Elastic Modulus (GPa)', numeric: true },
      { id: 'yield', label: 'Yield Strength (MPa)', numeric: true },
      { id: 'uts', label: 'Ultimate Tensile Strength (MPa)', numeric: true }
    ],
    rows: [
      { material: '1018 Steel (CD)', density: 7870, modulusE: 200, yield: 370, uts: 440 },
      { material: '1045 Steel (CD)', density: 7850, modulusE: 200, yield: 530, uts: 625 },
      { material: '4140 Steel (annealed)', density: 7850, modulusE: 200, yield: 415, uts: 655 },
      { material: 'A36 Structural Steel', density: 7850, modulusE: 200, yield: 250, uts: 400 },
      { material: '304 Stainless Steel', density: 8000, modulusE: 193, yield: 215, uts: 505 },
      { material: '316 Stainless Steel', density: 8000, modulusE: 193, yield: 205, uts: 515 },
      { material: '6061-T6 Aluminum', density: 2700, modulusE: 68.9, yield: 276, uts: 310 },
      { material: '7075-T6 Aluminum', density: 2810, modulusE: 71.7, yield: 503, uts: 572 },
      { material: '2024-T3 Aluminum', density: 2780, modulusE: 73.1, yield: 345, uts: 483 },
      { material: 'ABS (plastic)', density: 1050, modulusE: 2.3, yield: '—', uts: 40 },
      { material: 'Nylon 6/6 (plastic)', density: 1140, modulusE: 2.9, yield: '—', uts: 82 },
      { material: 'Polycarbonate', density: 1200, modulusE: 2.4, yield: '—', uts: 65 },
      { material: 'Acetal / Delrin (POM)', density: 1410, modulusE: 2.8, yield: '—', uts: 70 },
      { material: 'HDPE (plastic)', density: 950, modulusE: 1.0, yield: '—', uts: 26 }
    ]
  },
  {
    slug: 'hardness-conversion',
    title: 'Hardness Conversion Chart (Steel)',
    shortDescription: 'Approximate Brinell, Rockwell C/B, Vickers, and tensile strength correlation for steel.',
    intro:
      'Approximate hardness scale conversions for steel, following the general correlation pattern used in ASTM E140. Applies to wrought or forged carbon and low-alloy steel only — not valid for austenitic stainless steel, cast irons, or non-ferrous metals.',
    sourceNote:
      'Approximate correlation only, not a substitute for direct measurement on the material in question. Different microstructures give different actual correlations even at the same hardness reading, and published conversion tables commonly disagree by a few HRC/HV points at the same Brinell value — treat this as a ballpark, not a certified conversion.',
    columns: [
      { id: 'hb', label: 'Brinell (HB)', numeric: true },
      { id: 'hrc', label: 'Rockwell C (HRC)' },
      { id: 'hrb', label: 'Rockwell B (HRB)' },
      { id: 'hv', label: 'Vickers (HV)', numeric: true },
      { id: 'tensile', label: 'Approx. Tensile Strength (MPa)', numeric: true }
    ],
    rows: [
      { hb: 100, hrc: '—', hrb: 56, hv: 105, tensile: 345 },
      { hb: 150, hrc: '—', hrb: 80, hv: 158, tensile: 515 },
      { hb: 200, hrc: '—', hrb: 93, hv: 210, tensile: 690 },
      { hb: 250, hrc: 22, hrb: '—', hv: 262, tensile: 865 },
      { hb: 300, hrc: 32, hrb: '—', hv: 314, tensile: 1035 },
      { hb: 350, hrc: 38, hrb: '—', hv: 368, tensile: 1205 },
      { hb: 400, hrc: 43, hrb: '—', hv: 421, tensile: 1380 },
      { hb: 450, hrc: 47, hrb: '—', hv: 474, tensile: 1550 },
      { hb: 500, hrc: 50, hrb: '—', hv: 527, tensile: 1725 }
    ]
  },
  {
    slug: 'surface-finish-comparison',
    title: 'Surface Finish (Ra) Comparison Chart',
    shortDescription: 'ISO 1302 N-grade roughness values with typical machining process associations.',
    intro:
      'Surface roughness grade numbers (N-grades) per ISO 1302, with the corresponding Ra value and the manufacturing processes typically capable of producing it. Actual roughness from any process depends heavily on parameters, tooling, and material.',
    sourceNote:
      'N-grade to Ra values follow the standard ISO 1302 grade series. Process associations are general guidance, not guaranteed capability — confirm with your shop for a specific process and material.',
    columns: [
      { id: 'grade', label: 'N-Grade' },
      { id: 'raUm', label: 'Ra (µm)', numeric: true },
      { id: 'raUin', label: 'Ra (µin)', numeric: true },
      { id: 'typicalProcess', label: 'Typical Process' }
    ],
    rows: [
      { grade: 'N1', raUm: 0.025, raUin: 1, typicalProcess: 'Lapping, honing, superfinishing' },
      { grade: 'N2', raUm: 0.05, raUin: 2, typicalProcess: 'Lapping, honing' },
      { grade: 'N3', raUm: 0.1, raUin: 4, typicalProcess: 'Fine grinding, honing' },
      { grade: 'N4', raUm: 0.2, raUin: 8, typicalProcess: 'Fine grinding' },
      { grade: 'N5', raUm: 0.4, raUin: 16, typicalProcess: 'Grinding, fine turning/milling' },
      { grade: 'N6', raUm: 0.8, raUin: 32, typicalProcess: 'Grinding, turning, milling' },
      { grade: 'N7', raUm: 1.6, raUin: 63, typicalProcess: 'Turning, milling, EDM' },
      { grade: 'N8', raUm: 3.2, raUin: 125, typicalProcess: 'Turning, milling, drilling' },
      { grade: 'N9', raUm: 6.3, raUin: 250, typicalProcess: 'Rough turning/milling, drilling' },
      { grade: 'N10', raUm: 12.5, raUin: 500, typicalProcess: 'Rough machining, sawing' },
      { grade: 'N11', raUm: 25, raUin: 1000, typicalProcess: 'Sand casting, flame cutting' },
      { grade: 'N12', raUm: 50, raUin: 2000, typicalProcess: 'Rough sand casting, forging' }
    ]
  },
  {
    slug: 'drill-gauge-sizes',
    title: 'Standard Drill Gauge Sizes',
    shortDescription: 'Commonly used number, letter, and fractional drill sizes with decimal-inch and metric equivalents.',
    intro:
      'A curated list of frequently used number, letter, and fractional drill sizes — not the complete official index. For a specific tap drill, see the ',
    sourceNote:
      'Common sizes compiled from standard machinist drill-size references. Verify against a full ANSI/ASME B94.11M drill size chart for a size not listed here.',
    columns: [
      { id: 'designation', label: 'Designation' },
      { id: 'decimalIn', label: 'Decimal (in)', numeric: true },
      { id: 'mm', label: 'Metric (mm)', numeric: true }
    ],
    rows: [
      { designation: '#60', decimalIn: 0.04, mm: 1.016 },
      { designation: '#50', decimalIn: 0.07, mm: 1.778 },
      { designation: '#40', decimalIn: 0.098, mm: 2.489 },
      { designation: '#30', decimalIn: 0.1285, mm: 3.264 },
      { designation: '#20', decimalIn: 0.161, mm: 4.089 },
      { designation: '#10', decimalIn: 0.1935, mm: 4.915 },
      { designation: '#4', decimalIn: 0.209, mm: 5.309 },
      { designation: '#1', decimalIn: 0.228, mm: 5.791 },
      { designation: 'A', decimalIn: 0.234, mm: 5.944 },
      { designation: 'F', decimalIn: 0.257, mm: 6.528 },
      { designation: 'J', decimalIn: 0.277, mm: 7.036 },
      { designation: 'N', decimalIn: 0.302, mm: 7.671 },
      { designation: 'Q', decimalIn: 0.332, mm: 8.433 },
      { designation: 'U', decimalIn: 0.368, mm: 9.347 },
      { designation: 'X', decimalIn: 0.397, mm: 10.084 },
      { designation: '1/16"', decimalIn: 0.0625, mm: 1.588 },
      { designation: '1/8"', decimalIn: 0.125, mm: 3.175 },
      { designation: '3/16"', decimalIn: 0.1875, mm: 4.763 },
      { designation: '1/4"', decimalIn: 0.25, mm: 6.35 },
      { designation: '5/16"', decimalIn: 0.3125, mm: 7.938 },
      { designation: '3/8"', decimalIn: 0.375, mm: 9.525 },
      { designation: '1/2"', decimalIn: 0.5, mm: 12.7 }
    ]
  },
  {
    slug: 'sheet-metal-gauge-sizes',
    title: 'Sheet Metal Gauge Sizes',
    shortDescription: 'Gauge number to thickness for steel and aluminum sheet.',
    intro:
      'Nominal sheet thickness by gauge number. Steel uses Manufacturers’ Standard Gauge; aluminum (and other non-ferrous sheet) traditionally uses a different gauge standard, so the same gauge number is not the same thickness across materials.',
    sourceNote:
      'Nominal values compiled from common gauge reference charts. Gauge-to-thickness mapping can vary by supplier and material — verify against your supplier’s spec for precise thickness requirements.',
    relatedGuide: { href: '/guides/sheet-metal-design-mistakes/', label: 'Sheet Metal Design Mistakes That Cause Delays' },
    columns: [
      { id: 'gauge', label: 'Gauge', numeric: true },
      { id: 'steelIn', label: 'Steel (in)', numeric: true },
      { id: 'steelMm', label: 'Steel (mm)', numeric: true },
      { id: 'aluminumIn', label: 'Aluminum (in)', numeric: true },
      { id: 'aluminumMm', label: 'Aluminum (mm)', numeric: true }
    ],
    rows: [
      { gauge: 7, steelIn: 0.1793, steelMm: 4.55, aluminumIn: 0.144, aluminumMm: 3.67 },
      { gauge: 10, steelIn: 0.1345, steelMm: 3.42, aluminumIn: 0.102, aluminumMm: 2.59 },
      { gauge: 12, steelIn: 0.1046, steelMm: 2.66, aluminumIn: 0.081, aluminumMm: 2.05 },
      { gauge: 14, steelIn: 0.0747, steelMm: 1.9, aluminumIn: 0.064, aluminumMm: 1.63 },
      { gauge: 16, steelIn: 0.0598, steelMm: 1.52, aluminumIn: 0.051, aluminumMm: 1.29 },
      { gauge: 18, steelIn: 0.0478, steelMm: 1.21, aluminumIn: 0.04, aluminumMm: 1.02 },
      { gauge: 20, steelIn: 0.0359, steelMm: 0.91, aluminumIn: 0.032, aluminumMm: 0.81 },
      { gauge: 22, steelIn: 0.0299, steelMm: 0.76, aluminumIn: 0.025, aluminumMm: 0.64 },
      { gauge: 24, steelIn: 0.0239, steelMm: 0.61, aluminumIn: 0.02, aluminumMm: 0.51 },
      { gauge: 26, steelIn: 0.0179, steelMm: 0.45, aluminumIn: 0.016, aluminumMm: 0.41 },
      { gauge: 28, steelIn: 0.0149, steelMm: 0.38, aluminumIn: 0.013, aluminumMm: 0.33 }
    ]
  }
];

export function getReferenceTable(slug: string): ReferenceTableDef | undefined {
  return referenceTables.find((t) => t.slug === slug);
}
