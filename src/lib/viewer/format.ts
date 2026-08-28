import type { CadFormat } from './occt-types';

export function detectFormat(fileName: string): CadFormat | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'step':
    case 'stp':
      return 'step';
    case 'iges':
    case 'igs':
      return 'iges';
    case 'brep':
      return 'brep';
    default:
      return null;
  }
}
