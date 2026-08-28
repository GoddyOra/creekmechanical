// Runs entirely off the main thread so large files never freeze the tab.
// Only ever spawned after the user selects a file — see Viewer.astro.
import occtimportjs from 'occt-import-js';
import type { CadFormat, OcctModule, OcctMesh } from './occt-types';

export interface ParseRequest {
  fileName: string;
  buffer: ArrayBuffer;
  format: CadFormat;
}

export type ParseResponse =
  | { type: 'result'; meshes: OcctMesh[] }
  | { type: 'error'; message: string };

let modulePromise: Promise<OcctModule> | null = null;

function getModule(): Promise<OcctModule> {
  if (!modulePromise) {
    modulePromise = occtimportjs({
      locateFile: () => '/wasm/occt-import-js.wasm'
    });
  }
  return modulePromise;
}

self.onmessage = async (event: MessageEvent<ParseRequest>) => {
  const { buffer, format } = event.data;
  try {
    const occt = await getModule();
    const content = new Uint8Array(buffer);
    const params = {
      linearUnit: 'millimeter' as const,
      linearDeflectionType: 'bounding_box_ratio' as const,
      linearDeflection: 0.003,
      angularDeflection: 0.5
    };

    const result =
      format === 'step'
        ? occt.ReadStepFile(content, params)
        : format === 'iges'
          ? occt.ReadIgesFile(content, params)
          : occt.ReadBrepFile(content, params);

    if (!result.success) {
      const response: ParseResponse = { type: 'error', message: 'The file could not be parsed — it may be corrupt or an unsupported variant of the format.' };
      self.postMessage(response);
      return;
    }

    const response: ParseResponse = { type: 'result', meshes: result.meshes };
    self.postMessage(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error while parsing the file.';
    const response: ParseResponse = { type: 'error', message };
    self.postMessage(response);
  }
};
