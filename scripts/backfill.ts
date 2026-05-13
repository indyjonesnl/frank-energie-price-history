import { ENDPOINT, QUERY, fetchMarketPrices } from "./lib/graphql-client";
import { writeIfChanged } from "./fetch";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

const start = args.start ?? "2024-01-01";
const end = args.end ?? new Date().toISOString().slice(0, 10);

function isoNextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function* eachDate(from: string, to: string): Generator<string> {
  const d = new Date(`${from}T12:00:00Z`);
  const stop = new Date(`${to}T12:00:00Z`);
  while (d <= stop) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

async function main() {
  console.log(`Backfill ${start} → ${end}`);
  for (const date of eachDate(start, end)) {
    try {
      const endDate = isoNextDay(date);
      const raw = (await fetchMarketPrices(date, endDate)) as {
        data?: {
          marketPricesElectricity?: unknown[];
          marketPricesGas?: unknown[];
        };
      };
      const elec = raw?.data?.marketPricesElectricity ?? [];
      if (!Array.isArray(elec) || elec.length === 0) {
        console.log(`SKIP   ${date} (no data)`);
        continue;
      }
      const payload = {
        _query: QUERY,
        _variables: { startDate: date, endDate },
        _endpoint: ENDPOINT,
        _fetched_at: new Date().toISOString(),
        data: raw.data,
      };
      const path = `public/api/v1/data/${date.slice(0, 4)}/${date.slice(5, 7)}/${date.slice(8, 10)}.json`;
      const changed = writeIfChanged(path, payload);
      console.log(`${changed ? "WROTE" : "SAME "}  ${path}`);
      await new Promise((r) => setTimeout(r, 250)); // throttle
    } catch (err) {
      console.error(`ERR    ${date}: ${(err as Error).message}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
