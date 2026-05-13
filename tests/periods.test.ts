import { describe, it, expect } from "vitest";
import {
  isoWeekKey,
  monthKey,
  yearKey,
  dayKey,
  weekRange,
  monthRange,
  yearRange,
} from "../src/lib/periods";

describe("periods", () => {
  it("formats day key as YYYY-MM-DD", () => {
    expect(dayKey(new Date("2026-05-05T12:00:00Z"))).toBe("2026-05-05");
  });

  it("formats ISO week key", () => {
    expect(isoWeekKey(new Date("2026-05-05T12:00:00Z"))).toBe("2026-W19");
    expect(isoWeekKey(new Date("2026-01-01T12:00:00Z"))).toBe("2026-W01");
    expect(isoWeekKey(new Date("2025-12-31T12:00:00Z"))).toBe("2026-W01");
  });

  it("formats month key", () => {
    expect(monthKey(new Date("2026-05-05T12:00:00Z"))).toBe("2026-05");
  });

  it("formats year key", () => {
    expect(yearKey(new Date("2026-05-05T12:00:00Z"))).toBe("2026");
  });

  it("weekRange returns Monday..Sunday", () => {
    const { from, to } = weekRange("2026-W19");
    expect(from).toBe("2026-05-04");
    expect(to).toBe("2026-05-10");
  });

  it("monthRange returns first..last day", () => {
    expect(monthRange("2026-05")).toEqual({
      from: "2026-05-01",
      to: "2026-05-31",
    });
    expect(monthRange("2024-02")).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
  });

  it("yearRange returns Jan 1..Dec 31", () => {
    expect(yearRange("2026")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
});
