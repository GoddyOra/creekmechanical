// Landing-page metadata for the viewer/converter tool. All pages render the
// same <Viewer> engine (accepts any supported format regardless of which
// page you're on — format is detected from the selected file's own
// extension) but each targets its own keyword with dedicated copy, per the
// Stage 5 doc: "Ship dedicated landing pages per conversion pair."

export type ExportFormat = 'stl' | 'obj' | '3mf';

export interface ViewerToolDef {
  slug: string;
  title: string;
  shortDescription: string;
  intro: string;
  acceptExtensions: string; // for <input accept="...">
  highlightExport?: ExportFormat;
}

export const viewerTools: ViewerToolDef[] = [
  {
    slug: 'step-iges-viewer',
    title: 'STEP & IGES 3D Viewer',
    shortDescription: 'View STEP, IGES, and BREP CAD files directly in your browser, then export to STL, OBJ, or 3MF.',
    intro:
      'Open a STEP, IGES, or BREP file to view it in 3D — orbit, section, measure, and check dimensions — then export to STL, OBJ, or 3MF. Nothing is uploaded; the file never leaves your browser.',
    acceptExtensions: '.step,.stp,.iges,.igs,.brep'
  },
  {
    slug: 'step-to-stl',
    title: 'STEP to STL Converter',
    shortDescription: 'Convert STEP files to STL directly in your browser — no upload, no signup, no file size cap.',
    intro:
      'Drop in a STEP (.step/.stp) file to view it in 3D and export it as STL for 3D printing or CAM. Processed entirely in your browser — the file is never uploaded anywhere.',
    acceptExtensions: '.step,.stp',
    highlightExport: 'stl'
  },
  {
    slug: 'iges-to-stl',
    title: 'IGES to STL Converter',
    shortDescription: 'Convert IGES files to STL directly in your browser — no upload, no signup, no file size cap.',
    intro:
      'Drop in an IGES (.iges/.igs) file to view it in 3D and export it as STL for 3D printing or CAM. Processed entirely in your browser — the file is never uploaded anywhere.',
    acceptExtensions: '.iges,.igs',
    highlightExport: 'stl'
  },
  {
    slug: 'step-to-obj',
    title: 'STEP to OBJ Converter',
    shortDescription: 'Convert STEP files to OBJ directly in your browser — no upload, no signup, no file size cap.',
    intro:
      'Drop in a STEP (.step/.stp) file to view it in 3D and export it as OBJ for use in modeling or rendering software. Processed entirely in your browser — the file is never uploaded anywhere.',
    acceptExtensions: '.step,.stp',
    highlightExport: 'obj'
  },
  {
    slug: 'brep-to-stl',
    title: 'BREP to STL Converter',
    shortDescription: 'Convert OpenCascade BREP files to STL directly in your browser — no upload, no signup, no file size cap.',
    intro:
      'Drop in a BREP (.brep) file to view it in 3D and export it as STL for 3D printing or CAM. Processed entirely in your browser — the file is never uploaded anywhere.',
    acceptExtensions: '.brep',
    highlightExport: 'stl'
  }
];

export function getViewerTool(slug: string): ViewerToolDef | undefined {
  return viewerTools.find((t) => t.slug === slug);
}
