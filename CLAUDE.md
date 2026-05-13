# CLAUDE.md

Guidance for AI agents working on this repository.

## Project shape

Static site (Astro 5 + TypeScript) plus three Node CLI scripts (`scripts/{fetch,aggregate,backfill}.ts`) that materialise data into `public/api/v1/`. Per-day raw GraphQL responses live at `public/api/v1/data/YYYY/MM/DD.json`; aggregates live at `public/api/v1/aggregates/{day,week,month,year}/`. Both trees are served as a public, versioned API at `https://indyjonesnl.github.io/frank-energie-price-history/api/v1/`.

## Constants

- Site base path: `/frank-energie-price-history`
- Site URL: `https://indyjonesnl.github.io/frank-energie-price-history/`
- Data timezone: Europe/Amsterdam
- API endpoint: `https://graphql.frankenergie.nl/` (public, no auth)

## When adding a new page or component

- Use `Layout.astro` for `<head>`/SEO.
- Server-render content; do not introduce client frameworks. The only client JS allowed is `public/tooltip.js`.
- Every chart must ship with an accessible companion `<table>`.

## When changing data scripts

- Run `pnpm test` — schema, normalize, idempotency, and aggregate tests must pass.
- Do not modify the on-disk format of `public/api/v1/data/YYYY/MM/DD.json` without bumping the version prefix (`/api/v1/` → `/api/v2/`) and a migration plan. The file is the verbatim GraphQL response wrapped in an envelope (`_query`, `_variables`, `_endpoint`, `_fetched_at`, `data`); the site normalises at read time via `scripts/lib/normalize.ts`.

## Commit style

Conventional commits (`feat:`, `fix:`, `chore:`, `ci:`, `data:`). Bot commits use `data:` prefix and end with `[skip ci]`.
