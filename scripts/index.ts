import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DATA_ROOT = "public/api/v1/data";
const AGG_ROOT = "public/api/v1/aggregates";

function safeReaddir(p: string): string[] {
  try {
    return statSync(p).isDirectory() ? readdirSync(p) : [];
  } catch {
    return [];
  }
}

function writeJson(path: string, value: unknown) {
  mkdirSync(path.replace(/\/[^/]+$/, ""), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

interface Counts {
  topLevel: number;
  year: number;
  month: number;
  aggregates: number;
}

export function generateIndexes(): Counts {
  const counts: Counts = { topLevel: 0, year: 0, month: 0, aggregates: 0 };

  // Walk the tree and collect days per year/month.
  const years = safeReaddir(DATA_ROOT)
    .filter((d) => /^\d{4}$/.test(d))
    .sort();

  const allDates: string[] = [];

  for (const year of years) {
    const yearPath = join(DATA_ROOT, year);
    const months = safeReaddir(yearPath)
      .filter((m) => /^\d{2}$/.test(m))
      .sort();

    let yearTotal = 0;
    const yearDates: string[] = [];

    for (const month of months) {
      const monthPath = join(yearPath, month);
      const days = safeReaddir(monthPath)
        .filter((f) => f.endsWith(".json") && f !== "index.json")
        .map((f) => f.replace(/\.json$/, ""))
        .sort();

      const monthIndex = {
        year_month: `${year}-${month}`,
        days,
        url_pattern: `/api/v1/data/${year}/${month}/{day}.json`,
      };
      writeJson(join(monthPath, "index.json"), monthIndex);
      counts.month++;

      for (const day of days) {
        const date = `${year}-${month}-${day}`;
        yearDates.push(date);
        allDates.push(date);
      }
      yearTotal += days.length;
    }

    yearDates.sort();
    const yearIndex = {
      year,
      months,
      earliest: yearDates[0] ?? null,
      latest: yearDates[yearDates.length - 1] ?? null,
      total_days: yearTotal,
      url_pattern: `/api/v1/data/${year}/{month}/{day}.json`,
    };
    writeJson(join(yearPath, "index.json"), yearIndex);
    counts.year++;
  }

  allDates.sort();
  const topIndex = {
    schema: "frankenergie-graphql",
    schema_version: "1.0",
    endpoint: "https://graphql.frankenergie.nl/",
    earliest: allDates[0] ?? null,
    latest: allDates[allDates.length - 1] ?? null,
    years,
    total_days: allDates.length,
    fields: [
      "from",
      "till",
      "marketPrice",
      "marketPriceTax",
      "sourcingMarkupPrice",
      "energyTaxPrice",
    ],
    url_pattern: "/api/v1/data/{year}/{month}/{day}.json",
    year_index_pattern: "/api/v1/data/{year}/index.json",
    month_index_pattern: "/api/v1/data/{year}/{month}/index.json",
  };
  writeJson(join(DATA_ROOT, "index.json"), topIndex);
  counts.topLevel++;

  // Aggregates index.
  const kinds = ["day", "week", "month", "year"] as const;
  const kindCounts: Record<string, number> = {};
  for (const kind of kinds) {
    const files = safeReaddir(join(AGG_ROOT, kind)).filter(
      (f) => f.endsWith(".json") && f !== "index.json",
    );
    kindCounts[kind] = files.length;
  }

  const dayKeys = safeReaddir(join(AGG_ROOT, "day"))
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .map((f) => f.replace(/\.json$/, ""))
    .sort();

  const aggIndex = {
    schema_version: "1.0",
    kinds,
    url_patterns: {
      day: "/api/v1/aggregates/day/{YYYY-MM-DD}.json",
      week: "/api/v1/aggregates/week/{YYYY-Www}.json",
      month: "/api/v1/aggregates/month/{YYYY-MM}.json",
      year: "/api/v1/aggregates/year/{YYYY}.json",
    },
    earliest: dayKeys[0] ?? null,
    latest: dayKeys[dayKeys.length - 1] ?? null,
    counts: kindCounts,
  };
  writeJson(join(AGG_ROOT, "index.json"), aggIndex);
  counts.aggregates++;

  return counts;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const c = generateIndexes();
  console.log(
    `Wrote indexes: ${c.topLevel} top-level, ${c.year} year, ${c.month} month, ${c.aggregates} aggregates`,
  );
}
