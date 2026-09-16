// Appliance catalog and load classification for the solar sizing tool.
//
// The R / C / I classification is NOT cosmetic — it changes the arithmetic.
// Per the course material (whiteboard photos 1-3), resistive and capacitive
// loads contribute only their running power to the design total, while
// inductive loads contribute running power MULTIPLIED by their surge factor.
// That is why every line needs a class before Stage 0 can run.
//
// This module only *suggests* a classification from the appliance name. The
// user approves or overrides it in the UI — a suggestion that silently
// decided a 5x surge multiplier would be a bad tool.

export type LoadClass = 'resistive' | 'capacitive' | 'inductive';

export const LOAD_CLASS_LABEL: Record<LoadClass, string> = {
  resistive: 'Resistive (R)',
  capacitive: 'Capacitive (C)',
  inductive: 'Inductive (I)',
};

export const LOAD_CLASS_NOTE: Record<LoadClass, string> = {
  resistive: 'Heating elements and filament lighting. No start-up surge — counts at running power.',
  capacitive: 'Electronics with switch-mode supplies. No meaningful surge — counts at running power.',
  inductive: 'Motors and compressors. Draws several times running power for 1-3 s at start-up, so its surge is included in the design total.',
};

export interface ApplianceTemplate {
  /** Match tokens, lowercase. Longest match wins. */
  match: string[];
  name: string;
  loadClass: LoadClass;
  /** Typical running watts per unit. */
  watts: number;
  /** Start-up multiple of running watts. 1 for R and C. */
  surge: number;
  /** Typical hours of use per day, for the energy column. */
  hours: number;
}

// Surge factors follow the course cards: fridge/freezer 3x, AC 3-5x (4 used),
// water pump 5-7x (6 used). Wattages are typical Nigerian-market figures and
// are editable per line in the UI — they are a starting point, not a spec.
export const APPLIANCE_CATALOG: ApplianceTemplate[] = [
  // Inductive — motors and compressors
  { match: ['split unit ac', 'split ac', 'air conditioner', 'aircon', 'a/c', ' ac '], name: 'Split unit AC (1.5 HP)', loadClass: 'inductive', watts: 1120, surge: 4, hours: 8 },
  { match: ['washing machine', 'washer'], name: 'Washing machine', loadClass: 'inductive', watts: 500, surge: 3, hours: 1 },
  { match: ['freezer', 'deep freezer'], name: 'Freezer', loadClass: 'inductive', watts: 300, surge: 3, hours: 24 },
  { match: ['fridge', 'refrigerator'], name: 'Fridge', loadClass: 'inductive', watts: 200, surge: 3, hours: 24 },
  { match: ['pumping machine', 'water pump', 'pump', 'borehole'], name: 'Water pump (1 HP)', loadClass: 'inductive', watts: 750, surge: 6, hours: 1 },
  { match: ['microwave'], name: 'Microwave oven', loadClass: 'inductive', watts: 1500, surge: 2, hours: 0.5 },
  { match: ['blender', 'food processor'], name: 'Blender', loadClass: 'inductive', watts: 1000, surge: 3, hours: 0.5 },
  { match: ['ceiling fan', 'standing fan', 'fan'], name: 'Ceiling fan', loadClass: 'inductive', watts: 75, surge: 2, hours: 12 },
  { match: ['air conditioner compressor', 'compressor'], name: 'Compressor', loadClass: 'inductive', watts: 1500, surge: 5, hours: 2 },
  { match: ['grinder', 'drill', 'saw', 'power tool'], name: 'Power tool', loadClass: 'inductive', watts: 900, surge: 3, hours: 0.5 },
  { match: ['vacuum cleaner', 'vacuum'], name: 'Vacuum cleaner', loadClass: 'inductive', watts: 700, surge: 3, hours: 0.5 },
  { match: ['dispenser', 'water dispenser'], name: 'Water dispenser', loadClass: 'inductive', watts: 550, surge: 3, hours: 6 },

  // Resistive — heating elements and filament lighting
  { match: ['water heater', 'geyser', 'immersion'], name: 'Water heater', loadClass: 'resistive', watts: 3000, surge: 1, hours: 1 },
  { match: ['electric iron', 'pressing iron', 'iron'], name: 'Electric iron', loadClass: 'resistive', watts: 1500, surge: 1, hours: 1 },
  { match: ['air fryer', 'air frier', 'fryer', 'frier'], name: 'Air fryer', loadClass: 'resistive', watts: 1500, surge: 1, hours: 1 },
  { match: ['toaster'], name: 'Toaster', loadClass: 'resistive', watts: 1500, surge: 1, hours: 0.5 },
  { match: ['electric kettle', 'kettle'], name: 'Electric kettle', loadClass: 'resistive', watts: 2000, surge: 1, hours: 0.5 },
  { match: ['hot plate', 'electric cooker', 'cooker'], name: 'Hot plate', loadClass: 'resistive', watts: 1200, surge: 1, hours: 1 },
  { match: ['electric oven', 'oven'], name: 'Electric oven', loadClass: 'resistive', watts: 2000, surge: 1, hours: 1 },
  { match: ['led bulb', 'led light', 'led', 'bulb', 'light'], name: 'LED bulb', loadClass: 'resistive', watts: 10, surge: 1, hours: 6 },
  { match: ['incandescent', 'filament'], name: 'Incandescent bulb', loadClass: 'resistive', watts: 60, surge: 1, hours: 5 },
  { match: ['hair dryer', 'blow dryer'], name: 'Hair dryer', loadClass: 'resistive', watts: 1200, surge: 1, hours: 0.25 },

  // Capacitive — switch-mode electronics
  { match: ['television', 'tv ', 'tv'], name: 'Television', loadClass: 'capacitive', watts: 100, surge: 1, hours: 6 },
  { match: ['sound system', 'home theatre', 'home theater', 'speaker', 'amplifier'], name: 'Sound system', loadClass: 'capacitive', watts: 300, surge: 1, hours: 3 },
  { match: ['laptop', 'notebook'], name: 'Laptop', loadClass: 'capacitive', watts: 40, surge: 1, hours: 6 },
  { match: ['desktop', 'pc', 'computer'], name: 'Desktop computer', loadClass: 'capacitive', watts: 150, surge: 1, hours: 4 },
  { match: ['decoder', 'dstv', 'dss', 'set top box', 'set-top'], name: 'Decoder / DStv', loadClass: 'capacitive', watts: 25, surge: 1, hours: 6 },
  { match: ['router', 'modem', 'wifi', 'wi-fi'], name: 'Router', loadClass: 'capacitive', watts: 25, surge: 1, hours: 24 },
  { match: ['playstation', 'ps5', 'ps4', 'xbox', 'console', 'game'], name: 'Games console', loadClass: 'capacitive', watts: 100, surge: 1, hours: 4 },
  { match: ['printer', 'scanner'], name: 'Printer', loadClass: 'capacitive', watts: 100, surge: 1, hours: 0.5 },
  { match: ['monitor', 'display', 'screen'], name: 'Monitor', loadClass: 'capacitive', watts: 30, surge: 1, hours: 6 },
  { match: ['phone charger', 'charger', 'phone'], name: 'Phone charger', loadClass: 'capacitive', watts: 10, surge: 1, hours: 4 },
  { match: ['cctv', 'camera', 'security'], name: 'CCTV / camera', loadClass: 'capacitive', watts: 30, surge: 1, hours: 24 },
];

