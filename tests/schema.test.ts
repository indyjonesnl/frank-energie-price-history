import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  NormalizedDaySchema,
  RawGraphqlResponseSchema,
} from "../src/lib/schema";

const sampleHour = (i: number) => ({
  from: `2026-04-15T${String(i).padStart(2, "0")}:00:00+02:00`,
  to: `2026-04-15T${String(i + 1).padStart(2, "0")}:00:00+02:00`,
  market_price: 0.1,
  all_in_buy: 0.3,
  all_in_feed_in: 0.1,
});

const buildDay = (hourCount: number) => ({
  date: "2026-04-15",
  fetched_at: "2026-04-15T13:00:00Z",
  source: "frankenergie-graphql" as const,
  electricity: {
    unit_buy: "EUR/kWh" as const,
    unit_feed_in: "EUR/kWh" as const,
    hours: Array.from({ length: hourCount }, (_, i) => sampleHour(i)),
  },
  gas: {
    unit: "EUR/m3" as const,
    blocks: [
      {
        from: "2026-04-15T06:00:00+02:00",
        to: "2026-04-15T18:00:00+02:00",
        market_price: 0.42,
        all_in: 1.31,
      },
    ],
  },
});

describe("schema", () => {
  it("parses a real Frank Energie response", () => {
    const raw = JSON.parse(
      readFileSync(
        "tests/fixtures/frankenergie-graphql-response.json",
        "utf-8",
      ),
    );
    expect(() => RawGraphqlResponseSchema.parse(raw)).not.toThrow();
  });

  it.each([23, 24, 25])("accepts %i electricity hours", (n) => {
    expect(() => NormalizedDaySchema.parse(buildDay(n))).not.toThrow();
  });

  it.each([0, 22, 26])("rejects %i electricity hours", (n) => {
    expect(() => NormalizedDaySchema.parse(buildDay(n))).toThrow();
  });
});
