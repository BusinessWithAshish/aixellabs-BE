### Aixellabs — Google Maps Scraping API (TypeScript, Express, Puppeteer)

An internal API server for lead discovery and enrichment from Google Maps. It exposes two primary capabilities:

- Scrape Google Maps listings using headless Chromium driven by Puppeteer, streaming progress via Server‑Sent Events (SSE).
- Query the Google Places Text Search API and aggregate paginated results.

This repository is TypeScript-first, built on `express`, `zod`, `puppeteer`, and optionally `mongodb` for persistence.

---

### Features

- **Type-safe request validation** with `zod`
- **SSE streaming** for long‑running scraping jobs
- **High‑throughput scraping** via concurrent browser/page orchestration
- **Hardened HTTP server** using `helmet`, configurable **CORS** and **rate limiting**
- **Production-optimized Puppeteer** launch args and diagnostics endpoint
- Optional **MongoDB upsert** helpers for storing leads

---

### Quickstart

Prerequisites:
- Node.js LTS (>= 18)
- pnpm (recommended)
- Linux/macOS with Chromium or allow Puppeteer to manage Chrome

Install and run:

```bash
pnpm install
cp .env.example .env
# Fill in required secrets in .env
pnpm run start
```

By default the server listens on `PORT` (default `8100`).

Health check:

```bash
curl http://localhost:8100/v1/ping
```

Browser diagnostics (ensures Puppeteer can launch):

```bash
curl http://localhost:8100/v1/test-browser | jq
```

---

### Project Structure

```
src/
  index.ts                         # Express app, CORS, rate limits, routes, health, SSE
  apis/
    GMAPS_SCRAPE.ts               # POST /gmaps/scrape (SSE streaming)
    GMAPS_SEARCH_API_SCRAPE.ts    # POST /gmaps/search_scrape (Places API)
  functions/
    common/browser-batch-handler.ts  # Concurrency and SSE orchestration for Puppeteer
    gmap-details-lead-extractor.ts   # Extract details from a place page (JSDOM)
    gmaps-save-to-db.ts              # Mongo upsert helpers (optional usage)
    mongo-db.ts                      # Mongo connection helpers
    scrape-links.ts                  # Phase 1: collect listing URLs from search results
  utils/
    browser.ts                    # Puppeteer launch configuration
    constants.ts                  # Constants (URLs, timeouts)
    helpers.ts                    # URL generation utilities for Maps search
  setup.sh                        # Example EC2 setup script
```

TypeScript is configured via `tsconfig.json` with output to `dist/`. Build with `pnpm run build`.

---

### Scripts

- `pnpm run build` — compile TypeScript to `dist/`
- `pnpm run build:watch` — compile in watch mode
- `pnpm run start` — build then start the server

Tip for local development: run the compiler and server in separate terminals:

```bash
# Terminal 1
pnpm run build:watch

# Terminal 2
node dist/index.js
```

---

### API Overview

- `GET /v1/ping` — health check
- `GET /v1/test-browser` — launches a headless browser and returns info
- `POST /gmaps/scrape` — SSE stream; Phase 1 lists, Phase 2 details
- `POST /gmaps/search_scrape` — Places Text Search aggregation

See detailed request/response examples in `docs/api.md`.

---

### Configuration

Environment variables (see `.env.example`):

- `PORT` — HTTP port (default 8100)
- `NODE_ENV` — `development` or `production`
- `ALLOWED_ORIGINS` — comma-separated CORS origins or `*`
- `RATE_LIMIT_MAX` — requests per 15 minutes per IP (default 100)
- `MAX_BROWSER_SESSIONS` — concurrent Chromium instances (default 10)
- `MAX_PAGES_PER_BROWSER` — concurrent pages per browser (default 5)
- `GOOGLE_MAPS_PLACES_API_KEY` — required for `/gmaps/search_scrape`
- `MONGODB_URI` — required if you use Mongo helpers

In production, the browser launcher targets `/usr/bin/chromium-browser`. Ensure Chromium is installed or update `getBrowserOptions` in `src/utils/browser.ts` accordingly.

---

### Architecture

High-level flow:

1) Client POSTs payload (query, country, states/cities)
2) Generate Google Maps search URLs
3) Phase 1: Navigate search pages, scroll, and collect listing URLs
4) Phase 2: Visit listing pages and extract details (name, phone, website, ratings)
5) Stream progress and final results via SSE; optionally upsert to Mongo

See `docs/architecture.md` for component roles and data flow.

---

### Deployment Notes

- Set `NODE_ENV=production` to enable production logging and headless mode
- Ensure Chromium is installed at `/usr/bin/chromium-browser` or adjust the path
- Tune concurrency with `MAX_BROWSER_SESSIONS` and `MAX_PAGES_PER_BROWSER`
- Configure CORS via `ALLOWED_ORIGINS`

Operational guidance and troubleshooting are in `docs/operations.md`.

---

### License

ISC — see `package.json`.