/**
 * Suggest a classification and typical values from a free-text appliance name.
 * Returns null when nothing matches, so the UI can ask instead of guessing.
 *
 * Longest match wins, so "water heater" beats "heater" and "ceiling fan"
 * beats "fan".
 */
export function suggestAppliance(rawName: string): ApplianceTemplate | null {
  const name = ` ${rawName.toLowerCase().trim()} `;
  let best: ApplianceTemplate | null = null;
  let bestLen = 0;
  for (const entry of APPLIANCE_CATALOG) {
    for (const token of entry.match) {
      if (name.includes(token) && token.trim().length > bestLen) {
        best = entry;
        bestLen = token.trim().length;
      }
    }
  }
  return best;
}

/**
 * Fallback classification when the name matches nothing: anything that names
 * a motor-ish concept is inductive, otherwise assume capacitive (the safest
 * "unknown electronic" default — it adds no surge, and the UI asks the user
 * to confirm anyway).
 */
export function fallbackClass(rawName: string): LoadClass {
  const n = rawName.toLowerCase();
  if (/motor|pump|compress|fan|blow|mixer|machine|drill|grind/.test(n)) return 'inductive';
  if (/heat|iron|toast|kettle|cook|oven|grill|element|lamp|bulb|light/.test(n)) return 'resistive';
  return 'capacitive';
}

/** Default surge factor for a class, used when a line has no catalog match. */
export function defaultSurge(loadClass: LoadClass): number {
  return loadClass === 'inductive' ? 3 : 1;
}

/** Horsepower to watts, for the "2 HP" style ratings the course material uses. */
export const WATTS_PER_HP = 746;
