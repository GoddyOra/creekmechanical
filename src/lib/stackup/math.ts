// Tolerance stack-up math: linear worst-case/RSS, Monte Carlo simulation,
// and process capability. All verified numerically before this file was
// written (see Stage 8 notes) — in particular, RSS tolerance and the
// Monte Carlo standard deviation (×3, since each contributor is sampled
// with sd = tolerance/3) agree to within ~0.1% for independent normally
// distributed contributors, which is the expected cross-check between the
// two methods and a good sanity test if this file is ever changed.

export interface Contributor {
  name: string;
  nominal: number;
  tolerance: number; // symmetric +/-, must be >= 0
  direction: 1 | -1;
}

export interface LinearStackResult {
  nominal: number;
  worstCase: number; // +/- value
  rss: number; // +/- value
}

export function computeLinearStack(contributors: Contributor[]): LinearStackResult {
  const nominal = contributors.reduce((sum, c) => sum + c.direction * c.nominal, 0);
  const worstCase = contributors.reduce((sum, c) => sum + Math.abs(c.tolerance), 0);
  const rss = Math.sqrt(contributors.reduce((sum, c) => sum + c.tolerance ** 2, 0));
  return { nominal, worstCase, rss };
}

// Box-Muller transform — verified separately (200k samples -> mean ~0,
// stddev ~1 to 3 decimal places) before use here.
function standardNormal(): number {
  let u1 = Math.random();
  const u2 = Math.random();
  if (u1 === 0) u1 = Number.MIN_VALUE;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export interface HistogramBin {
  from: number;
  to: number;
  count: number;
}

export interface MonteCarloResult {
  mean: number;
  stddev: number;
  min: number;
  max: number;
  fractionOutOfSpec: number | null; // null when no spec limits given
  histogram: HistogramBin[];
}

export function runMonteCarlo(
  contributors: Contributor[],
  sampleCount: number,
  spec?: { usl: number; lsl: number },
  binCount = 40
): MonteCarloResult {
  const samples = new Float64Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    let total = 0;
    for (const c of contributors) {
      const sd = c.tolerance / 3;
      const value = c.nominal + standardNormal() * sd;
      total += c.direction * value;
    }
    samples[i] = total;
  }

  let sum = 0;
  let sumSq = 0;
  let min = Infinity;
  let max = -Infinity;
  let outOfSpecCount = 0;
  for (const s of samples) {
    sum += s;
    sumSq += s * s;
    if (s < min) min = s;
    if (s > max) max = s;
    if (spec && (s > spec.usl || s < spec.lsl)) outOfSpecCount++;
  }
  const mean = sum / sampleCount;
  const stddev = Math.sqrt(Math.max(sumSq / sampleCount - mean * mean, 0));

  const histMin = spec ? Math.min(min, spec.lsl) : min;
  const histMax = spec ? Math.max(max, spec.usl) : max;
  const span = histMax - histMin || 1;
  const binWidth = span / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    from: histMin + i * binWidth,
    to: histMin + (i + 1) * binWidth,
    count: 0
  }));
  for (const s of samples) {
    let idx = Math.floor((s - histMin) / binWidth);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    bins[idx].count++;
  }

  return {
    mean,
    stddev,
    min,
    max,
    fractionOutOfSpec: spec ? outOfSpecCount / sampleCount : null,
    histogram: bins
  };
}

export interface CapabilityResult {
  cp: number | null;
  cpk: number | null;
}

export function computeCapability(mean: number, stddev: number, usl: number, lsl: number): CapabilityResult {
  if (stddev <= 0) return { cp: null, cpk: null };
  const cp = (usl - lsl) / (6 * stddev);
  const cpk = Math.min((usl - mean) / (3 * stddev), (mean - lsl) / (3 * stddev));
  return { cp, cpk };
}
