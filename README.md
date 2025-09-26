## Project Overview

This service provides Google Maps lead discovery and enrichment via two HTTP endpoints and a headless-browser scraping pipeline. It also includes helpers and utilities for browser configuration, URL generation, and MongoDB persistence.

- Public HTTP APIs: `POST /gmaps/scrape` (SSE streaming) and `POST /gmaps/search_scrape` (Google Places Text Search API wrapper)
- Core modules: `BrowserBatchHandler`, `scrapeLinks`, `GmapsDetailsLeadInfoExtractor`
- Utilities: browser launch options, constants, URL generation helpers
- Database utilities: MongoDB connection and upsert helpers

### Quickstart

1. Copy `.env.example` to `.env` and set variables.
2. Install dependencies and run the server.

```bash
pnpm install
pnpm start
```

The server listens on `PORT` (default `8100`).

### Documentation

See the docs folder for complete API and module documentation:

- `docs/apis.md`
- `docs/functions.md`
- `docs/utils.md`
- `docs/database.md`

