# Function Documentation

This document provides detailed documentation for all key functions in the AixelLabs codebase, explaining their purpose, parameters, return values, and implementation details.

## Table of Contents

- [Browser Management](#browser-management)
- [Data Extraction](#data-extraction)
- [Database Operations](#database-operations)
- [Utility Functions](#utility-functions)
- [API Handlers](#api-handlers)

## Browser Management

### BrowserBatchHandler

**File:** `src/functions/common/browser-batch-handler.ts`

Main orchestration function for browser-based batch processing of URLs. This is the core of the scraping system that manages browser pools, coordinates concurrent operations, and provides real-time progress reporting.

```typescript
export const BrowserBatchHandler = async <T>(
    urlItems: string[],
    scrapingFunction: (url: string, page: Page) => Promise<T>,
    res: Response | null = null
): Promise<TBrowserBatchHandlerReturn<T>>
```

**Parameters:**
- `urlItems` - Array of URLs to process
- `scrapingFunction` - Function to execute on each URL/page
- `res` - Optional Express Response for streaming progress updates

**Returns:** Comprehensive processing results including success/error counts, extracted data, and performance metrics.

**Key Features:**
- Manages browser pool with configurable concurrency
- Implements batch processing for large URL sets
- Provides real-time progress updates via Server-Sent Events
- Automatic resource cleanup and error recovery
- Performance monitoring and statistics collection

### processSingleBrowser

**File:** `src/functions/common/browser-batch-handler.ts`

Processes a batch of URLs using a single browser instance with multiple pages.

```typescript
const processSingleBrowser = async <T>(
    urlItems: string[],
    browserIndex: number,
    batchNumber: number,
    scrapingFunction: (url: string, page: Page) => Promise<T>,
    res: Response | null = null
): Promise<SingleBrowserResult<T>>
```

**Process Flow:**
1. Launch browser with optimized configuration
2. Create concurrent promises for each URL (one page per URL)
3. Execute scraping function on each page
4. Collect results and handle errors
5. Clean up all pages and browser resources

### processBatchOfBrowsers

**File:** `src/functions/common/browser-batch-handler.ts`

Processes a batch of URLs by distributing them across multiple browser instances.

```typescript
const processBatchOfBrowsers = async <T>(
    urlItems: string[],
    batchNumber: number,
    scrapingFunction: (url: string, page: Page) => Promise<T>,
    res: Response | null = null
): Promise<SingleBrowserResult<T>[]>
```

**Resource Distribution:**
- URLs are distributed evenly across available browsers
- Each browser processes up to `MAX_PAGES_PER_BROWSER` URLs
- Excess URLs are processed in subsequent batches

## Data Extraction

### scrapeLinks

**File:** `src/functions/scrape-links.ts`

Scrapes business listing URLs from Google Maps search results pages. This implements the first phase of the scraping process: URL discovery.

```typescript
export const scrapeLinks = async (url: string, page: Page): Promise<string[]>
```

**Parameters:**
- `url` - Google Maps search URL to scrape
- `page` - Puppeteer page instance

**Returns:** Array of unique business listing URLs

**Process Flow:**
1. Set realistic User-Agent to avoid detection
2. Navigate to search results page
3. Find results container using aria-label
4. Implement infinite scroll to load all results
5. Detect end of results using specific UI elements
6. Extract all business listing links
7. Filter duplicates and normalize URLs

**Key Features:**
- Infinite scroll simulation to load all results
- End-of-results detection
- Duplicate URL filtering
- User-Agent spoofing for better compatibility
- Robust error handling for dynamic content

### GmapsDetailsLeadInfoExtractor

**File:** `src/functions/gmap-details-lead-extractor.ts`

Extracts detailed business information from individual Google Maps business listing pages.

```typescript
export const GmapsDetailsLeadInfoExtractor = async (
    url: string, 
    page: Page
): Promise<TGoogleMapLeadInfo>
```

**Parameters:**
- `url` - Google Maps business listing URL
- `page` - Puppeteer page instance

**Returns:** Structured business information object

**Data Points Extracted:**
- Business name
- Phone number  
- Website URL
- Google Maps URL
- Overall rating
- Number of reviews

**Process Flow:**
1. Set up request interception to block unnecessary resources
2. Navigate to business listing page
3. Extract HTML content and current URL
4. Close page immediately for resource efficiency
5. Clean HTML content to prevent parsing errors
6. Parse HTML using JSDOM for reliable DOM manipulation
7. Extract business data using CSS selectors
8. Handle special cases (temporarily closed businesses)
9. Return structured data with "N/A" for missing information

**Performance Optimizations:**
- Request interception blocks 70-90% of unnecessary resources
- Page is closed immediately after HTML extraction
- JSDOM parsing happens locally without network requests
- CSS and style tags are removed to speed up parsing

### gmapsSetupRequestInterception

**File:** `src/functions/gmap-details-lead-extractor.ts`

Sets up request interception for a Puppeteer page to block unnecessary resources.

```typescript
export const gmapsSetupRequestInterception = async (page: Page)
```

**Blocked Resources:**
- Images (JPG, PNG, GIF, WebP, SVG, ICO)
- Stylesheets and fonts (CSS, EOT)
- Media files (video, audio)
- Analytics and tracking scripts
- Social media widgets

**Performance Benefits:**
- 60-80% reduction in page load time
- 70-90% reduction in bandwidth usage
- 50-70% reduction in memory usage

## Database Operations

### connectToDatabase

**File:** `src/functions/mongo-db.ts`

Establishes and manages MongoDB database connections using the singleton pattern.

```typescript
export function connectToDatabase(): Promise<MongoClient>
```

**Returns:** Promise resolving to MongoDB client instance

**Features:**
- Connection pooling for performance
- Singleton pattern for resource efficiency
- Automatic reconnection on failure
- Error handling and cleanup

### getDatabase

**File:** `src/functions/mongo-db.ts`

Retrieves a database instance and MongoDB client for database operations.

```typescript
export async function getDatabase(dbName: string): Promise<{ 
    db: Db, 
    mongoClient: MongoClient 
}>
```

**Parameters:**
- `dbName` - Name of the database to connect to

**Returns:** Object containing database instance and client

### upsertScrapingResults

**File:** `src/functions/gmaps-save-to-db.ts`

Main function to upsert scraping results to MongoDB with intelligent document structure management.

```typescript
const upsertScrapingResults = async (
    db: Db,
    country: string,
    state: string,
    city: string,
    query: string,
    scrapeData: any[]
): Promise<void>
```

**Parameters:**
- `db` - MongoDB database instance
- `country` - Country name for collection selection
- `state` - State/province name
- `city` - City name
- `query` - Search query used
- `scrapeData` - Array of scraped business data

**Upsert Logic:**
1. Check if state document exists
2. If state exists, check if city exists
3. If city exists, check if query exists
4. Append to existing or create new as needed

**Document Structure:**
```json
{
  "state": "State Name",
  "cities": [
    {
      "city_name": "City Name",
      "queries": [
        {
          "search_query": "Original Query",
          "query_slug": "url-friendly-slug",
          "leads": [BusinessData...]
        }
      ]
    }
  ],
  "timestamp": "Human Readable Date"
}
```

## Utility Functions

### generateGoogleMapsUrls

**File:** `src/utils/helpers.ts`

Generates Google Maps search URLs for all combinations of locations and queries.

```typescript
export function generateGoogleMapsUrls(data: GmapsScrape): string[]
```

**Parameters:**
- `data` - Structured scraping request data

**Returns:** Array of Google Maps search URLs

**Process Flow:**
1. Iterate through each state in the request
2. For each state, iterate through each city
3. Generate a Google Maps URL for the query in that specific location
4. Collect all URLs with their metadata
5. Return just the URLs for scraping

### createGoogleMapsUrl

**File:** `src/utils/helpers.ts`

Creates a properly formatted Google Maps search URL for a specific business query and location.

```typescript
function createGoogleMapsUrl(
    query: string, 
    city: string, 
    state: string, 
    country: string
): string
```

**Parameters:**
- `query` - Business type or service to search for
- `city` - City name to search in
- `state` - State/province name
- `country` - Country name

**Returns:** Properly formatted Google Maps search URL

**URL Construction Process:**
1. Clean and format the business query
2. Create geographic location string
3. Combine query with location using "in" connector
4. URL encode the search term while preserving + symbols
5. Append to Google Maps base URL

### getBrowserOptions

**File:** `src/utils/browser.ts`

Returns optimized browser launch options based on environment.

```typescript
export const getBrowserOptions = async (): Promise<LaunchOptions>
```

**Returns:** Puppeteer launch options object

**Configuration Features:**
- Environment-specific settings (development vs production)
- 80+ optimized browser arguments
- Resource blocking for performance
- Security and stability configurations

## API Handlers

### GMAPS_SCRAPE

**File:** `src/apis/GMAPS_SCRAPE.ts`

Main web scraping endpoint handler that orchestrates the complete scraping process.

```typescript
export const GMAPS_SCRAPE = async (req: Request, res: Response)
```

**Process Flow:**
1. Validate request body using Zod schema
2. Generate Google Maps URLs from geographic data
3. Set up Server-Sent Events headers
4. Phase 1: Scrape business listing URLs
5. Phase 2: Extract detailed business information
6. Stream progress updates throughout
7. Return final results

**Features:**
- Real-time progress streaming via SSE
- Two-phase processing (URL discovery + data extraction)
- Comprehensive error handling
- Input validation with Zod schemas

### GMAPS_SEARCH_API_SCRAPE

**File:** `src/apis/GMAPS_SEARCH_API_SCRAPE.ts`

Google Places API integration endpoint for basic business information retrieval.

```typescript
export const GMAPS_SEARCH_API_SCRAPE = async (req: Request, res: Response)
```

**Features:**
- Google Places API integration
- Automatic pagination handling
- Rate limiting compliance
- Field mask optimization for cost efficiency

## Type Definitions

### TGoogleMapLeadInfo

Business information structure returned by the data extraction functions.

```typescript
export type TGoogleMapLeadInfo = {
    website: string;
    phoneNumber: string;
    name: string;
    gmapsUrl: string;
    overAllRating: string;
    numberOfReviews: string;
}
```

### TBrowserBatchHandlerReturn

Comprehensive return type for browser batch processing operations.

```typescript
type TBrowserBatchHandlerReturn<T> = {
    success: boolean;
    results: T[];
    errors: string[];
    successCount: number;
    errorCount: number;
    totalUrls: number;
    batches: number;
    duration: number;
}
```

### StreamMessage

Type definition for Server-Sent Events messages.

```typescript
type StreamMessage = {
    type: 'progress' | 'status' | 'error' | 'complete';
    message: string;
    data?: {
        current?: number;
        total?: number;
        percentage?: number;
        stage?: string;
        batch?: number;
        browser?: number;
    };
    timestamp: string;
}
```

## Error Handling Patterns

### Page-Level Errors
- Individual page failures don't stop browser processing
- Errors are collected and reported in results
- Failed URLs are marked with error messages

### Browser-Level Errors
- Browser failures don't stop batch processing
- Resources are cleaned up automatically
- Error recovery allows continued processing

### System-Level Errors
- Critical errors are logged and reported
- Graceful degradation when possible
- Comprehensive error information in responses

## Performance Considerations

### Resource Management
- Automatic cleanup of browsers and pages
- Connection pooling for database operations
- Memory usage monitoring and optimization

### Concurrency Control
- Configurable browser and page limits
- Batch processing to manage system resources
- Rate limiting and delay mechanisms

### Optimization Techniques
- Request interception to block unnecessary resources
- JSDOM parsing for reliable data extraction
- Efficient URL generation and processing
- Connection reuse and pooling

---

This documentation provides comprehensive coverage of all major functions in the AixelLabs system. Each function is designed with performance, reliability, and maintainability in mind, following established patterns and best practices for web scraping applications.