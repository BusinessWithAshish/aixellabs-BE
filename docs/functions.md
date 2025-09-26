## Core Functions and Components

### BrowserBatchHandler

Source: `src/functions/common/browser-batch-handler.ts`

Signature:

```ts
BrowserBatchHandler<T>(
  urlItems: string[],
  scrapingFunction: (url: string, page: Page) => Promise<T>,
  res?: Response | null
): Promise<{ success: boolean; results: T[]; errors: string[]; successCount: number; errorCount: number; totalUrls: number; batches: number; duration: number; }>
```

Behavior:

- Batches URLs, launches multiple headless Chromium instances and pages
- Applies timeouts and robust error handling
- Optionally streams progress/status messages (`status`, `progress`, `error`, `complete`) to an Express `Response` (SSE)

Environment configuration:

- `MAX_BROWSER_SESSIONS` (default 10)
- `MAX_PAGES_PER_BROWSER` (default 5)

Usage example:

```ts
import { BrowserBatchHandler } from '@/functions/common/browser-batch-handler';
import { scrapeLinks } from '@/functions/scrape-links';

const { results } = await BrowserBatchHandler<string[]>(urls, scrapeLinks, null);
```

### scrapeLinks

Source: `src/functions/scrape-links.ts`

Signature:

```ts
scrapeLinks(url: string, page: Page): Promise<string[]>
```

Behavior:

- Opens a Google Maps search page and scrolls the results container until the end of the list
- Extracts unique business listing URLs (`/maps/place/...`) and returns absolute URLs

Usage example:

```ts
const urls = await scrapeLinks('https://www.google.com/maps/search/plumber+in+Austin,+TX,+United+States', page);
```

### GmapsDetailsLeadInfoExtractor

Source: `src/functions/gmap-details-lead-extractor.ts`

Types:

```ts
type TGoogleMapLeadInfo = {
  website: string;
  phoneNumber: string;
  name: string;
  gmapsUrl: string;
  overAllRating: string;
  numberOfReviews: string;
}
```

Signature:

```ts
GmapsDetailsLeadInfoExtractor(url: string, page: Page): Promise<TGoogleMapLeadInfo>
```

Behavior:

- Navigates to a listing page, intercepts and blocks non-critical resources
- Closes the Puppeteer page early after retrieving HTML for parsing speed
- Parses page HTML with JSDOM and extracts website, phone, name, rating, and review count

Usage example:

```ts
const lead = await GmapsDetailsLeadInfoExtractor(placeUrl, page);
```

### upsertScrapingResults

Source: `src/functions/mongo-db.ts`

Signature:

```ts
upsertScrapingResults(
  db: Db,
  country: string,
  state: string,
  city: string,
  query: string,
  scrapeData: any[]
): Promise<void>
```

Behavior:

- Converts raw scrape data to a compact leads array and upserts into a collection named by `country`
- Organizes data under `state -> cities[] -> queries[] -> leads[]`, updating `timestamp`

Usage example:

```ts
await upsertScrapingResults(db, 'United States', 'Texas', 'Austin', 'plumber', scrapedItems);
```

