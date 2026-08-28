// Builds a three.js Group from occt-import-js's mesh JSON, mirroring the
// library's own official three.js example (examples/three_viewer.html) —
// same attribute wiring and per-face (brep_faces) material grouping.
import * as THREE from 'three';
import type { OcctMesh } from './occt-types';

const DEFAULT_COLOR = new THREE.Color(0x8fa8c2);

function buildMesh(meshData: OcctMesh): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.attributes.position.array, 3));
  if (meshData.attributes.normal) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.attributes.normal.array, 3));
  }

  const index = Uint32Array.from(meshData.index.array);
  geometry.setIndex(new THREE.BufferAttribute(index, 1));

  if (!meshData.attributes.normal) {
    geometry.computeVertexNormals();
  }

  const baseColor = meshData.color
    ? new THREE.Color(meshData.color[0], meshData.color[1], meshData.color[2])
    : DEFAULT_COLOR;

  const materialFor = (color: THREE.Color) =>
    new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.55, side: THREE.DoubleSide });

  const faceGroups = meshData.brep_faces ?? [];
  const materials: THREE.Material[] = [materialFor(baseColor)];

  if (faceGroups.length > 0) {
    for (const face of faceGroups) {
      const color = face.color ? new THREE.Color(face.color[0], face.color[1], face.color[2]) : baseColor;
      materials.push(materialFor(color));
    }

    const triangleCount = index.length / 3;
    let triangleIndex = 0;
    let faceIndex = 0;
    while (triangleIndex < triangleCount) {
      const first = triangleIndex;
      let last: number;
      let materialIndex: number;
      if (faceIndex >= faceGroups.length) {
        last = triangleCount;
        materialIndex = 0;
      } else if (triangleIndex < faceGroups[faceIndex].first) {
        last = faceGroups[faceIndex].first;
        materialIndex = 0;
      } else {
        last = faceGroups[faceIndex].last + 1;
        materialIndex = faceIndex + 1;
        faceIndex++;
      }
      geometry.addGroup(first * 3, (last - first) * 3, materialIndex);
      triangleIndex = last;
    }
  }

  const mesh = new THREE.Mesh(geometry, materials.length > 1 ? materials : materials[0]);
  mesh.name = meshData.name;
  return mesh;
}

export function buildGroupFromMeshes(meshes: OcctMesh[]): THREE.Group {
  const group = new THREE.Group();
  for (const meshData of meshes) {
    group.add(buildMesh(meshData));
  }
  return group;
}

export interface BoundingBoxMm {
  x: number;
  y: number;
  z: number;
}

// occt-import-js was configured with linearUnit: 'millimeter' (see
// parse-worker.ts), so geometry coordinates — and this bounding box — are
// already in millimeters.
export function getBoundingBoxMm(object: THREE.Object3D): BoundingBoxMm {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  return { x: size.x, y: size.y, z: size.z };
}

export function getBoundingBox(object: THREE.Object3D): THREE.Box3 {
  return new THREE.Box3().setFromObject(object);
}
