import { z } from "zod";

// --- Raw GraphQL response ---

// Frank's wire format keys are kept verbatim here.
// `.strict()` catches API drift early — if Frank Energie adds a new field
// (e.g. a different tax breakdown), parsing fails and CI surfaces the change.
export const RawHourPriceSchema = z
  .object({
    from: z.string(),
    till: z.string(),
    marketPrice: z.number(),
    marketPriceTax: z.number(),
    sourcingMarkupPrice: z.number(),
    energyTaxPrice: z.number(),
  })
  .strict();

export const RawGraphqlResponseSchema = z.object({
  data: z.object({
    marketPricesElectricity: z.array(RawHourPriceSchema),
    marketPricesGas: z.array(RawHourPriceSchema),
  }),
});

export type RawGraphqlResponse = z.infer<typeof RawGraphqlResponseSchema>;

// --- Normalized day file ---

// Renamed during normalization (Task 7): raw 'till' → normalized 'to'.
const HourEntrySchema = z.object({
  from: z.string(),
  to: z.string(),
  market_price: z.number().nullable(),
  all_in_buy: z.number().nullable(),
  all_in_feed_in: z.number().nullable(),
});

// Renamed during normalization (Task 7): raw 'till' → normalized 'to'.
const GasBlockSchema = z.object({
  from: z.string(),
  to: z.string(),
  market_price: z.number().nullable(),
  all_in: z.number().nullable(),
});

export const NormalizedDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fetched_at: z.string(),
  source: z.literal("frankenergie-graphql"),
  electricity: z.object({
    unit_buy: z.literal("EUR/kWh"),
    unit_feed_in: z.literal("EUR/kWh"),
    hours: z
      .array(HourEntrySchema)
      .refine(
        (arr) => [23, 24, 25].includes(arr.length),
        "electricity.hours must be 23, 24, or 25 entries",
      ),
  }),
  gas: z.object({
    unit: z.literal("EUR/m3"),
    blocks: z.array(GasBlockSchema).min(1),
  }),
});

export type NormalizedDay = z.infer<typeof NormalizedDaySchema>;

// --- Aggregate ---

const StatsSchema = z.object({
  min: z.number(),
  max: z.number(),
  avg: z.number(),
  median: z.number(),
});

export const AggregateSchema = z.object({
  key: z.string(),
  period: z.enum(["day", "week", "month", "year"]),
  from: z.string(),
  to: z.string(),
  electricity_buy_market: StatsSchema,
  electricity_buy_all_in: StatsSchema,
  electricity_feed_in_market: StatsSchema,
  electricity_feed_in_all_in: StatsSchema,
  gas_market: StatsSchema,
  gas_all_in: StatsSchema,
  samples: z.object({
    electricity_hours: z.number().int().nonnegative(),
    gas_blocks: z.number().int().nonnegative(),
  }),
});

export type Aggregate = z.infer<typeof AggregateSchema>;
