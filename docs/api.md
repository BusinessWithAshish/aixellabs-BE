## API Reference

Base URL: `http://localhost:8100`


### Health

GET `/v1/ping`

Response

```json
{ "success": true, "message": "Server is running" }
```


### Browser self-test

GET `/v1/test-browser`

Description: Launches Puppeteer with current options and validates basic navigation to Google.

Response (200)

```json
{
  "success": true,
  "message": "Browser test successful",
  "title": "Google",
  "browserOptions": { /* LaunchOptions */ }
}
```


### Scrape listings + details (SSE)

POST `/gmaps/scrape`

Content-Type: `application/json`

Body schema

```json
{
  "query": "Digital marketing agencies",
  "country": "India",
  "states": [
    { "name": "Maharashtra", "cities": ["Pune", "Mumbai"] },
    { "name": "Gujarat", "cities": ["Ahmedabad"] }
  ]
}
```

Response: `text/event-stream` (Server-Sent Events)

Message types: `status`, `progress`, `error`, `complete`.

Example curl (streaming)

```bash
curl -N -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' \
  -X POST http://localhost:8100/gmaps/scrape \
  --data '{
    "query":"Digital marketing agencies",
    "country":"India",
    "states":[{"name":"Maharashtra","cities":["Pune"]}] 
  }'
```

Final `complete` payload shape

```json
{
  "type": "complete",
  "message": "Scraping completed successfully!",
  "data": {
    "founded": ["https://www.google.com/maps/place/..."],
    "foundedLeadsCount": 10,
    "allLeads": [
      {
        "website": "https://example.com",
        "phoneNumber": "+1234567890",
        "name": "Example Co",
        "gmapsUrl": "https://maps.app.goo.gl/...",
        "overAllRating": "4.6",
        "numberOfReviews": "218"
      }
    ],
    "allLeadsCount": 10,
    "stage": "final_results"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```


### Google Places Text Search (batched)

POST `/gmaps/search_scrape`

Body schema

```json
{
  "query": "Digital marketing agencies",
  "country": "India",
  "states": [
    { "name": "Maharashtra", "cities": ["Pune"] }
  ]
}
```

Notes

- Uses `GOOGLE_MAPS_PLACES_API_KEY`
- Aggregates across `nextPageToken` automatically with a small delay between pages

Response

```json
{ "success": true, "data": [ { "id": "...", "name": "..." } ] }
```


### OpenAPI

See `docs/openapi.yaml` for a machine-readable specification of the endpoints and schemas.

