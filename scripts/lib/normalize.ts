import {
  RawGraphqlResponseSchema,
  type NormalizedDay,
} from "../../src/lib/schema";

const sumAllIn = (h: {
  marketPrice: number;
  marketPriceTax: number;
  sourcingMarkupPrice: number;
  energyTaxPrice: number;
}): number =>
  h.marketPrice + h.marketPriceTax + h.sourcingMarkupPrice + h.energyTaxPrice;

// Frank's API returns ISO timestamps. Real responses use UTC (`...Z`) but
// the request is for an Amsterdam-local day. Convert each entry's `from`
// to Europe/Amsterdam and compare YYYY-MM-DD parts.
const AMS_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Amsterdam",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function amsterdamDayKey(iso: string): string {
  // en-CA produces YYYY-MM-DD which is exactly what we want.
  return AMS_DATE_FMT.format(new Date(iso));
}

interface GasHour {
  from: string;
  till: string;
  marketPrice: number;
  marketPriceTax: number;
  sourcingMarkupPrice: number;
  energyTaxPrice: number;
}

// Collapse consecutive gas entries that share marketPrice + all-in into single blocks.
// Frank publishes gas hourly with the same price repeated within each gas-day window.
function dedupeGasBlocks(entries: GasHour[]): NormalizedDay["gas"]["blocks"] {
  if (entries.length === 0) return [];
  const blocks: NormalizedDay["gas"]["blocks"] = [];
  let current = {
    from: entries[0].from,
    to: entries[0].till,
    market_price: entries[0].marketPrice,
    all_in: sumAllIn(entries[0]),
  };
  for (let i = 1; i < entries.length; i++) {
    const e = entries[i];
    const eAllIn = sumAllIn(e);
    if (e.marketPrice === current.market_price && eAllIn === current.all_in) {
      // extend current block
      current.to = e.till;
    } else {
      blocks.push(current);
      current = {
        from: e.from,
        to: e.till,
        market_price: e.marketPrice,
        all_in: eAllIn,
      };
    }
  }
  blocks.push(current);
  return blocks;
}

export function normalize(
  raw: unknown,
  date: string,
  fetchedAt: string,
): NormalizedDay {
  const parsed = RawGraphqlResponseSchema.parse(raw);
  const elecForDay = parsed.data.marketPricesElectricity.filter(
    (h) => amsterdamDayKey(h.from) === date,
  );
  const gasForDay = parsed.data.marketPricesGas.filter(
    (h) => amsterdamDayKey(h.from) === date,
  );

  return {
    date,
    fetched_at: fetchedAt,
    source: "frankenergie-graphql",
    electricity: {
      unit_buy: "EUR/kWh",
      unit_feed_in: "EUR/kWh",
      hours: elecForDay.map((h) => ({
        from: h.from,
        to: h.till,
        market_price: h.marketPrice,
        all_in_buy: sumAllIn(h),
        // Feed-in: Frank pays back the market price (no markup/tax).
        all_in_feed_in: h.marketPrice,
      })),
    },
    gas: {
      unit: "EUR/m3",
      blocks: dedupeGasBlocks(gasForDay),
    },
  };
}
