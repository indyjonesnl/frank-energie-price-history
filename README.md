# Frank Energie Price History

Static site that publishes a browsable archive of Frank Energie's hourly electricity (buy and feed-in) and 12-hour gas prices.

**Live:** https://indyjonesnl.github.io/frank-energie-price-history/
**Data:** [`/public/api/v1/data/`](./public/api/v1/data) — raw GraphQL responses, one file per day.

Not affiliated with Frank Energie.

## Public data API

Every captured day is published as a static JSON file under a versioned path:

- `https://indyjonesnl.github.io/frank-energie-price-history/api/v1/data/YYYY/MM/DD.json` — verbatim GraphQL response (with `_query`, `_variables`, `_endpoint`, `_fetched_at` audit sidecars and a `data` envelope).
- `https://indyjonesnl.github.io/frank-energie-price-history/api/v1/aggregates/{day,week,month,year}/<key>.json` — pre-computed summaries.
- `https://indyjonesnl.github.io/frank-energie-price-history/api/v1/data/index.json` (and per-year/per-month) — discoverability indexes.

See [the `/api/` page](https://indyjonesnl.github.io/frank-energie-price-history/api/) for the full schema and shape.

The on-disk truth is the raw GraphQL response; the site normalises at read time.

## Local development

Requires Node 22 and pnpm.

```bash
pnpm install
pnpm fetch        # pull today/tomorrow from Frank Energie API
pnpm aggregate    # rebuild public/api/v1/aggregates/
pnpm index        # rebuild discoverability index.json files
pnpm dev          # Astro dev server
pnpm build        # production build → dist/
pnpm test         # vitest
```

## Backfill

```bash
pnpm backfill --start=2024-01-01 --end=2024-12-31
```

## Architecture

- `scripts/fetch.ts` — calls Frank Energie's GraphQL endpoint, writes `public/api/v1/data/YYYY/MM/DD.json` only when content changes.
- `scripts/aggregate.ts` — pure function over `public/api/v1/data/`, writes `public/api/v1/aggregates/{day,week,month,year}/*.json`.
- `src/pages/` — Astro static pages, one route per period and commodity.
- `.github/workflows/update.yml` — three daily runs (Europe/Amsterdam 13:00, 15:00, 20:00), idempotent, deploys to GitHub Pages.

## License

MIT for code. Data is republished from Frank Energie's public API under fair-use attribution.
