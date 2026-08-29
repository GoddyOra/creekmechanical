// Roller-chain sprocket generator — a FUNCTIONAL APPROXIMATION, not an
// ANSI B29.1 / ISO 606 certified tooth profile. True sprocket geometry
// (seating-curve radius, flank radius, pressure angle) is a substantially
// different and more involved spec than involute gears, with no
// equivalent way to cross-validate it the way the gear profile was
// validated. This uses a smooth radial profile — exact pitch diameter
// (`pitch / sin(π/teeth)`, not approximated) with the radius dipping to
// roller-seat depth at each roller position and rising to tip radius at
// each tooth midpoint — verified to always produce a valid, smooth,
// non-self-intersecting closed outline (an earlier hand-connected-arcs
// approach did NOT — see git history). Say so in the UI copy.
import { booleans, extrusions, primitives } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/geom3/type';

export interface SprocketParams {
  pitch: number;
  rollerDiameter: number;
  teeth: number;
  thickness: number;
  boreDiameter: number;
}

export interface SprocketGeometryInfo {
  pitchRadius: number;
  rootRadius: number;
  outsideRadius: number;
}

export function buildSprocketOutline(params: {
  pitch: number;
  rollerDiameter: number;
  teeth: number;
  seatClearance?: number;
  pointsPerTooth?: number;
}): { points: [number, number][]; info: SprocketGeometryInfo } {
  const { pitch, rollerDiameter, teeth, seatClearance = 0.15, pointsPerTooth = 24 } = params;
  const pitchRadius = pitch / (2 * Math.sin(Math.PI / teeth));
  const seatRadius = rollerDiameter / 2 + seatClearance;
  const rootRadius = pitchRadius - seatRadius;
  const outsideRadius = pitchRadius + rollerDiameter * 0.5;
  const midRadius = (rootRadius + outsideRadius) / 2;
  const amplitude = (outsideRadius - rootRadius) / 2;

  const totalPoints = teeth * pointsPerTooth;
  const points: [number, number][] = [];
  for (let i = 0; i < totalPoints; i++) {
    const angle = (2 * Math.PI * i) / totalPoints;
    // Radius minimum (root) lands exactly at each roller position
    // (angle = k * 2π/teeth); maximum (tip) at each angular midpoint.
    const r = midRadius - amplitude * Math.cos(teeth * angle);
    points.push([r * Math.cos(angle), r * Math.sin(angle)]);
  }

  return { points, info: { pitchRadius, rootRadius, outsideRadius } };
}

export function generate(params: SprocketParams): Geom3 {
  const { points } = buildSprocketOutline(params);
  const profile = primitives.polygon({ points });
  let body: Geom3 = extrusions.extrudeLinear({ height: params.thickness }, profile);

  if (params.boreDiameter > 0) {
    // primitives.cylinder is centered at its `center` option, not
    // [0, height] like extrudeLinear output — see gear.ts for the same
    // gotcha, confirmed empirically there.
    const overshoot = params.thickness * 0.1;
    const bore = primitives.cylinder({
      radius: params.boreDiameter / 2,
      height: params.thickness + overshoot,
      center: [0, 0, params.thickness / 2],
      segments: 32
    });
    body = booleans.subtract(body, bore);
  }

  return body;
}
