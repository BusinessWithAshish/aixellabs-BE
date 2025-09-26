### Development Guide

---

### Prerequisites

- Node.js LTS (>= 18)
- pnpm
- Chromium available locally (or let Puppeteer manage Chrome)

---

### Install

```bash
pnpm install
cp .env.example .env
# Fill in GOOGLE_MAPS_PLACES_API_KEY and any other variables
```

---

### Running Locally

Option A: One-shot build and run

```bash
pnpm run start
```

Option B: Watch build and run Node separately

```bash
# Terminal 1
pnpm run build:watch

# Terminal 2
node dist/index.js
```

Open endpoints:

- `GET /v1/ping` — health
- `GET /v1/test-browser` — Puppeteer launch check

---

### TypeScript

- `tsconfig.json` targets `ES2022`, `module: NodeNext`, output to `dist/`
- Strict mode enabled

Build:

```bash
pnpm run build
```

---

### Testing SSE with curl

```bash
curl -N -H "Content-Type: application/json" \
  -X POST http://localhost:8100/gmaps/scrape \
  -d '{
    "query": "plumber",
    "country": "United States",
    "states": [{ "name": "California", "cities": ["San Francisco"] }]
  }'
```

You should see a stream of `status`/`progress` events followed by `complete`.

---

### Debugging Tips

- Log verbosity: `NODE_ENV=development` switches `morgan` to `dev`
- Puppeteer headless mode is disabled in development (`getBrowserOptions`)
- If Chrome fails to launch, test `/v1/test-browser` and review logs
- Adjust concurrency via `MAX_BROWSER_SESSIONS` and `MAX_PAGES_PER_BROWSER`

---

### Code Style

- Prefer descriptive names and early returns
- Handle errors with actionable messages (surface via SSE where relevant)
- Avoid unnecessary `try/catch`; do cleanup in `finally`

