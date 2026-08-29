import { booleans, primitives } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/geom3/type';
import { boltCircleHoles } from './jscad-utils';

export interface FlangeParams {
  outerDiameter: number;
  thickness: number;
  boreDiameter: number;
  boltCircleDiameter: number;
  boltCount: number;
  boltHoleDiameter: number;
}

export function generate(params: FlangeParams): Geom3 {
  // primitives.cylinder is centered at its `center` option — center the
  // disc on [0, thickness] to match extrudeLinear-based generators' span,
  // so all generators place their part consistently above the Z=0 plane.
  const centerZ = params.thickness / 2;
  let body: Geom3 = primitives.cylinder({
    radius: params.outerDiameter / 2,
    height: params.thickness,
    center: [0, 0, centerZ],
    segments: 64
  });

  const overshoot = params.thickness * 0.1;
  const cutHeight = params.thickness + overshoot;

  if (params.boreDiameter > 0) {
    const bore = primitives.cylinder({ radius: params.boreDiameter / 2, height: cutHeight, center: [0, 0, centerZ], segments: 48 });
    body = booleans.subtract(body, bore);
  }

  if (params.boltCount > 0 && params.boltHoleDiameter > 0) {
    const holes = boltCircleHoles({
      count: params.boltCount,
      circleDiameter: params.boltCircleDiameter,
      holeDiameter: params.boltHoleDiameter,
      height: cutHeight,
      centerZ
    });
    body = booleans.subtract(body, holes);
  }

  return body;
}
