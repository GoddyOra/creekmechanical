// Synthesizes a HealthReport from a parsed occt-import-js result: assembly
// structure (walking the validated root tree), per-mesh geometry health
// (mesh-analysis.ts), and declared units (units-scan.ts) — then generates
// plain-language findings, each paired with a "we can fix this for you"
// flag when it represents a real problem, per the Stage 6 doc.
import type { CadFormat, OcctNode, OcctReadResult } from '../viewer/occt-types';
import { analyzeMesh, type MeshHealth } from './mesh-analysis';
import { scanDeclaredUnits, type UnitsScanResult } from './units-scan';

export interface AssemblyInfo {
  partCount: number;
  maxNestingDepth: number;
  componentNames: string[];
  isEmpty: boolean;
}

export interface Finding {
  severity: 'ok' | 'warning';
  text: string;
  cta: boolean;
}

export interface ReportTotals {
  meshCount: number;
  triangleCount: number;
  faceCount: number;
  boundaryEdges: number;
  nonManifoldEdges: number;
  windingFlips: number;
  degenerateTriangles: number;
  sliverTriangles: number;
}

export interface HealthReport {
  fileName: string;
  format: CadFormat;
  units: UnitsScanResult;
  assembly: AssemblyInfo;
  meshHealth: MeshHealth[];
  totals: ReportTotals;
  findings: Finding[];
}

