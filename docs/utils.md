## Utilities

### Browser Options

Source: `src/utils/browser.ts`

- `optimisedBrowserArgs`: Chromium flags to reduce resource usage and speed up scraping
- `getBrowserOptions()`: Returns Puppeteer `LaunchOptions` based on `NODE_ENV`

Environment:

- `NODE_ENV` (production uses `'shell'` headless and `/usr/bin/chromium-browser`)

Example:

```ts
import puppeteer from 'puppeteer';
import { getBrowserOptions } from '@/utils/browser';

const browser = await puppeteer.launch(await getBrowserOptions());
```

### Constants

Source: `src/utils/constants.ts`

- `GOOGLE_MAPS_BASE_URL`
- `GOOGLE_MAPS_TEXTSEARCH_API_URL`
- `GOOGLE_MAPS_TEXT_FREE_FIELD_MASKS`
- `DEFAULT_PAGE_LOAD_TIMEOUT`

### URL Helpers

Source: `src/utils/helpers.ts`

- `generateGoogleMapsUrls(data: GmapsScrape): string[]`
  - Builds encoded Google Maps search URLs from `query`, `country`, `states[].cities[]`

Example:

```ts
import { generateGoogleMapsUrls } from '@/utils/helpers';

const urls = generateGoogleMapsUrls({
  query: 'electrician',
  country: 'United States',
  states: [{ name: 'California', cities: ['San Diego'] }]
});
```

### Lead Routing Helper (example/demo)

Source: `src/utils/lead-filter-router.ts`

- `leadFilter({ leadInfo })`: Returns a routing recommendation based on available contact channels

Example:

```ts
const decision = leadFilter({
  leadInfo: {
    email: 'hello@example.com',
    phoneNumber: '+11234567890',
    websiteUrl: 'https://example.com',
    socialProfiles: ['https://linkedin.com/company/example']
  }
});
```

