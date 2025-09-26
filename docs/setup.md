## Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm
- Chromium installed on the host (for production) or allow Puppeteer to manage browsers
- A Google Cloud API key with Places API enabled (for `/gmaps/search_scrape`)


### Install

```bash
pnpm install
```


### Environment

Copy `.env.example` to `.env` and adjust values.

Common variables:

- `PORT=8100`
- `ALLOWED_ORIGINS=*`
- `RATE_LIMIT_MAX=100`
- `MAX_BROWSER_SESSIONS=10`
- `MAX_PAGES_PER_BROWSER=5`
- `GOOGLE_MAPS_PLACES_API_KEY=...`
- `MONGODB_URI=mongodb+srv://...` (optional)


### Run (development or local)

```bash
pnpm run start
# builds TypeScript and runs dist/index.js
```

For a faster inner loop you can run compilation in watch mode and restart the compiled server separately:

```bash
# Terminal 1
pnpm run build:watch

# Terminal 2
nodemon --watch dist dist/index.js
```


### Verify environment

```bash
curl -s http://localhost:8100/v1/test-browser | jq
```

If Chromium fails to launch:

- Install system Chromium and ensure the binary exists at `/usr/bin/chromium-browser` (configurable in `src/utils/browser.ts`)
- Or allow Puppeteer to install a compatible browser: `npx puppeteer browsers install chrome`


### EC2 one-shot script

An example EC2 bootstrap script is included at `src/setup.sh`. Adapt credentials and environment as needed.

