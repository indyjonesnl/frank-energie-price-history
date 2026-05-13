import { describe, it, expect } from "vitest";
import { min, max, avg, median, summarize } from "../src/lib/stats";

describe("stats", () => {
  it("computes min/max/avg/median for an odd-count list", () => {
    expect(min([3, 1, 2])).toBe(1);
    expect(max([3, 1, 2])).toBe(3);
    expect(avg([3, 1, 2])).toBeCloseTo(2, 10);
    expect(median([3, 1, 2])).toBe(2);
  });

  it("handles negative numbers (feed-in / negative spot prices)", () => {
    expect(min([-0.05, 0.1, -0.2])).toBeCloseTo(-0.2, 10);
    expect(max([-0.05, 0.1, -0.2])).toBeCloseTo(0.1, 10);
    expect(avg([-0.05, 0.1, -0.2])).toBeCloseTo(-0.05, 5);
    expect(median([-0.05, 0.1, -0.2])).toBeCloseTo(-0.05, 10);
  });

  it("computes median as midpoint for even-count list", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("summarize returns full StatsLike object", () => {
    expect(summarize([0.1, 0.2, 0.3])).toEqual({
      min: 0.1,
      max: 0.3,
      avg: expect.closeTo(0.2, 5),
      median: 0.2,
    });
  });

  it("throws on empty input", () => {
    expect(() => summarize([])).toThrow(/non-empty/);
  });
});
