// Simplified hex bolt / hex nut display models — SMOOTH, UNTHREADED shank
// and bore. Real ISO helical thread geometry is a substantially larger
// undertaking (thread-profile sweep, correct handedness, start/end
// chamfers) with no good way to validate it the way the gear involute
// profile was validated; out of scope for this pass. The UI copy says so.
// Hex proportions use a simple, commonly-cited rule of thumb
// (across-flats ≈ 1.6 × major diameter, head/nut height ≈ 0.65 × major
// diameter) rather than a specific ISO 4014/4032 size table — close for
// common metric sizes, not a substitute for a real fastener spec sheet.
import { booleans, primitives } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/geom3/type';

export interface FastenerParams {
  type: number; // 0 = hex bolt, 1 = hex nut
  majorDiameter: number;
  length: number; // bolt shank length only
}

function hexPrism(acrossFlats: number, height: number, centerZ: number): Geom3 {
  const circumradius = acrossFlats / Math.sqrt(3);
  return primitives.cylinder({ radius: circumradius, height, segments: 6, center: [0, 0, centerZ] });
}

export function generate(params: FastenerParams): Geom3 {
  const d = params.majorDiameter;
  const acrossFlats = 1.6 * d;
  const headHeight = 0.65 * d;

  if (params.type === 1) {
    // Hex nut: hex prism minus a smooth through-hole.
    const nut = hexPrism(acrossFlats, headHeight, headHeight / 2);
    const overshoot = headHeight * 0.2;
    const hole = primitives.cylinder({ radius: d / 2, height: headHeight + overshoot, center: [0, 0, headHeight / 2], segments: 32 });
    return booleans.subtract(nut, hole);
  }

  // Hex bolt: hex head + smooth cylindrical shank.
  const head = hexPrism(acrossFlats, headHeight, headHeight / 2);
  const shank = primitives.cylinder({
    radius: d / 2,
    height: params.length,
    center: [0, 0, headHeight + params.length / 2],
    segments: 32
  });
  return booleans.union(head, shank);
}
