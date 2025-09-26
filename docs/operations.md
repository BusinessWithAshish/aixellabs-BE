## Operations

### Concurrency tuning

- `MAX_BROWSER_SESSIONS` × `MAX_PAGES_PER_BROWSER` controls total concurrent URLs processed
- Start conservative on small machines (e.g., 2 × 3) and scale up


### Server-Sent Events (SSE) considerations

- Reverse proxies (Nginx, ELB, Cloudflare) may buffer or time out long-lived connections
- Disable buffering for SSE paths and raise proxy timeouts
- Clients should reconnect on network errors; the server emits frequent `status`/`progress` events


### Chromium configuration

- Production uses headless `'shell'` mode with `executablePath` `/usr/bin/chromium-browser`
- The launch args in `src/utils/browser.ts` disable heavy features for faster, cheaper scraping
- Verify with `GET /v1/test-browser`


### Logging

- Morgan: `combined` in production, `dev` otherwise
- SSE messages are also logged to stdout with emoji tag prefixes


### Health and readiness

- `GET /v1/ping` returns a simple health indicator
- Consider adding a container healthcheck probing `/v1/ping`


### Deployment notes

- Node 18+ runtime
- Ensure `GOOGLE_MAPS_PLACES_API_KEY` and any DB credentials are injected securely
- Consider PM2 or systemd for process supervision

