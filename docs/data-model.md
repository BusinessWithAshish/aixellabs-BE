### Data Model (MongoDB)

The codebase includes optional helpers to persist scraping results in MongoDB. Usage is not wired by default; integrate as needed after scraping.

---

### Connection

- `src/functions/mongo-db.ts`
  - `connectToDatabase()` returns a pooled `MongoClient`
  - `getDatabase(dbName)` returns `{ db, mongoClient }`
  - Requires `MONGODB_URI`

---

### Upsert Strategy

- `src/functions/gmaps-save-to-db.ts` exposes `upsertScrapingResults(db, country, state, city, query, scrapeData)`
- Writes to a collection named after the lowercase `country`
- Hierarchical document structure:

```json
{
  "state": "California",
  "cities": [
    {
      "city_name": "San Francisco",
      "queries": [
        {
          "search_query": "plumber",
          "query_slug": "plumber",
          "leads": [
            {
              "name": "Example Plumbing",
              "phoneNumber": "+1-555-0000",
              "website": "https://example.com",
              "gmapsUrl": "https://maps.google.com/...",
              "overAllRating": "4.6",
              "numberOfReviews": "120"
            }
          ]
        }
      ]
    }
  ],
  "timestamp": "1st January 2025"
}
```

---

### Indexing

- Creates an index on `{ state: 1 }` per collection

---

### Notes

- `upsertScrapingResults` expects items shaped like the final leads with `leadInfo`
- Empty or null `leadInfo` are filtered; ensure extractor returns fields
- Consider deduplication keys (e.g., normalized `gmapsUrl` or `query_slug` + `name`)

