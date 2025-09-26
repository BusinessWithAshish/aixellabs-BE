## Architecture

### High-level

- Express server (`src/index.ts`) exposes REST endpoints and an SSE stream
- Scraping pipeline uses Puppeteer with tuned launch args and a batching layer
- DOM parsing is done with JSDOM to extract structured data from Google Maps place pages
- Optional MongoDB helper demonstrates how to upsert scraped results in a nested structure


### Modules

- `src/index.ts`
  - Security: Helmet, disables `x-powered-by`
  - CORS based on `ALLOWED_ORIGINS`
  - JSON body parsing (1 MB limit)
  - Request logging with Morgan
  - Rate limiting (15 min window, `RATE_LIMIT_MAX`)
  - Routes:
    - `GET /v1/ping`
    - `GET /v1/test-browser`
    - `POST /gmaps/scrape`
    - `POST /gmaps/search_scrape`

- `src/apis/GMAPS_SCRAPE.ts`
  - Validates body with Zod: `{ query, country, states: [{ name, cities: [] }] }`
  - Generates Google Maps search URLs for each city
  - Streams progress and final results via Server-Sent Events (SSE)
  - Two phases:
    1. Discover listing URLs via `scrapeLinks`
    2. Extract details via `GmapsDetailsLeadInfoExtractor`

- `src/apis/GMAPS_SEARCH_API_SCRAPE.ts`
  - Calls Google Places Text Search API (`places.googleapis.com/v1/places:searchText`)
  - Paginates using `nextPageToken`, aggregates `places` into a single array
  - Requires `GOOGLE_MAPS_PLACES_API_KEY`

- `src/functions/common/browser-batch-handler.ts`
  - Orchestrates concurrent scraping across multiple Chromium processes and pages
  - Tuned by env vars: `MAX_BROWSER_SESSIONS` × `MAX_PAGES_PER_BROWSER`
  - Emits structured SSE messages at each stage; aggregates success/errors

- `src/functions/scrape-links.ts`
  - Loads the Google Maps results page for a query/location
  - Scrolls until “You’ve reached the end of the list.” and extracts unique place URLs

- `src/functions/gmap-details-lead-extractor.ts`
  - Navigates to each place page
  - Blocks heavy resources; strips styles in HTML; parses with JSDOM
  - Extracts: `website`, `phoneNumber`, `name`, `gmapsUrl`, `overAllRating`, `numberOfReviews`

- `src/utils/helpers.ts`
  - Builds Google Maps search URLs from the request payload

- `src/utils/browser.ts`
  - Exposes `getBrowserOptions()` with dozens of Chromium flags optimized for scraping
  - Headless mode is `'shell'` in production; `executablePath` uses `/usr/bin/chromium-browser`

- `src/functions/mongo-db.ts` and `src/functions/gmaps-save-to-db.ts`
  - `connectToDatabase()` / `getDatabase()` helpers (uses `MONGODB_URI`)
  - `upsertScrapingResults()` stores results in a nested structure by state → city → query


### Data flow (SSE endpoint)

1. Client posts search payload to `/gmaps/scrape`
2. Server generates search URLs and starts batched scraping
3. Progress is streamed as SSE messages; clients render progress bars or logs
4. Final `complete` message includes `founded` URLs and `allLeads` details
5. Optional: persist to Mongo using the provided helper


### Concurrency model

- A batch consists of N browsers with M pages each
- All pages in a browser run concurrently; batches run sequentially to control resource usage
- Tuning knobs:
  - `MAX_BROWSER_SESSIONS` (default 10)
  - `MAX_PAGES_PER_BROWSER` (default 5)

