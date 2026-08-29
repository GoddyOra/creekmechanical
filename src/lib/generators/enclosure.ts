// Open-top box enclosure, optionally with a simple flat lid. The lid (when
// included) is a plain flat panel positioned beside the body in the same
// export — a friction-fit/interlocking lid lip is a reasonable future
// enhancement, not attempted here; the UI copy says so.
import { booleans, primitives, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/geom3/type';

export interface EnclosureParams {
  width: number;
  depth: number;
  height: number;
  wallThickness: number;
  includeLid: number; // 0 = no, 1 = yes (select field, mirrors bearingType/endCondition pattern)
}

export function generate(params: EnclosureParams): Geom3 {
  const { width, depth, height, wallThickness } = params;

  const outer = primitives.cuboid({ size: [width, depth, height], center: [width / 2, depth / 2, height / 2] });

  const cavityWidth = Math.max(width - 2 * wallThickness, 0.01);
  const cavityDepth = Math.max(depth - 2 * wallThickness, 0.01);
  const cavityHeight = Math.max(height - wallThickness, 0.01);
  const overshoot = wallThickness * 0.5;
  const cavity = primitives.cuboid({
    size: [cavityWidth, cavityDepth, cavityHeight + overshoot],
    // Floor sits at z=wallThickness; cavity extends past the box top
    // (+overshoot) so the subtraction cleanly opens the top face.
    center: [width / 2, depth / 2, wallThickness + (cavityHeight + overshoot) / 2]
  });

  let body: Geom3 = booleans.subtract(outer, cavity);

  if (params.includeLid === 1) {
    const lid = primitives.cuboid({
      size: [width, depth, wallThickness],
      center: [width / 2, depth / 2, wallThickness / 2]
    });
    const lidBesideBody = transforms.translate([width * 1.2, 0, 0], lid);
    body = booleans.union(body, lidBesideBody);
  }

  return body;
}
