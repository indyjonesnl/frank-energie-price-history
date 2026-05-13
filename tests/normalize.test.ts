import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalize } from "../scripts/lib/normalize";
import { NormalizedDaySchema } from "../src/lib/schema";

describe("normalize", () => {
  it("produces a schema-valid NormalizedDay from a real fixture", () => {
    const raw = JSON.parse(
      readFileSync(
        "tests/fixtures/frankenergie-graphql-response.json",
        "utf-8",
      ),
    );
    const result = normalize(raw, "2026-04-15", "2026-04-15T13:00:00Z");
    expect(() => NormalizedDaySchema.parse(result)).not.toThrow();
    expect(result.electricity.hours.length).toBe(24);
    expect(result.gas.blocks.length).toBeGreaterThanOrEqual(1);
  });

  it("produces 23 hours for DST-start day", () => {
    const raw = JSON.parse(
      readFileSync(
        "tests/fixtures/frankenergie-graphql-dst-start.json",
        "utf-8",
      ),
    );
    const result = normalize(raw, "2026-03-29", "2026-03-29T13:00:00Z");
    expect(result.electricity.hours.length).toBe(23);
  });

  it("produces 25 hours for DST-end day", () => {
    const raw = JSON.parse(
      readFileSync("tests/fixtures/frankenergie-graphql-dst-end.json", "utf-8"),
    );
    const result = normalize(raw, "2025-10-26", "2025-10-26T13:00:00Z");
    expect(result.electricity.hours.length).toBe(25);
  });
});
