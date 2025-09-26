## Database Utilities

### Connecting to MongoDB

Source: `src/functions/mongo-db.ts`

- `connectToDatabase(): Promise<MongoClient>` — connection pooling with safe reuse
- `getDatabase(dbName: string): Promise<{ db: Db, mongoClient: MongoClient }>` — convenience accessor

Environment variables:

- `MONGODB_URI`

Usage:

```ts
import { getDatabase } from '@/functions/mongo-db';

const { db } = await getDatabase('leads');
```

### Upserting Scrape Results

Function: `upsertScrapingResults` in `src/functions/mongo-db.ts`

Data model by collection (per country name lowercased):

- `state`
- `cities[]` with
  - `city_name`
  - `queries[]` with
    - `search_query`
    - `query_slug`
    - `leads[]` (normalized from scraped items)
- `timestamp`

Example:

```ts
await upsertScrapingResults(db, 'United States', 'Texas', 'Austin', 'plumber', scrapedItems);
```

Notes:

- The function creates indexes, inserts when missing, and pushes to existing arrays when present.

