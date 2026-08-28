declare module 'occt-import-js' {
  import type { OcctModule } from './occt-types';

  interface OcctModuleOverrides {
    locateFile?: (path: string) => string;
  }

  export default function occtimportjs(overrides?: OcctModuleOverrides): Promise<OcctModule>;
}
