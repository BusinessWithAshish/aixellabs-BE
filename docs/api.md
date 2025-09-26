### API Reference

Base URL: `http://localhost:${PORT || 8100}`

---

#### GET /v1/ping

Health check endpoint.

Request:

```bash
curl -i http://localhost:8100/v1/ping
```

Response:

```json
{ "success": true, "message": "Server is running" }
```

---

#### GET /v1/test-browser

Launches a headless browser using the current `getBrowserOptions()` and verifies a basic navigation.

Request:

```bash
curl -s http://localhost:8100/v1/test-browser | jq
```

Response (example):

```json
{
  "success": true,
  "message": "Browser test successful",
  "title": "Google",
  "browserOptions": { "headless": "shell", "timeout": 60000, "args": ["--no-sandbox", "..."] }
}
```

---

#### POST /gmaps/scrape

Streams scraping progress and final results over Server-Sent Events (SSE). The job runs in two phases:

- Phase 1: Search pages are scrolled and listing URLs are collected
- Phase 2: Each listing page is navigated and details are extracted

Headers:

- `Content-Type: application/json`

Body schema (zod):

```json
{
  "query": "string",
  "country": "string",
  "states": [
    { "name": "string", "cities": ["string"] }
  ]
}
```

Example:

```bash
curl -N -H "Content-Type: application/json" \
  -X POST http://localhost:8100/gmaps/scrape \
  -d '{
    "query": "plumber",
    "country": "United States",
    "states": [{ "name": "California", "cities": ["San Francisco"] }]
  }'
```

SSE event format:

```text
data: { "type": "status" | "progress" | "error" | "complete", "message": "...", "data": { ... }, "timestamp": "..." }


```

Final `complete` payload example:

```json
{
  "type": "complete",
  "message": "Scraping completed successfully!",
  "data": {
    "founded": ["https://www.google.com/maps/place/..."],
    "foundedLeadsCount": 12,
    "allLeads": [
      {
        "website": "https://example.com",
        "phoneNumber": "+1-555-0000",
        "name": "Example Plumbing",
        "gmapsUrl": "https://maps.google.com/...",
        "overAllRating": "4.6",
        "numberOfReviews": "120"
      }
    ],
    "allLeadsCount": 12,
    "stage": "final_results"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Notes:

- Use an SSE-capable client. `curl -N` or a browser EventSource works.
- To cancel, close the connection from the client.

---

#### POST /gmaps/search_scrape

Aggregates results from the Google Places Text Search API.

Headers:

- `Content-Type: application/json`
- `X-Goog-Api-Key: ${GOOGLE_MAPS_PLACES_API_KEY}` is set by the server from environment variables.

Body schema:

```json
{
  "query": "string",
  "country": "string",
  "states": [
    { "name": "string", "cities": ["string"] }
  ]
}
```

Example:

```bash
curl -s -H "Content-Type: application/json" \
  -X POST http://localhost:8100/gmaps/search_scrape \
  -d '{
    "query": "plumber",
    "country": "United States",
    "states": [{ "name": "California", "cities": ["San Francisco"] }]
  }' | jq
```

Response (example):

```json
{ "success": true, "data": [ { "id": "...", "name": "..." } ] }
```

Errors:

- `400` — invalid body, missing or empty URL set
- `500` — upstream error or network issue

