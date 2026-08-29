// L-bracket (legLength2 > 0) or flat mounting plate (legLength2 = 0)
// generator. Profile is drawn directly in the XY plane — the plane
// extrudeLinear naturally extrudes from along Z — so no body rotation is
// needed: leg1 runs along X, leg2 along Y, and `width` becomes the Z
// extrusion depth. Only the mounting holes need their own rotation, since
// each is drilled through a leg's thickness (Y-axis for leg1, X-axis for
// leg2), not along the cylinder's default Z axis.
import { booleans, extrusions, primitives, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/geom3/type';

export interface BracketParams {
  legLength1: number;
  legLength2: number;
  width: number;
  thickness: number;
  holeDiameter: number;
  holeInset: number;
}

function lBracketProfile(legLength1: number, legLength2: number, thickness: number): [number, number][] {
  return [
    [0, 0],
    [legLength1, 0],
    [legLength1, thickness],
    [thickness, thickness],
    [thickness, legLength2],
    [0, legLength2]
  ];
}

function flatPlateProfile(length: number, thickness: number): [number, number][] {
  return [
    [0, 0],
    [length, 0],
    [length, thickness],
    [0, thickness]
  ];
}

export function generate(params: BracketParams): Geom3 {
  const isFlat = params.legLength2 <= 0;
  const profilePoints = isFlat
    ? flatPlateProfile(params.legLength1, params.thickness)
    : lBracketProfile(params.legLength1, params.legLength2, params.thickness);

  const profile2d = primitives.polygon({ points: profilePoints });
  let body: Geom3 = extrusions.extrudeLinear({ height: params.width }, profile2d);

  if (params.holeDiameter > 0) {
    const overshoot = params.thickness * 0.1;
    const holeHeight = params.thickness + overshoot;
    const halfWidth = params.width / 2;

    // A cylinder's default axis is Z; rotating 90° about X points it along
    // Y (for a hole through leg1's Y-thickness), and 90° about Y points it
    // along X (for a hole through leg2's X-thickness) — the cylinder is
    // symmetric about its axis, so the rotation's sign doesn't matter,
    // only that it lands on the right axis. Rotation is about the world
    // origin, so the cylinder must be built centered at the origin and
    // only *then* translated to its final position — rotating an
    // already-offset cylinder would swing its position around the
    // origin, not just reorient it in place.
    const holeThroughY = (x: number, z: number) => {
      const cyl = primitives.cylinder({ radius: params.holeDiameter / 2, height: holeHeight, segments: 32 });
      return transforms.translate([x, params.thickness / 2, z], transforms.rotateX(Math.PI / 2, cyl));
    };
    const holeThroughX = (y: number, z: number) => {
      const cyl = primitives.cylinder({ radius: params.holeDiameter / 2, height: holeHeight, segments: 32 });
      return transforms.translate([params.thickness / 2, y, z], transforms.rotateY(Math.PI / 2, cyl));
    };

    const holes: Geom3[] = [];
    if (isFlat) {
      holes.push(holeThroughY(params.holeInset, halfWidth));
      holes.push(holeThroughY(params.legLength1 - params.holeInset, halfWidth));
    } else {
      holes.push(holeThroughY(params.legLength1 - params.holeInset, halfWidth));
      holes.push(holeThroughX(params.legLength2 - params.holeInset, halfWidth));
    }
    body = booleans.subtract(body, booleans.union(holes));
  }

  return body;
}
