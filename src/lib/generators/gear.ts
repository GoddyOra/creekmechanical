// Spur & helical involute gear generator. The tooth-profile math (below)
// was derived from first principles and verified — numerically (root/
// outside radius match to 3 decimals) and visually (rendered to SVG,
// rasterized, and inspected) — before this file was written; see the
// Stage 7 plan for the derivation.
//
// Helical twist deliberately does NOT use @jscad/modeling's
// extrudeHelical — that function sweeps a profile *around* the Z axis at
// an offset radius (built for coil/screw-thread shapes), not a full
// cross-section twisting about its own center the way a helical gear
// needs. Confirmed empirically: extrudeHelical's z-range came back
// [-height/4, height*5/4] on a simple test square, not [0, height] —
// wrong tool. Uses extrudeFromSlices with a manual rotate+translate slice
// callback instead, verified to produce the expected [0, height] z-range
// and the exact requested twist angle.
import { booleans, extrusions, geometries, maths, primitives } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/geom3/type';

export interface GearParams {
  module: number;
  teeth: number;
  pressureAngleDeg: number;
  helixAngleDeg: number;
  faceWidth: number;
  boreDiameter: number;
}

function involutePolarAngle(theta: number): number {
  return theta - Math.atan(theta);
}

function thetaForRadius(baseRadius: number, r: number): number {
  return Math.sqrt(Math.max((r / baseRadius) ** 2 - 1, 0));
}

export interface GearGeometryInfo {
  pitchRadius: number;
  baseRadius: number;
  outsideRadius: number;
  rootRadius: number;
}

export function buildGearOutline(params: {
  module: number;
  teeth: number;
  pressureAngleDeg: number;
  pointsPerFlank?: number;
  tipArcPoints?: number;
  rootArcPoints?: number;
}): { points: [number, number][]; info: GearGeometryInfo } {
  const { module: m, teeth, pressureAngleDeg, pointsPerFlank = 8, tipArcPoints = 3, rootArcPoints = 4 } = params;
  const pressureAngle = (pressureAngleDeg * Math.PI) / 180;
  const pitchRadius = (m * teeth) / 2;
  const baseRadius = pitchRadius * Math.cos(pressureAngle);
  const outsideRadius = pitchRadius + m; // addendum = 1 module
  const rootRadius = pitchRadius - 1.25 * m; // dedendum = 1.25 module (standard full-depth)
  const involuteStart = Math.max(rootRadius, baseRadius);

  const thetaStart = thetaForRadius(baseRadius, involuteStart);
  const thetaEnd = thetaForRadius(baseRadius, outsideRadius);
  const polarAtPitch = involutePolarAngle(thetaForRadius(baseRadius, pitchRadius));
  const halfToothAngle = Math.PI / (2 * teeth);
  const rotOffset = halfToothAngle + polarAtPitch;

  function rightFlank(): { r: number; angle: number }[] {
    const pts = [];
    for (let i = 0; i <= pointsPerFlank; i++) {
      const theta = thetaStart + ((thetaEnd - thetaStart) * i) / pointsPerFlank;
      const r = baseRadius * Math.sqrt(1 + theta * theta);
      const angle = rotOffset - involutePolarAngle(theta);
      pts.push({ r, angle });
    }
    return pts;
  }

  const toothAngularPitch = (2 * Math.PI) / teeth;
  const points: [number, number][] = [];

  for (let t = 0; t < teeth; t++) {
    const center = t * toothAngularPitch;
    const right = rightFlank();
    const left = right
      .slice()
      .reverse()
      .map((p) => ({ r: p.r, angle: -p.angle }));

    for (const p of right) points.push(polarToXY(p.r, center + p.angle));

    const tipRightAngle = right[right.length - 1].angle;
    for (let i = 1; i < tipArcPoints; i++) {
      const a = tipRightAngle - (2 * tipRightAngle * i) / tipArcPoints;
      points.push(polarToXY(outsideRadius, center + a));
    }

    for (const p of left) points.push(polarToXY(p.r, center + p.angle));

    const rootLeftAngle = left[left.length - 1].angle;
    const nextCenter = (t + 1) * toothAngularPitch;
    const nextRightRootAngle = right[0].angle;
    const rootLeftAbs = center + rootLeftAngle;
    const rootRightAbsNext = nextCenter + nextRightRootAngle;
    for (let i = 1; i < rootArcPoints; i++) {
      const a = rootLeftAbs + ((rootRightAbsNext - rootLeftAbs) * i) / rootArcPoints;
      points.push(polarToXY(rootRadius, a));
    }
  }

  return { points, info: { pitchRadius, baseRadius, outsideRadius, rootRadius } };
}

function polarToXY(r: number, angle: number): [number, number] {
  return [r * Math.cos(angle), r * Math.sin(angle)];
}

// Extrudes `profile2d` from z=0 to z=height while uniformly rotating the
// cross-section by `totalTwistRad` — a true twisted prism, unlike
// extrudeHelical (see file header). Verified: z-range comes out [0,
// height] exactly, and the top face is rotated by exactly totalTwistRad
// relative to the bottom face.
function twistedExtrude(profile2d: unknown, height: number, totalTwistRad: number): Geom3 {
  const { slice } = extrusions;
  const { geom2 } = geometries;
  const { mat4 } = maths;

  const segments = totalTwistRad === 0 ? 2 : Math.max(8, Math.ceil((Math.abs(totalTwistRad) * 180) / Math.PI / 3));

  const callback = (progress: number) => {
    const baseSlice = slice.fromSides(geom2.toSides(profile2d as never));
    const z = progress * height;
    const angle = progress * totalTwistRad;
    const rotation = mat4.fromZRotation(mat4.create(), angle);
    const translation = mat4.fromTranslation(mat4.create(), [0, 0, z]);
    const combined = mat4.multiply(mat4.create(), translation, rotation);
    return slice.transform(combined, baseSlice);
  };

  return extrusions.extrudeFromSlices({ numberOfSlices: segments, callback }, profile2d as never);
}

export function generate(params: GearParams): Geom3 {
  const { points, info } = buildGearOutline(params);
  const profile = primitives.polygon({ points });

  const totalTwistRad =
    params.helixAngleDeg === 0
      ? 0
      : (params.faceWidth * Math.tan((params.helixAngleDeg * Math.PI) / 180)) / info.pitchRadius;

  let body = twistedExtrude(profile, params.faceWidth, totalTwistRad);

  if (params.boreDiameter > 0) {
    // primitives.cylinder is centered at its `center` option (default
    // origin) — NOT [0, height] like extrudeLinear/twistedExtrude output.
    // Center it on the body's own [0, faceWidth] span, with a little
    // overshoot on each end so the subtraction cuts fully through.
    const overshoot = params.faceWidth * 0.1;
    const bore = primitives.cylinder({
      radius: params.boreDiameter / 2,
      height: params.faceWidth + overshoot,
      center: [0, 0, params.faceWidth / 2],
      segments: 32
    });
    body = booleans.subtract(body, bore);
  }

  return body;
}
