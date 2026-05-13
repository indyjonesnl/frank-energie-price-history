import { describe, it, expect } from "vitest";
import { hourRange, monthName } from "../src/lib/format";

describe("monthName", () => {
  it("returns full English month name by default", () => {
    expect(monthName("2026-01")).toBe("January");
    expect(monthName("2026-12")).toBe("December");
  });
  it("returns 3-letter abbreviation when abbr=true", () => {
    expect(monthName("2026-01", true)).toBe("Jan");
    expect(monthName("2026-09", true)).toBe("Sep");
  });
});

describe("hourRange", () => {
  it("formats two ISO timestamps as Amsterdam-local hour range with en-dash", () => {
    const result = hourRange("2026-04-14T22:00:00.000Z", "2026-04-15T04:00:00.000Z");
    // 22:00 UTC = 00:00 CEST; 04:00 UTC = 06:00 CEST
    expect(result).toBe("00:00–06:00");
  });
});
