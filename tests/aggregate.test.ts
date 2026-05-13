import { describe, it, expect } from "vitest";
import { aggregateDays } from "../scripts/aggregate";
import type { NormalizedDay } from "../src/lib/schema";

const day = (date: string, market: number, allIn: number): NormalizedDay => ({
  date,
  fetched_at: "2026-01-01T00:00:00Z",
  source: "frankenergie-graphql",
  electricity: {
    unit_buy: "EUR/kWh",
    unit_feed_in: "EUR/kWh",
    hours: Array.from({ length: 24 }, () => ({
      from: `${date}T00:00:00+01:00`,
      to: `${date}T01:00:00+01:00`,
      market_price: market,
      all_in_buy: allIn,
      all_in_feed_in: market,
    })),
  },
  gas: {
    unit: "EUR/m3",
    blocks: [
      {
        from: `${date}T06:00:00+01:00`,
        to: `${date}T18:00:00+01:00`,
        market_price: market * 4,
        all_in: allIn * 4,
      },
    ],
  },
});

describe("aggregateDays", () => {
  it("emits day, week, month, year aggregates", () => {
    const days = [day("2026-04-15", 0.1, 0.3), day("2026-04-16", 0.2, 0.4)];
    const result = aggregateDays(days);
    expect(result.day.length).toBe(2);
    expect(result.week.length).toBeGreaterThanOrEqual(1);
    expect(result.month.find((m) => m.key === "2026-04")).toBeDefined();
    expect(result.year.find((y) => y.key === "2026")).toBeDefined();
  });

  it("computes correct stats for two-day month", () => {
    const days = [day("2026-04-15", 0.1, 0.3), day("2026-04-16", 0.2, 0.4)];
    const result = aggregateDays(days);
    const april = result.month.find((m) => m.key === "2026-04")!;
    expect(april.electricity_buy_market.min).toBeCloseTo(0.1);
    expect(april.electricity_buy_market.max).toBeCloseTo(0.2);
    expect(april.electricity_buy_market.avg).toBeCloseTo(0.15);
    expect(april.samples.electricity_hours).toBe(48);
  });
});
