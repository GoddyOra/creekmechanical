// Slug -> geometry-function lookup, mirroring formulas.ts's `formulas[slug]`
// pattern from the calculator engine (Stage 3). Params are always a plain
// Record<string, number> read from the form; each generator's own
// `generate()` knows its own parameter shape.
import type { Geom3 } from '@jscad/modeling/src/geometries/geom3/type';
import { generate as generateGear } from './gear';
import { generate as generateSprocket } from './sprocket';
import { generate as generateFlange } from './flange';
import { generate as generateBracket } from './bracket';
import { generate as generateEnclosure } from './enclosure';
import { generate as generateFastener } from './fastener';

type GeneratorFn = (params: Record<string, number>) => Geom3;

export const generatorFns: Record<string, GeneratorFn> = {
  'spur-gear-generator': generateGear as GeneratorFn,
  'sprocket-generator': generateSprocket as GeneratorFn,
  'flange-generator': generateFlange as GeneratorFn,
  'l-bracket-generator': generateBracket as GeneratorFn,
  'enclosure-generator': generateEnclosure as GeneratorFn,
  'fastener-generator': generateFastener as GeneratorFn
};
