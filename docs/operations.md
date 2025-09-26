### Operations

---

### Runtime Configuration

Environment variables (see `.env.example`):

- `PORT` — default `8100`
- `NODE_ENV` — `production` enables headless mode and combined logs
- `ALLOWED_ORIGINS` — CORS allowlist (comma-separated) or `*`
- `RATE_LIMIT_MAX` — requests per 15 minutes per IP
- `MAX_BROWSER_SESSIONS` × `MAX_PAGES_PER_BROWSER` — concurrency
- `GOOGLE_MAPS_PLACES_API_KEY` — for Places Text Search endpoint
- `MONGODB_URI` — required only if persisting with Mongo helpers

---

### Starting the Service

```bash
pnpm run start
```

Health check: `GET /v1/ping`

Browser diagnostics: `GET /v1/test-browser`

---

### Logging

- `morgan` emits request logs (`combined` in production, `dev` otherwise)
- SSE messages are also mirrored to the server console with emojis and severity tags

---

### Rate Limiting

- 15-minute window; max requests/IP set by `RATE_LIMIT_MAX` (default 100)
- Tune limits per environment to prevent abuse during public exposure

---

### Concurrency Tuning

- Increase `MAX_BROWSER_SESSIONS` and/or `MAX_PAGES_PER_BROWSER` to speed up scraping
- Ensure host has sufficient CPU/RAM; monitor for throttling or OOM
- Consider staggered batches and cooling periods for thermally constrained hosts

---

### Chromium

- In production, the launcher targets `/usr/bin/chromium-browser`
- Install via system package manager or adjust `src/utils/browser.ts`

---

### Troubleshooting

- Browser fails to launch
  - Check `/v1/test-browser`
  - Ensure Chromium exists and is executable
  - Try `--no-sandbox` environments (already configured)

- Empty results from `/gmaps/scrape`
  - Verify the payload is valid (states, cities, query)
  - Ensure Maps UI and selectors have not changed (selectors in `scrape-links.ts` and `gmap-details-lead-extractor.ts`)

- 400 errors
  - Body validation via `zod` failed; verify schema

- 500 errors
  - Inspect server logs; may indicate network issues or upstream changes

---

### Security

- Keep `GOOGLE_MAPS_PLACES_API_KEY` and `MONGODB_URI` secret
- Restrict CORS origins in production
- Consider additional auth for endpoints if exposed beyond internal networks

