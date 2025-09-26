## HTTP APIs

This project exposes two public endpoints via Express in `src/index.ts`:

- `POST /gmaps/scrape` — Scrapes Google Maps search results and streams progress and results via Server-Sent Events (SSE)
- `POST /gmaps/search_scrape` — Uses the Google Places Text Search API to fetch place data

Both endpoints expect a JSON body matching a common schema: query, country, and a list of states each containing cities.

### Common Request Body Schema

```json
{
  "query": "dentist",
  "country": "United States",
  "states": [
    { "name": "California", "cities": ["San Francisco", "Los Angeles"] }
  ]
}
```

### POST /gmaps/scrape (SSE)

Handler: `GMAPS_SCRAPE` from `src/apis/GMAPS_SCRAPE.ts`.

- Validates request using `GmapsScrapeSchema` (zod)
- Generates a set of Google Maps search URLs
- Streams status and progress updates, followed by final results
- Returns event stream with messages of types: `status`, `progress`, `error`, `complete`

Example curl (note: SSE response is a stream):

```bash
curl -N -X POST \
  -H 'Content-Type: application/json' \
  http://localhost:8100/gmaps/scrape \
  -d '{
    "query": "plumber",
    "country": "United States",
    "states": [{"name": "Texas", "cities": ["Austin", "Dallas"]}]
  }'
```

Sample event messages:

```json
data: {"type":"status","message":"Starting Google Maps scraping...","data":{"total":42,"stage":"api_start"},"timestamp":"..."}

data: {"type":"status","message":"Phase 1: Searching for business listings...","data":{"stage":"phase_1_start","phase":1},"timestamp":"..."}

data: {"type":"status","message":"Phase 2: Extracting details from 20 business listings...","data":{"stage":"phase_2_start","phase":2,"total":20},"timestamp":"..."}

data: {"type":"complete","message":"Scraping completed successfully!","data":{"founded":["..."],"foundedLeadsCount":20,"allLeads":[{"website":"..."}],"allLeadsCount":18,"stage":"final_results"},"timestamp":"..."}
```

Response schema (final complete message `data`):

- `founded`: string[] — listing URLs found in Phase 1
- `foundedLeadsCount`: number
- `allLeads`: array of extracted lead objects `{ website, phoneNumber, name, gmapsUrl, overAllRating, numberOfReviews }`
- `allLeadsCount`: number
- `stage`: `'final_results'`

Client consumption tips:

- Use an `EventSource` or stream-aware HTTP client
- Messages are newline-delimited `data: <json>` records
- Stop reading when you receive a `type: complete` event or the stream closes

Minimal browser example:

```javascript
const es = new EventSource('/gmaps/scrape'); // use a proxy or same-origin setup
es.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'status' || msg.type === 'progress') {
    console.log('progress:', msg);
  } else if (msg.type === 'complete') {
    console.log('results:', msg.data);
    es.close();
  } else if (msg.type === 'error') {
    console.error('error:', msg);
  }
};
```

### POST /gmaps/search_scrape

Handler: `GMAPS_SEARCH_API_SCRAPE` from `src/apis/GMAPS_SEARCH_API_SCRAPE.ts`.

- Validates request via `POSTv3ScrapeSchema` (zod)
- Calls `https://places.googleapis.com/v1/places:searchText`
- Paginates using `nextPageToken`, delays briefly when needed
- Responds with `{ success: true, data: places[] }`

Required env:

- `GOOGLE_MAPS_PLACES_API_KEY`

Example curl:

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -H "X-Goog-Api-Key: $GOOGLE_MAPS_PLACES_API_KEY" \
  http://localhost:8100/gmaps/search_scrape \
  -d '{
    "query": "coffee shop",
    "country": "United States",
    "states": [{"name": "New York", "cities": ["New York"]}]
  }'
```

Response:

```json
{ "success": true, "data": [ { "id": "...", "name": "..." } ] }
```

