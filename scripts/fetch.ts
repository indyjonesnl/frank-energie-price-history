import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { ENDPOINT, QUERY, fetchMarketPrices } from "./lib/graphql-client";

const EXIT_UNCHANGED = 0;
const EXIT_CHANGED = 10;
const EXIT_ERROR = 1;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

// Fields excluded from idempotency comparison. We keep `fetched_at` for backwards
// compatibility with any normalized files still produced upstream, and add
// `_fetched_at` for the new raw-envelope format introduced in Stage 1.
const IGNORED_FIELDS = new Set(["fetched_at", "_fetched_at"]);

function omitIgnored(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o)) {
    if (!IGNORED_FIELDS.has(k)) out[k] = o[k];
  }
  return out;
}

export function writeIfChanged(
  path: string,
  payload: Record<string, unknown>,
): boolean {
  const next = { ...payload };
  if (existsSync(path)) {
    let current: Record<string, unknown>;
    try {
      current = JSON.parse(readFileSync(path, "utf-8")) as Record<
        string,
        unknown
      >;
    } catch (err) {
      throw new Error(
        `writeIfChanged: existing file ${path} is not valid JSON: ${(err as Error).message}`,
      );
    }
    if (
      stableStringify(omitIgnored(current)) ===
      stableStringify(omitIgnored(next))
    ) {
      return false;
    }
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(next, null, 2) + "\n");
  return true;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoNextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// KNOWN LATENT BUG (deferred): isoDate() returns the UTC date prefix, but the
// normalizer (scripts/lib/normalize.ts) filters entries by their Europe/Amsterdam
// day. Between 22:00–24:00 UTC (00:00–02:00 Amsterdam-CEST), isoDate(today)
// produces the previous Amsterdam day, which would cause normalize() to return
// 0 hours for that "today". The GitHub Action time-gate (Task 19) restricts
// invocations to 13:00/15:00/20:00 Amsterdam, so this gap can't trigger in
// practice. To be revisited with the rest of the timezone hardening.
// (additional caveat) Adding 24h of milliseconds is also wrong on Amsterdam DST
// transitions (23h on spring-forward, 25h on fall-back); the Task 19 time-gate
// at 13/15/20 Amsterdam keeps this benign for now.
async function main() {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
  let anyChanged = false;
  for (const date of [isoDate(today), isoDate(tomorrow)]) {
    const endDate = isoNextDay(date);
    const raw = (await fetchMarketPrices(date, endDate)) as {
      data?: {
        marketPricesElectricity?: unknown[];
        marketPricesGas?: unknown[];
      };
    };
    const elec = raw?.data?.marketPricesElectricity ?? [];
    if (!Array.isArray(elec) || elec.length === 0) continue; // tomorrow not yet published
    const payload = {
      _query: QUERY,
      _variables: { startDate: date, endDate },
      _endpoint: ENDPOINT,
      _fetched_at: new Date().toISOString(),
      data: raw.data,
    };
    const path = `public/api/v1/data/${date.slice(0, 4)}/${date.slice(5, 7)}/${date.slice(8, 10)}.json`;
    const changed = writeIfChanged(path, payload);
    anyChanged = anyChanged || changed;
    console.log(`${changed ? "WROTE" : "SKIP "}  ${path}`);
  }
  process.exit(anyChanged ? EXIT_CHANGED : EXIT_UNCHANGED);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(EXIT_ERROR);
  });
}
