import type { MetricLog } from './types.ts';

/**
 * Pure TypeScript implementation of Liu, Ting, and Zhou's Isolation Forest (2008)
 * matching Scikit-learn's IsolationForest scoring semantics on 4 telemetry dimensions:
 * [cpuPercent, memoryPercent, diskPercent, examLatencyMs].
 */

interface ITreeNode {
  isLeaf: boolean;
  size: number;
  splitFeature?: number;
  splitValue?: number;
  left?: ITreeNode;
  right?: ITreeNode;
}

function harmonicEstimate(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
}

// Deterministic PRNG (Mulberry32) so anomaly scores are reproducible across evaluations
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildITree(
  samples: number[][],
  height: number,
  maxHeight: number,
  rng: () => number
): ITreeNode {
  if (height >= maxHeight || samples.length <= 1) {
    return { isLeaf: true, size: samples.length };
  }

  const numFeatures = samples[0].length;
  const featureOrder = [0, 1, 2, 3].sort(() => rng() - 0.5);

  for (const feat of featureOrder) {
    let min = Infinity;
    let max = -Infinity;
    for (const row of samples) {
      if (row[feat] < min) min = row[feat];
      if (row[feat] > max) max = row[feat];
    }
    if (max - min > 1e-6) {
      const splitVal = min + rng() * (max - min);
      const leftSamples: number[][] = [];
      const rightSamples: number[][] = [];
      for (const row of samples) {
        if (row[feat] < splitVal) leftSamples.push(row);
        else rightSamples.push(row);
      }
      return {
        isLeaf: false,
        size: samples.length,
        splitFeature: feat,
        splitValue: splitVal,
        left: buildITree(leftSamples, height + 1, maxHeight, rng),
        right: buildITree(rightSamples, height + 1, maxHeight, rng),
      };
    }
  }

  return { isLeaf: true, size: samples.length };
}

function pathLength(point: number[], node: ITreeNode, currentHeight: number): number {
  if (node.isLeaf || node.splitFeature === undefined || node.splitValue === undefined) {
    return currentHeight + harmonicEstimate(node.size);
  }
  if (point[node.splitFeature] < node.splitValue) {
    return pathLength(point, node.left!, currentHeight + 1);
  }
  return pathLength(point, node.right!, currentHeight + 1);
}

const FEATURE_NAMES = ['cpuPercent', 'memoryPercent', 'diskPercent', 'examLatencyMs'] as const;

export interface AnomalyAnalysisResult {
  model: string;
  contamination: number;
  total: number;
  anomaliesFound: number;
  thresholdScore: number;
  featureMeans: Record<string, number>;
  results: MetricLog[];
}

export function runIsolationForest(
  records: MetricLog[],
  contamination = 0.08
): AnomalyAnalysisResult {
  if (records.length === 0) {
    return {
      model: 'IsolationForest (100 estimators, StandardScaler)',
      contamination,
      total: 0,
      anomaliesFound: 0,
      thresholdScore: 0.6,
      featureMeans: { cpuPercent: 0, memoryPercent: 0, diskPercent: 0, examLatencyMs: 0 },
      results: [],
    };
  }

  const rawVectors = records.map((r) => [
    r.cpuPercent,
    r.memoryPercent,
    r.diskPercent,
    r.examLatencyMs,
  ]);

  // Z-score standardization matching Scikit-learn StandardScaler
  const means = [0, 0, 0, 0];
  const stds = [0, 0, 0, 0];
  for (const v of rawVectors) {
    for (let j = 0; j < 4; j++) means[j] += v[j];
  }
  for (let j = 0; j < 4; j++) means[j] /= rawVectors.length;

  for (const v of rawVectors) {
    for (let j = 0; j < 4; j++) stds[j] += (v[j] - means[j]) ** 2;
  }
  for (let j = 0; j < 4; j++) {
    stds[j] = Math.sqrt(stds[j] / rawVectors.length) || 1;
  }

  const scaledVectors = rawVectors.map((v) =>
    v.map((val, j) => (val - means[j]) / stds[j])
  );

  const nTrees = 100;
  const subSampleSize = Math.min(256, scaledVectors.length);
  const maxHeight = Math.ceil(Math.log2(Math.max(subSampleSize, 2)));
  const cNorm = harmonicEstimate(subSampleSize) || 1;
  const rng = createRng(42);

  const forest: ITreeNode[] = [];
  for (let t = 0; t < nTrees; t++) {
    const sample: number[][] = [];
    for (let i = 0; i < subSampleSize; i++) {
      const idx = Math.floor(rng() * scaledVectors.length);
      sample.push(scaledVectors[idx]);
    }
    forest.push(buildITree(sample, 0, maxHeight, rng));
  }

  const scored = records.map((rec, idx) => {
    const vec = scaledVectors[idx];
    let avgPath = 0;
    for (const tree of forest) {
      avgPath += pathLength(vec, tree, 0);
    }
    avgPath /= forest.length;
    const score = Number(Math.pow(2, -avgPath / cNorm).toFixed(4));

    // Dominant anomalous feature by absolute z-score
    let topIdx = 0;
    let maxZ = -1;
    for (let j = 0; j < 4; j++) {
      const z = Math.abs(vec[j]);
      if (z > maxZ) {
        maxZ = z;
        topIdx = j;
      }
    }

    return {
      ...rec,
      anomalyScore: score,
      dominantFeature: FEATURE_NAMES[topIdx],
    };
  });

  // Determine quantile cutoff from contamination rate
  const clampedContam = Math.min(Math.max(contamination, 0.02), 0.35);
  const sortedScores = [...scored].map((s) => s.anomalyScore).sort((a, b) => b - a);
  const anomalyCount = Math.max(1, Math.round(scored.length * clampedContam));
  const thresholdScore = sortedScores[Math.min(anomalyCount - 1, sortedScores.length - 1)] ?? 0.6;

  const finalResults = scored.map((item) => ({
    ...item,
    isAnomaly: item.anomalyScore >= thresholdScore && item.anomalyScore > 0.54,
  }));

  return {
    model: 'IsolationForest (100 estimators, StandardScaler)',
    contamination: clampedContam,
    total: finalResults.length,
    anomaliesFound: finalResults.filter((r) => r.isAnomaly).length,
    thresholdScore: Number(thresholdScore.toFixed(4)),
    featureMeans: {
      cpuPercent: Number(means[0].toFixed(1)),
      memoryPercent: Number(means[1].toFixed(1)),
      diskPercent: Number(means[2].toFixed(1)),
      examLatencyMs: Number(means[3].toFixed(1)),
    },
    results: finalResults,
  };
}
