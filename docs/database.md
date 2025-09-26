## Database model (optional)

This project includes helpers to connect to MongoDB and an example upsert shape for scraped leads. Persistence is optional; the core API streams results without storing them.


### Connection helpers

- `src/functions/mongo-db.ts`
  - `connectToDatabase()` returns a pooled `MongoClient`
  - `getDatabase(dbName)` returns `{ db, mongoClient }`

Environment:

- `MONGODB_URI=mongodb+srv://...`


### Upsert shape

- `src/functions/gmaps-save-to-db.ts` exposes `upsertScrapingResults(db, country, state, city, query, scrapeData)` that transforms scraped items into a nested structure:

```
collection: <country.toLowerCase()>

document: {
  state: string,
  cities: [
    {
      city_name: string,
      queries: [
        {
          search_query: string,
          query_slug: string,
          leads: [
            {
              name: string,
              phoneNumber: string,
              website: string,
              gmapsUrl: string,
              overAllRating: string,
              numberOfReviews: string
            }
          ]
        }
      ]
    }
  ],
  timestamp: string
}
```

Behavior:

- Creates an index on `{ state: 1 }`
- Inserts the state if missing; else upserts city; then upserts query; appends leads
- Updates `timestamp` to a human-friendly date on every write


### Using the helper

```ts
import { getDatabase } from "../functions/mongo-db";
import { upsertScrapingResults } from "../functions/gmaps-save-to-db";

const { db } = await getDatabase("aixellabs");
await upsertScrapingResults(db, "India", "Maharashtra", "Pune", "Digital marketing agencies", leadsArray);
```

Note: The sample formats and prompts in `src/utils/*.txt` illustrate intended shapes for state/city/query documents.

