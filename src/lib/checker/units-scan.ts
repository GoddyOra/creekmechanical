// Best-effort text scan for the length unit(s) a STEP or IGES file declares
// internally — run on the raw file bytes, independent of occt-import-js
// (which only lets you *request* an output unit, not read the *declared*
// one). Patterns confirmed against real fixture files, not memory:
//   - STEP: `SI_UNIT(.MILLI.,.METRE.)` / `SI_UNIT($,.METRE.)` /
//     `CONVERSION_BASED_UNIT('INCH',#ref) LENGTH_UNIT()` — verified against
//     the cube-units/{cube-mm,cube-m,cube-in}.step fixtures, which exist
//     specifically to test this.
//   - IGES: a fixed-position, Hollerith-encoded field in the Global
//     Section — verified against a real fixture's Global section
//     (`,2,2HMM,` = units flag 2, name "MM").
// BREP carries no unit metadata (confirmed against a real .brep header) —
// matches occt-import-js's own documented "has no effect on brep files".
import type { CadFormat } from '../viewer/occt-types';

export interface UnitsScanResult {
  applicable: boolean;
  declaredUnits: string[];
  consistent: boolean;
  note?: string;
}

function scanStepUnits(text: string): UnitsScanResult {
  const siUnits = new Set<string>();
  const conversionUnits = new Set<string>();
  const lengthUnitRegex = /LENGTH_UNIT\s*\(\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = lengthUnitRegex.exec(text))) {
    const windowStart = Math.max(0, match.index - 150);
    const windowEnd = Math.min(text.length, match.index + 150);
    const window = text.slice(windowStart, windowEnd);

    // A CONVERSION_BASED_UNIT (e.g. INCH) is defined *relative to* a plain
    // SI_UNIT (e.g. millimeter) that's typically declared right next to it
    // in the file. That SI_UNIT is a conversion basis, not an independently
    // -used unit — checking for CONVERSION_BASED_UNIT first and skipping
    // the SI_UNIT check in the same window avoids reporting a file that
    // consistently uses inches as if it also, incorrectly, used millimeters.
    const convMatch = window.match(/CONVERSION_BASED_UNIT\s*\(\s*'([^']+)'/);
    if (convMatch) {
      conversionUnits.add(convMatch[1].toUpperCase());
      continue;
    }

    const siMatch = window.match(/SI_UNIT\s*\(\s*([^,]*?)\s*,\s*\.(\w+)\.\s*\)/);
    if (siMatch && siMatch[2].toUpperCase() === 'METRE') {
      const prefixRaw = siMatch[1].trim().replace(/\./g, '');
      const prefix = prefixRaw === '$' ? '' : prefixRaw; // "$" is STEP's null placeholder
      siUnits.add(prefix ? `${prefix}METRE` : 'METRE');
    }
  }

  const declaredUnits = conversionUnits.size > 0 ? Array.from(conversionUnits) : Array.from(siUnits);
  return { applicable: true, declaredUnits, consistent: declaredUnits.length <= 1 };
}

// Splits a comma-delimited IGES parameter field list, correctly skipping
// over Hollerith-encoded strings (`nHtext...`) so commas inside them don't
// get mistaken for field separators.
function splitIgesFields(text: string): string[] {
  const fields: string[] = [];
  const n = text.length;
  let pos = 0;
  while (pos <= n) {
    let fieldEnd: number;
    const hollerith = /^(\d+)H/.exec(text.slice(pos));
    if (hollerith) {
      const len = parseInt(hollerith[1], 10);
      fieldEnd = pos + hollerith[0].length + len;
    } else {
      const nextComma = text.indexOf(',', pos);
      const nextSemi = text.indexOf(';', pos);
      const candidates = [nextComma, nextSemi].filter((x) => x >= 0);
      fieldEnd = candidates.length ? Math.min(...candidates) : n;
    }
    fields.push(text.slice(pos, fieldEnd));
    if (fieldEnd >= n) break;
    if (text[fieldEnd] === ';') break;
    pos = fieldEnd + 1;
  }
  return fields;
}

function scanIgesUnits(text: string): UnitsScanResult {
  // Reassemble the Global ("G") section: columns 1-72 are data, column 73
  // is the section-type letter.
  const lines = text.split(/\r\n|\r|\n/);
  let globalText = '';
  for (const line of lines) {
    if (line.length >= 73 && line[72] === 'G') {
      globalText += line.slice(0, 72);
    }
  }

  if (!globalText) {
    return { applicable: true, declaredUnits: [], consistent: true, note: 'No Global Section found — could not determine declared units.' };
  }

  const fields = splitIgesFields(globalText);
  // Global Section field 15 (1-indexed) is the Units Name, a Hollerith string.
  const unitsNameField = fields[14];
  const hollerithMatch = unitsNameField ? /^(\d+)H(.*)$/.exec(unitsNameField) : null;
  const unitsName = hollerithMatch ? hollerithMatch[2] : unitsNameField?.trim();

  if (!unitsName) {
    return { applicable: true, declaredUnits: [], consistent: true, note: 'Could not read the units field from this file’s Global Section.' };
  }

  return { applicable: true, declaredUnits: [unitsName.toUpperCase()], consistent: true };
}

export function scanDeclaredUnits(text: string, format: CadFormat): UnitsScanResult {
  if (format === 'step') return scanStepUnits(text);
  if (format === 'iges') return scanIgesUnits(text);
  return {
    applicable: false,
    declaredUnits: [],
    consistent: true,
    note: 'BREP files carry no unit metadata of their own — units are only meaningful in the context of the original file the BREP was exported from.'
  };
}
