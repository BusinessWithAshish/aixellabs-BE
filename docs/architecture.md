### Architecture

This service provides two ways to discover and enrich leads from Google properties:

- A headless browser scraper (Puppeteer) for Google Maps pages with progress streamed via Server-Sent Events (SSE).
- An integration with the Google Places Text Search API for faster, quota-based discovery.

---

### Components

- `src/index.ts`
  - Express app initialization
  - Security: `helmet`, `cors`
  - Observability: `morgan`
  - Abuse control: `express-rate-limit`
  - Endpoints: health, browser diagnostics, `POST /gmaps/scrape`, `POST /gmaps/search_scrape`

- `src/apis/GMAPS_SCRAPE.ts`
  - Validates request with `zod`
  - Generates Google Maps search URLs from payload
  - Streams lifecycle events over SSE
  - Phase 1: uses `scrape-links` to collect listing URLs
  - Phase 2: uses `gmap-details-lead-extractor` to extract per-listing data
  - Orchestration via `BrowserBatchHandler`

- `src/apis/GMAPS_SEARCH_API_SCRAPE.ts`
  - Calls Places Text Search API
  - Paginates via `nextPageToken`, aggregates `places` array
  - Requires `GOOGLE_MAPS_PLACES_API_KEY`

- `src/functions/common/browser-batch-handler.ts`
  - Concurrency management for browsers/pages
  - Batches URLs across N browsers × M pages
  - Emits SSE `status`, `progress`, `error`, `complete` messages

- `src/functions/scrape-links.ts`
  - Navigates a Google Maps search page
  - Scrolls to fetch all results
  - Extracts unique listing URLs (`/maps/place/…`)

- `src/functions/gmap-details-lead-extractor.ts`
  - Navigates a listing URL
  - Blocks non-essential resources for speed
  - Parses static HTML with JSDOM
  - Extracts name, phone, website, rating, reviews count

- `src/functions/mongo-db.ts` and `src/functions/gmaps-save-to-db.ts`
  - Optional MongoDB helpers to upsert results in a hierarchical structure

- `src/utils/browser.ts`
  - Production-optimized Chromium launch options
  - `getBrowserOptions()` adjusts for `NODE_ENV`

- `src/utils/helpers.ts`
  - URL builder for Google Maps searches by query and location

- `src/utils/lead-filter-router.ts`
  - Example decisioning utility for routing leads based on available contact data

---

### Data Flow (Scrape path)

1) Client POSTs to `/gmaps/scrape` with:
   - `query`, `country`, `states[] { name, cities[] }`
2) Build Google Maps search URLs (`helpers.ts`)
3) `BrowserBatchHandler` orchestrates batches:
   - Phase 1: `scrape-links` collects place URLs per search page
   - Phase 2: `gmap-details-lead-extractor` extracts details per place URL
4) SSE messages stream progress and final results back to client
5) Optionally upsert to Mongo using `gmaps-save-to-db.ts`

---

### Concurrency & Performance

- Tuned by `MAX_BROWSER_SESSIONS` × `MAX_PAGES_PER_BROWSER`
- Resource blocking and headless flags for faster page loads
- Batching limits system load; add sleeps between batches if needed

---

### Error Handling & Resilience

- Per-page errors do not crash the batch; they are aggregated
- Browser and pages are always cleaned up in `finally`
- SSE `error` messages surface operational issues to the client
- Rate limit and CORS to reduce abuse

---

### Security Considerations

- `helmet` for headers
- CORS restricted by `ALLOWED_ORIGINS` (default `*` for internal use)
- Do not expose MongoDB helpers unless necessary; keep `MONGODB_URI` secure

