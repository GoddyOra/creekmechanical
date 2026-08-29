// Shared JSCAD helpers for all Stage 7 generators.
//
// CRITICAL: a geom3's raw `.polygons` does NOT reflect pending
// translate/rotate transforms (they live in a separate `.transforms`
// matrix and are only applied by geometries.geom3.toPolygons()). Confirmed
// empirically before writing any generator code: reading `.polygons`
// directly after a bare translate() silently returns untransformed local
// coordinates. Boolean ops (union/subtract) DO bake the transform into
// their result, so this bug is easy to miss in testing if your last
// operation happens to be a boolean — always use toPolygons().
import * as THREE from 'three';
import { booleans, geometries, primitives } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/geom3/type';

export function geom3ToThreeGeometry(geom: Geom3): THREE.BufferGeometry {
  const polygons = geometries.geom3.toPolygons(geom);
  const positions: number[] = [];

  for (const polygon of polygons) {
    const verts = polygon.vertices;
    // Fan triangulation from vertex 0 — valid because JSCAD's CSG output
    // faces are always convex planar polygons.
    for (let i = 1; i < verts.length - 1; i++) {
      positions.push(verts[0][0], verts[0][1], verts[0][2]);
      positions.push(verts[i][0], verts[i][1], verts[i][2]);
      positions.push(verts[i + 1][0], verts[i + 1][1], verts[i + 1][2]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// A union of `count` cylinders evenly spaced around a circle of the given
// diameter, for subtracting bolt-hole patterns out of a flange/bracket/
// enclosure base shape. `height` should exceed the base shape's thickness
// so the subtraction cuts all the way through; `centerZ` positions each
// cylinder the same way primitives.cylinder's own `center` option does
// (default 0, i.e. spanning [-height/2, height/2]) — pass e.g.
// `thickness/2` to match a body extruded from extrudeLinear, which spans
// [0, thickness] rather than being origin-centered.
export function boltCircleHoles({
  count,
  circleDiameter,
  holeDiameter,
  height,
  centerZ = 0
}: {
  count: number;
  circleDiameter: number;
  holeDiameter: number;
  height: number;
  centerZ?: number;
}): Geom3 {
  const radius = circleDiameter / 2;
  const holes: Geom3[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    const hole = primitives.cylinder({
      radius: holeDiameter / 2,
      height,
      center: [radius * Math.cos(angle), radius * Math.sin(angle), centerZ],
      segments: 24
    });
    holes.push(hole);
  }
  return booleans.union(holes);
}
