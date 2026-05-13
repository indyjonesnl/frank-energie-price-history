export interface StatsLike {
  min: number;
  max: number;
  avg: number;
  median: number;
}

export function min(xs: number[]): number {
  return xs.reduce((a, b) => (a < b ? a : b));
}

export function max(xs: number[]): number {
  return xs.reduce((a, b) => (a > b ? a : b));
}

export function avg(xs: number[]): number {
  if (xs.length === 0) throw new Error("avg requires non-empty input");
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(xs: number[]): number {
  if (xs.length === 0) throw new Error("median requires non-empty input");
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function summarize(xs: number[]): StatsLike {
  if (xs.length === 0) throw new Error("summarize requires non-empty input");
  return { min: min(xs), max: max(xs), avg: avg(xs), median: median(xs) };
}
