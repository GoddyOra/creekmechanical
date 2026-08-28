// Hand-rolled 3MF export — three.js ships STL/OBJ exporters but no 3MF
// exporter. 3MF is an OPC package (ZIP + XML): [Content_Types].xml,
// _rels/.rels, and 3D/3dmodel.model describing the mesh. Geometry
// coordinates are already in millimeters (see mesh-utils.ts), matching the
// <model unit="millimeter"> declaration below.
import * as THREE from 'three';
import { createZipStore } from './zip';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>
`;

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
`;

function num(v: number): string {
  return v.toFixed(6);
}

function buildModelXml(group: THREE.Object3D): string {
  const vertexLines: string[] = [];
  const triangleLines: string[] = [];
  let vertexOffset = 0;

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geometry = child.geometry;
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    if (!position || !index) {
      throw new Error('3MF export requires an indexed geometry with a position attribute.');
    }

    for (let i = 0; i < position.count; i++) {
      vertexLines.push(
        `<vertex x="${num(position.getX(i))}" y="${num(position.getY(i))}" z="${num(position.getZ(i))}"/>`
      );
    }

    for (let i = 0; i < index.count; i += 3) {
      const v1 = index.getX(i) + vertexOffset;
      const v2 = index.getX(i + 1) + vertexOffset;
      const v3 = index.getX(i + 2) + vertexOffset;
      triangleLines.push(`<triangle v1="${v1}" v2="${v2}" v3="${v3}"/>`);
    }

    vertexOffset += position.count;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${vertexLines.join('\n')}
        </vertices>
        <triangles>
${triangleLines.join('\n')}
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1"/>
  </build>
</model>
`;
}

export function exportGroupTo3mf(group: THREE.Object3D): Uint8Array {
  const encoder = new TextEncoder();
  const modelXml = buildModelXml(group);

  return createZipStore([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: encoder.encode(RELS) },
    { name: '3D/3dmodel.model', data: encoder.encode(modelXml) }
  ]);
}
