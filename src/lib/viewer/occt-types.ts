// occt-import-js ships no TypeScript types. This is the subset of its
// result shape this project actually uses, confirmed against the installed
// package by running real STEP/IGES/BREP test fixtures through it directly
// with Node (see Stage 5 plan verification notes) — not just the README.

export interface OcctMesh {
  name: string;
  color?: [number, number, number];
  brep_faces?: { first: number; last: number; color: [number, number, number] | null }[];
  attributes: {
    position: { array: number[] };
    normal?: { array: number[] };
  };
  index: { array: number[] };
}

export interface OcctNode {
  name: string;
  meshes: number[];
  children: OcctNode[];
}

export interface OcctReadResult {
  success: boolean;
  root: OcctNode;
  meshes: OcctMesh[];
}

export interface OcctReadParams {
  linearUnit?: 'millimeter' | 'centimeter' | 'meter' | 'inch' | 'foot';
  linearDeflectionType?: 'bounding_box_ratio' | 'absolute_value';
  linearDeflection?: number;
  angularDeflection?: number;
}

export interface OcctModule {
  ReadStepFile(content: Uint8Array, params: OcctReadParams | null): OcctReadResult;
  ReadIgesFile(content: Uint8Array, params: OcctReadParams | null): OcctReadResult;
  ReadBrepFile(content: Uint8Array, params: OcctReadParams | null): OcctReadResult;
}

export type CadFormat = 'step' | 'iges' | 'brep';
