// Mesh-level geometry health checks. Validated against real geometry before
// this file was written (see Stage 6 plan) — critically, against occt-import-js's
// actual output shape, which does NOT share vertices between adjacent faces
// (confirmed: a 6-face cube comes back with 24 vertices, not 8). A naive
// edge-adjacency check keyed by raw vertex index would misreport every
// inter-face boundary as "open" on every valid watertight solid. Vertices
// must be welded by position first — see weldVertices().
import type { OcctMesh } from '../viewer/occt-types';

export interface MeshHealth {
  meshName: string;
  triangleCount: number;
  weldedVertexCount: number;
  boundaryEdges: number;
  nonManifoldEdges: number;
  windingFlips: number;
  degenerateTriangles: number;
  sliverTriangles: number;
}

// Welds vertices that are within `tolerance` of each other (by rounding to
// a grid of that spacing) into a shared canonical index. Returns an array
// mapping each original vertex index to its canonical (welded) index.
export function weldVertices(positions: number[] | Float32Array, tolerance: number): Int32Array {
  const vertexCount = positions.length / 3;
  const canonical = new Int32Array(vertexCount);
  const map = new Map<string, number>();
  const scale = 1 / tolerance;
  for (let i = 0; i < vertexCount; i++) {
    const x = Math.round(positions[i * 3] * scale);
    const y = Math.round(positions[i * 3 + 1] * scale);
    const z = Math.round(positions[i * 3 + 2] * scale);
    const key = `${x}_${y}_${z}`;
    const existing = map.get(key);
    if (existing !== undefined) {
      canonical[i] = existing;
    } else {
      map.set(key, i);
      canonical[i] = i;
    }
  }
  return canonical;
}

export function boundingBoxDiagonal(positions: number[] | Float32Array): number {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2 + (maxZ - minZ) ** 2);
}

// Scale-invariant triangle quality metric: 1.0 for equilateral, →0 for
// slivers. Standard mesh-quality measure (used e.g. in FEM meshing QA).
function triangleQuality(a: number, b: number, c: number, area: number): number {
  const sumSq = a * a + b * b + c * c;
  if (sumSq < 1e-18) return 0;
  return (4 * Math.sqrt(3) * area) / sumSq;
}

const SLIVER_QUALITY_THRESHOLD = 0.05;
const DEGENERATE_AREA_THRESHOLD = 1e-9;

export function analyzeMesh(mesh: OcctMesh): MeshHealth {
  const positions = mesh.attributes.position.array;
  const indices = mesh.index.array;
  const triangleCount = indices.length / 3;

  const diag = boundingBoxDiagonal(positions);
  const tolerance = Math.max(1e-6, diag * 1e-5);
  const canonical = weldVertices(positions, tolerance);

  const undirectedCount = new Map<string, number>();
  const directedCount = new Map<string, number>();
  let degenerateTriangles = 0;
  let sliverTriangles = 0;

  const edgeKey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);

  for (let t = 0; t < triangleCount; t++) {
    const oi0 = indices[t * 3];
    const oi1 = indices[t * 3 + 1];
    const oi2 = indices[t * 3 + 2];
    const w0 = canonical[oi0];
    const w1 = canonical[oi1];
    const w2 = canonical[oi2];

    for (const [a, b] of [[w0, w1], [w1, w2], [w2, w0]] as const) {
      undirectedCount.set(edgeKey(a, b), (undirectedCount.get(edgeKey(a, b)) ?? 0) + 1);
      const dKey = `${a}->${b}`;
      directedCount.set(dKey, (directedCount.get(dKey) ?? 0) + 1);
    }

    const p0x = positions[oi0 * 3], p0y = positions[oi0 * 3 + 1], p0z = positions[oi0 * 3 + 2];
    const p1x = positions[oi1 * 3], p1y = positions[oi1 * 3 + 1], p1z = positions[oi1 * 3 + 2];
    const p2x = positions[oi2 * 3], p2y = positions[oi2 * 3 + 1], p2z = positions[oi2 * 3 + 2];

    const e1x = p1x - p0x, e1y = p1y - p0y, e1z = p1z - p0z;
    const e2x = p2x - p0x, e2y = p2y - p0y, e2z = p2z - p0z;
    const crossX = e1y * e2z - e1z * e2y;
    const crossY = e1z * e2x - e1x * e2z;
    const crossZ = e1x * e2y - e1y * e2x;
    const area = 0.5 * Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);

    if (area < DEGENERATE_AREA_THRESHOLD) {
      degenerateTriangles++;
      continue;
    }

    const lenA = Math.hypot(e1x, e1y, e1z);
    const e3x = p2x - p1x, e3y = p2y - p1y, e3z = p2z - p1z;
    const lenB = Math.hypot(e3x, e3y, e3z);
    const lenC = Math.hypot(e2x, e2y, e2z);
    if (triangleQuality(lenA, lenB, lenC, area) < SLIVER_QUALITY_THRESHOLD) {
      sliverTriangles++;
    }
  }

  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  for (const count of undirectedCount.values()) {
    if (count === 1) boundaryEdges++;
    else if (count > 2) nonManifoldEdges++;
  }

  let windingFlips = 0;
  for (const count of directedCount.values()) {
    if (count > 1) windingFlips += count - 1;
  }

  return {
    meshName: mesh.name,
    triangleCount,
    weldedVertexCount: new Set(canonical).size,
    boundaryEdges,
    nonManifoldEdges,
    windingFlips,
    degenerateTriangles,
    sliverTriangles
  };
}
