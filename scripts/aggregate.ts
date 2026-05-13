import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { loadAllDays } from "../src/lib/data-loader";
import { type Aggregate, type NormalizedDay } from "../src/lib/schema";
import { summarize } from "../src/lib/stats";
import {
  dayKey,
  isoWeekKey,
  monthKey,
  yearKey,
  weekRange,
  monthRange,
  yearRange,
} from "../src/lib/periods";

interface Bucketed {
  day: Map<string, NormalizedDay[]>;
  week: Map<string, NormalizedDay[]>;
  month: Map<string, NormalizedDay[]>;
  year: Map<string, NormalizedDay[]>;
}

function bucket(days: NormalizedDay[]): Bucketed {
  const out: Bucketed = {
    day: new Map(),
    week: new Map(),
    month: new Map(),
    year: new Map(),
  };
  for (const d of days) {
    const date = new Date(`${d.date}T12:00:00Z`);
    const dk = dayKey(date),
      wk = isoWeekKey(date),
      mk = monthKey(date),
      yk = yearKey(date);
    push(out.day, dk, d);
    push(out.week, wk, d);
    push(out.month, mk, d);
    push(out.year, yk, d);
  }
  return out;
}

function push(map: Map<string, NormalizedDay[]>, k: string, v: NormalizedDay) {
  const arr = map.get(k) ?? [];
  arr.push(v);
  map.set(k, arr);
}

function rangeFor(period: "day" | "week" | "month" | "year", key: string) {
  if (period === "day") return { from: key, to: key };
  if (period === "week") return weekRange(key);
  if (period === "month") return monthRange(key);
  return yearRange(key);
}

function summarizeDays(
  period: Aggregate["period"],
  key: string,
  days: NormalizedDay[],
): Aggregate {
  const elecMarket = days
    .flatMap((d) => d.electricity.hours.map((h) => h.market_price))
    .filter((x): x is number => x !== null);
  const elecBuyAllIn = days
    .flatMap((d) => d.electricity.hours.map((h) => h.all_in_buy))
    .filter((x): x is number => x !== null);
  const elecFeedMarket = elecMarket; // identical sample list; market price is shared
  const elecFeedAllIn = days
    .flatMap((d) => d.electricity.hours.map((h) => h.all_in_feed_in))
    .filter((x): x is number => x !== null);
  const gasMarket = days
    .flatMap((d) => d.gas.blocks.map((b) => b.market_price))
    .filter((x): x is number => x !== null);
  const gasAllIn = days
    .flatMap((d) => d.gas.blocks.map((b) => b.all_in))
    .filter((x): x is number => x !== null);
  const range = rangeFor(period, key);
  return {
    key,
    period,
    from: range.from,
    to: range.to,
    electricity_buy_market: summarize(elecMarket),
    electricity_buy_all_in: summarize(elecBuyAllIn),
    electricity_feed_in_market: summarize(elecFeedMarket),
    electricity_feed_in_all_in: summarize(elecFeedAllIn),
    gas_market: summarize(gasMarket),
    gas_all_in: summarize(gasAllIn),
    samples: {
      electricity_hours: days.reduce(
        (n, d) => n + d.electricity.hours.length,
        0,
      ),
      gas_blocks: days.reduce((n, d) => n + d.gas.blocks.length, 0),
    },
  };
}

export function aggregateDays(days: NormalizedDay[]) {
  const b = bucket(days);
  return {
    day: [...b.day.entries()].map(([k, v]) => summarizeDays("day", k, v)),
    week: [...b.week.entries()].map(([k, v]) => summarizeDays("week", k, v)),
    month: [...b.month.entries()].map(([k, v]) => summarizeDays("month", k, v)),
    year: [...b.year.entries()].map(([k, v]) => summarizeDays("year", k, v)),
  };
}

function writeAll(aggregates: ReturnType<typeof aggregateDays>) {
  for (const period of ["day", "week", "month", "year"] as const) {
    for (const a of aggregates[period]) {
      const path = `public/api/v1/aggregates/${period}/${a.key}.json`;
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(a, null, 2) + "\n");
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const days = loadAllDays();
  if (days.length === 0) {
    console.error(
      "No data found in public/api/v1/data/. Run `pnpm fetch` first.",
    );
    process.exit(1);
  }
  const aggregates = aggregateDays(days);
  writeAll(aggregates);
  console.log(
    `Aggregated ${days.length} days → ${aggregates.day.length}d ${aggregates.week.length}w ${aggregates.month.length}m ${aggregates.year.length}y`,
  );
}
