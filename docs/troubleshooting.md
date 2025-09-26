## Troubleshooting

### Chromium fails to launch

- Ensure system Chromium exists at `/usr/bin/chromium-browser` or remove the hardcoded path in `src/utils/browser.ts`
- Install a compatible browser for Puppeteer: `npx puppeteer browsers install chrome`
- Check container seccomp/apparmor and add `--no-sandbox` if running in restricted environments (already set)


### Empty results from `/gmaps/scrape`

- Confirm the payload has valid `country`, `states[{name, cities}]`, and `query`
- The scraper scrolls until it sees the end-of-list message; UI changes may break selectors
- Increase `DEFAULT_PAGE_LOAD_TIMEOUT` in `src/utils/constants.ts` for slow networks


### Places Text Search returns few items

- Ensure the Places API is enabled for the project bound to `GOOGLE_MAPS_PLACES_API_KEY`
- The field mask is minimal by design; expand if more fields are required


### Rate limiting errors

- Adjust `RATE_LIMIT_MAX` in environment
- Behind a proxy, ensure `trust proxy` is configured if adding IP-based logic


### Memory or CPU pressure

- Lower `MAX_BROWSER_SESSIONS` and/or `MAX_PAGES_PER_BROWSER`
- Prefer smaller batches when memory constrained

