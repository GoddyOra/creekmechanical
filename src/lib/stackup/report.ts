import type { Contributor, LinearStackResult, MonteCarloResult, CapabilityResult } from './math';

export function formatStackUpReport({
  contributors,
  linear,
  monteCarlo,
  capability,
  spec
}: {
  contributors: Contributor[];
  linear: LinearStackResult;
  monteCarlo: MonteCarloResult;
  capability: CapabilityResult;
  spec: { usl: number; lsl: number } | null;
}): string {
  const lines: string[] = [];
  lines.push('Creek Mechanical — Tolerance Stack-Up Report');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Contributors:');
  for (const c of contributors) {
    lines.push(`  ${c.direction > 0 ? '+' : '-'} ${c.name}: ${c.nominal} ± ${c.tolerance}`);
  }
  lines.push('');
  lines.push(`Nominal stack: ${linear.nominal.toPrecision(6)}`);
  lines.push(`Worst-case: ${linear.nominal.toPrecision(6)} ± ${linear.worstCase.toPrecision(4)}  →  [${(linear.nominal - linear.worstCase).toPrecision(6)}, ${(linear.nominal + linear.worstCase).toPrecision(6)}]`);
  lines.push(`RSS (statistical): ${linear.nominal.toPrecision(6)} ± ${linear.rss.toPrecision(4)}  →  [${(linear.nominal - linear.rss).toPrecision(6)}, ${(linear.nominal + linear.rss).toPrecision(6)}]`);
  lines.push('');
  lines.push('Monte Carlo simulation:');
  lines.push(`  Mean: ${monteCarlo.mean.toPrecision(6)}`);
  lines.push(`  Std deviation: ${monteCarlo.stddev.toPrecision(4)}`);
  lines.push(`  Observed range: [${monteCarlo.min.toPrecision(6)}, ${monteCarlo.max.toPrecision(6)}]`);
  if (spec) {
    lines.push(`  Spec limits: [${spec.lsl}, ${spec.usl}]`);
    lines.push(`  Fraction out of spec: ${((monteCarlo.fractionOutOfSpec ?? 0) * 100).toPrecision(3)}%`);
  }
  lines.push('');
  if (capability.cp !== null && capability.cpk !== null) {
    lines.push(`Process capability: Cp = ${capability.cp.toPrecision(4)}, Cpk = ${capability.cpk.toPrecision(4)}`);
  }
  lines.push('');
  lines.push('This report reflects a client-side simulation using the tolerances and');
  lines.push('assumptions entered above (each contributor sampled as normal, sd = tolerance/3).');
  lines.push('It is not a substitute for a full statistical tolerance analysis of the real');
  lines.push('process. See creekmechanical.com/terms/.');
  return lines.join('\n');
}
