# Aixellabs Google Maps Scraping API (Node + TypeScript)

An internal API server for searching and scraping Google Maps business listings at scale. It exposes:

- POST `/gmaps/scrape` — Scrape business listing URLs and extract details (SSE stream)
- POST `/gmaps/search_scrape` — Query Google Places Text Search API (batched)
- GET `/v1/ping` — Health check
- GET `/v1/test-browser` — Launch Puppeteer with current options and validate environment

See the full docs in `docs/`:

- Architecture: `docs/architecture.md`
- Setup: `docs/setup.md`
- API Reference: `docs/api.md`
- Database model: `docs/database.md`
- Operations: `docs/operations.md`
- Troubleshooting: `docs/troubleshooting.md`
- Contributing: `docs/contributing.md`
- OpenAPI spec: `docs/openapi.yaml`


## Quick start

1) Install dependencies

```bash
pnpm install
```

2) Configure environment

Copy `.env.example` to `.env` and fill values.

```bash
cp .env.example .env
```

3) Build and run

```bash
pnpm run start
# which runs: tsc && node dist/index.js
```

4) Verify

```bash
curl -s http://localhost:8100/v1/ping | jq
```


## Stack

- Runtime: Node.js + TypeScript
- Web: Express, Helmet, CORS, express-rate-limit, Morgan
- Scraping: Puppeteer, JSDOM
- Validation: Zod
- Persistence: MongoDB (helper provided, optional integration)


## Key environment variables

See `.env.example` for the complete list. Common variables:

- `PORT` — API port (default 8100)
- `ALLOWED_ORIGINS` — CSV of allowed origins for CORS, or `*`
- `RATE_LIMIT_MAX` — Requests per 15 minutes per IP (default 100)
- `MAX_BROWSER_SESSIONS` — Concurrent Chromium processes (default 10)
- `MAX_PAGES_PER_BROWSER` — Pages per browser (default 5)
- `GOOGLE_MAPS_PLACES_API_KEY` — Required for `/gmaps/search_scrape`
- `MONGODB_URI` — If using the optional Mongo upsert helper


## Endpoints (summary)

- `GET /v1/ping` — Returns `{ success: true }`
- `GET /v1/test-browser` — Attempts to launch Puppeteer with computed options
- `POST /gmaps/scrape` — Server-Sent Events stream; two phases:
  - Phase 1: discover place URLs from Google Maps search pages
  - Phase 2: fetch each place’s details (name, phone, website, rating, reviews)
- `POST /gmaps/search_scrape` — Calls Places Text Search API with pagination via `nextPageToken`

For detailed request/response shapes and curl examples, see `docs/api.md`.


## Operations tips

- The server emits detailed progress via SSE for long-running scrapes
- Concurrency is tunable via `MAX_BROWSER_SESSIONS` and `MAX_PAGES_PER_BROWSER`
- Production headless Chromium path is `/usr/bin/chromium-browser` (configurable in `src/utils/browser.ts`)
- Consider reverse proxy timeouts when using SSE (see `docs/operations.md`)


## License

ISC (see `package.json`)