function walkAssembly(node: OcctNode, depth = 0): { maxDepth: number; partCount: number; names: string[] } {
  let maxDepth = depth;
  let partCount = node.meshes ? node.meshes.length : 0;
  const names: string[] = node.name ? [node.name] : [];
  for (const child of node.children ?? []) {
    const r = walkAssembly(child, depth + 1);
    maxDepth = Math.max(maxDepth, r.maxDepth);
    partCount += r.partCount;
    names.push(...r.names);
  }
  return { maxDepth, partCount, names };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function buildFindings(units: UnitsScanResult, assembly: AssemblyInfo, totals: ReportTotals): Finding[] {
  const findings: Finding[] = [];

  if (assembly.isEmpty) {
    findings.push({
      severity: 'warning',
      cta: false,
      text: 'This file produced no visible geometry. If it is a top-level assembly file, it may reference other part files by external link — this tool only reads the single file you upload, so linked files aren’t included. Try uploading the individual part files instead.'
    });
    return findings;
  }

  if (units.applicable) {
    if (units.declaredUnits.length === 0) {
      findings.push({ severity: 'warning', cta: false, text: 'Could not determine the declared length unit for this file.' });
    } else if (!units.consistent) {
      findings.push({
        severity: 'warning',
        cta: true,
        text: `This file declares more than one length unit internally (${units.declaredUnits.join(', ')}). Mixed unit declarations are a common cause of 10×/1000× scale errors when the file is reopened elsewhere.`
      });
    } else {
      findings.push({ severity: 'ok', cta: false, text: `Declared unit: ${units.declaredUnits[0]}, consistent throughout the file.` });
    }
  } else if (units.note) {
    findings.push({ severity: 'ok', cta: false, text: units.note });
  }

  if (totals.boundaryEdges > 0) {
    findings.push({
      severity: 'warning',
      cta: true,
      text: `${plural(totals.boundaryEdges, 'open boundary edge')} detected across ${plural(totals.meshCount, 'solid')}. If these are meant to be closed solids, this usually means they aren’t fully watertight — a common cause of failures in Boolean operations, 3D-printing slicers, and CAM toolpath generation. (Intentionally open surface/sheet geometry will always show boundary edges — that’s normal for that kind of model.)`
    });
  } else {
    findings.push({ severity: 'ok', cta: false, text: 'No open boundary edges detected — all checked geometry appears to be fully closed (watertight).' });
  }

  if (totals.nonManifoldEdges > 0) {
    findings.push({
      severity: 'warning',
      cta: true,
      text: `${plural(totals.nonManifoldEdges, 'non-manifold edge')} detected — edges shared by three or more faces. This is a common cause of import failures or "requires repair" warnings in most CAD and CAM software.`
    });
  } else {
    findings.push({ severity: 'ok', cta: false, text: 'No non-manifold edges detected.' });
  }

  if (totals.windingFlips > 0) {
    findings.push({
      severity: 'warning',
      cta: true,
      text: `${plural(totals.windingFlips, 'inconsistent face-orientation edge')} detected — neighboring faces don’t agree on which way is "outward." Can cause inverted/black faces, incorrect Boolean results, or shading artifacts in some software.`
    });
  } else {
    findings.push({ severity: 'ok', cta: false, text: 'Face orientation is consistent across all checked geometry.' });
  }

  const badTriangles = totals.degenerateTriangles + totals.sliverTriangles;
  if (badTriangles > 0) {
    findings.push({
      severity: 'warning',
      cta: true,
      text: `${plural(totals.degenerateTriangles, 'degenerate triangle')} and ${plural(totals.sliverTriangles, 'sliver triangle')} detected in the tessellation. Usually harmless for viewing, but can cause errors in FEA meshing or 3D-printing slicers.`
    });
  } else {
    findings.push({ severity: 'ok', cta: false, text: 'No degenerate or sliver triangles detected in the tessellation.' });
  }

  findings.push({
    severity: 'ok',
    cta: false,
    text: `${plural(assembly.partCount, 'solid')} across ${plural(assembly.maxNestingDepth, 'level')} of assembly nesting; ${plural(totals.faceCount, 'reported face group')}, ${totals.triangleCount.toLocaleString()} triangles in the tessellated mesh.`
  });

  return findings;
}

export function buildHealthReport(fileName: string, format: CadFormat, result: OcctReadResult, rawText: string): HealthReport {
  const units = scanDeclaredUnits(rawText, format);
  const walk = walkAssembly(result.root);
  const isEmpty = result.meshes.length === 0;

  const assembly: AssemblyInfo = {
    partCount: walk.partCount,
    maxNestingDepth: walk.maxDepth,
    componentNames: walk.names,
    isEmpty
  };

  const meshHealth = result.meshes.map(analyzeMesh);
  const totals: ReportTotals = meshHealth.reduce(
    (acc, m) => {
      acc.triangleCount += m.triangleCount;
      acc.boundaryEdges += m.boundaryEdges;
      acc.nonManifoldEdges += m.nonManifoldEdges;
      acc.windingFlips += m.windingFlips;
      acc.degenerateTriangles += m.degenerateTriangles;
      acc.sliverTriangles += m.sliverTriangles;
      return acc;
    },
    {
      meshCount: meshHealth.length,
      triangleCount: 0,
      faceCount: result.meshes.reduce((sum, m) => sum + (m.brep_faces?.length ?? 0), 0),
      boundaryEdges: 0,
      nonManifoldEdges: 0,
      windingFlips: 0,
      degenerateTriangles: 0,
      sliverTriangles: 0
    }
  );

  const findings = buildFindings(units, assembly, totals);

  return { fileName, format, units, assembly, meshHealth, totals, findings };
}

export function formatReportAsText(report: HealthReport): string {
  const lines: string[] = [];
  lines.push('Creek Mechanical — CAD Compatibility Report');
  lines.push(`File: ${report.fileName}`);
  lines.push(`Format: ${report.format.toUpperCase()}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Findings:');
  for (const f of report.findings) {
    lines.push(`- [${f.severity.toUpperCase()}] ${f.text}`);
  }
  lines.push('');
  lines.push('Totals:');
  lines.push(`  Solids/parts: ${report.assembly.partCount}`);
  lines.push(`  Assembly nesting depth: ${report.assembly.maxNestingDepth}`);
  lines.push(`  Triangles: ${report.totals.triangleCount}`);
  lines.push(`  Reported face groups: ${report.totals.faceCount}`);
  lines.push(`  Open boundary edges: ${report.totals.boundaryEdges}`);
  lines.push(`  Non-manifold edges: ${report.totals.nonManifoldEdges}`);
  lines.push(`  Orientation inconsistencies: ${report.totals.windingFlips}`);
  lines.push(`  Degenerate triangles: ${report.totals.degenerateTriangles}`);
  lines.push(`  Sliver triangles: ${report.totals.sliverTriangles}`);
  lines.push('');
  lines.push('This report reflects the mesh-level checks this browser-based tool can perform.');
  lines.push('It is not a substitute for a full CAD-kernel repair analysis. See creekmechanical.com/terms/.');
  return lines.join('\n');
}
