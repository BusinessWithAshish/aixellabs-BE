import puppeteer, {Browser, Page} from "puppeteer";
import {getBrowserOptions} from "../../utils/browser";
import {config} from "dotenv";

config();

// Configuration constants
const MAX_BROWSER_SESSIONS = Number(process.env.MAX_BROWSER_SESSIONS) || 10;
const MAX_PAGES_PER_BROWSER = Number(process.env.MAX_PAGES_PER_BROWSER) || 5;
const TOTAL_CONCURRENT_URLS = MAX_BROWSER_SESSIONS * MAX_PAGES_PER_BROWSER;

type EachPageResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
}

type SingleBrowserResult<T> = {
  results: EachPageResult<T>[];
  error?: string;
  browserIndex: number;
}

const processSingleBrowser = async <T>(
    urlItems: string[],
    browserIndex: number,
    batchNumber: number,
    scrapingFunction: (url: string, page: Page) => Promise<T>
): Promise<SingleBrowserResult<T>> => {

  let browser: Browser | null = null;
  const pages: Page[] = [];

  try {
    console.log(`🚀 Launching Browser ${browserIndex} for ${urlItems.length} URLs...`);

    const browserOptions = await getBrowserOptions();
    browser = await puppeteer.launch(browserOptions);

    if (!browser) {
      console.error(`❌ Browser ${browserIndex} of batch number ${batchNumber} failed to launch - browser is null`);
      return {
        results: [],
        error: `Browser launch failed - browser is null`,
        browserIndex
      };
    }

    // Process each URL with its own page
    const pagePromises = urlItems.map(async (url, pageIndex): Promise<EachPageResult<T>> => {
      let page: Page | null = null;

      try {
        console.log(`Batch ${batchNumber}: \n 📄 Browser ${browserIndex}-Page ${pageIndex + 1}: Processing`);

        page = await browser!.newPage();
        pages.push(page);

        // Set page timeout and other configurations
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);

        const scrapeData = await scrapingFunction(url, page);

        console.log(`✅ Completed for Browser ${browserIndex} at ${pageIndex + 1} for url: ${url}`);

        return { success: true, data: scrapeData };

      } catch (pageScrapeError) {
        console.error(`❌ Failed for Browser ${browserIndex} at ${pageIndex + 1} for url: ${url} `, pageScrapeError);
        const errorMessage = pageScrapeError instanceof Error ? pageScrapeError.message : String(pageScrapeError);
        return { success: false, error: `Page had error for this url ${url} at Browser ${browserIndex} for page ${pageIndex + 1} : ${errorMessage}` };
      }
    });

    const results = await Promise.all(pagePromises);

    console.log(`🎉 Browser ${browserIndex} completed all ${urlItems.length} URLs`);

    return {
      results,
      browserIndex
    };

  } catch (browserScrapeError) {
    console.error(`💥 Browser ${browserIndex} had critical error:`, browserScrapeError);

    const errorMessage = browserScrapeError instanceof Error ? browserScrapeError.message : String(browserScrapeError);

    return {
      results: [],
      error: errorMessage,
      browserIndex
    };

  } finally {
    // Cleanup pages first
    console.log(`🧹 Browser ${browserIndex}: Cleaning up ${pages.length} pages...`);

    for (let i = 0; i < pages.length; i++) {
      try {
        const page = pages[i];
        if (page && !page.isClosed()) {
          await page.close();
        }
      } catch (pageCloseError) {
        console.error(`⚠️ Browser ${browserIndex}-Page ${i + 1}: Error closing page:`, pageCloseError);
      }
    }

    // Then cleanup browser
    if (browser) {
      try {
        await browser.close();
        console.log(`🔒 Browser ${browserIndex}: Closed successfully`);
      } catch (browserCloseError) {
        console.error(`⚠️ Browser ${browserIndex}: Error closing browser:`, browserCloseError);
      }
    }
  }
};

const processBatchOfBrowsers = async <T>(
    urlItems: string[],
    batchNumber: number,
    scrapingFunction: (url: string, page: Page) => Promise<T>
): Promise<SingleBrowserResult<T>[]> => {
  console.log(`\n🔄 Processing Batch ${batchNumber} (${urlItems.length} URLs)`);
  console.log(`📊 Batch ${batchNumber}:`);

  // Split URLs into groups for each browser
  const browserPagesBatches: string[][] = [];
  for (let i = 0; i < urlItems.length; i += MAX_PAGES_PER_BROWSER) {
    browserPagesBatches.push(urlItems.slice(i, i + MAX_PAGES_PER_BROWSER));
  }

  // Process all browsers in this batch concurrently
  const browserPromises = browserPagesBatches.map((batchUrls, index) =>
    processSingleBrowser(batchUrls, index + 1, batchNumber, scrapingFunction)
  );

  const browserResults = await Promise.all(browserPromises);
  const flattenedBrowserResults = browserResults.flat();

  console.log(`✅ Batch ${batchNumber} completed: ${flattenedBrowserResults.length} results`);

  // Add delay between batches to prevent overwhelming the system
  console.log(`⏳ Batch ${batchNumber}: Waiting 10 seconds before next batch...`);
  await new Promise(resolve => setTimeout(resolve, 10));

  // Check for device temperature here, if greater than certain threshold then sleep for 10 minutes and then
  // continue further

  return flattenedBrowserResults;
};

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

export const BrowserBatchHandler = async <T>(
    urlItems: string[],
    scrapingFunction: (url: string, page: Page) => Promise<T>
): Promise<TBrowserBatchHandlerReturn<T>> => {
  const startTime = Date.now();
  console.log(`\n🎯 Starting scraping process for ${urlItems.length} URLs`);
  console.log(`⚙️ Configuration: ${MAX_BROWSER_SESSIONS} browsers × ${MAX_PAGES_PER_BROWSER} pages = ${TOTAL_CONCURRENT_URLS} concurrent URLs per batch`);

  try {
    // Split all URLs into batches that can be processed simultaneously
    const batches: string[][] = [];
    for (let i = 0; i < urlItems.length; i += TOTAL_CONCURRENT_URLS) {
      batches.push(urlItems.slice(i, i + TOTAL_CONCURRENT_URLS));
    }

    console.log(`📦 Total number of batches to process: ${batches.length}`);

    const aggregatedResults: T[] = [];
    const aggregatedErrors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each batch sequentially to manage resource usage
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      try {
        const currentBatchResults = await processBatchOfBrowsers(batches[batchIndex], batchIndex + 1, scrapingFunction);
        // Extract results and errors from each browser result
        currentBatchResults.forEach(browserResult => {
          // Add errors from this browser
          if (browserResult.error) {
            aggregatedErrors.push(browserResult.error);
          }

          // Process each page result
          browserResult.results.forEach(pageResult => {
            if (pageResult.success && pageResult.data) {
              aggregatedResults.push(pageResult.data);
              successCount++;
            } else if (pageResult.error) {
              aggregatedErrors.push(pageResult.error);
              errorCount++;
            }
          });
        });

        console.log(`📈 Batch ${batchIndex + 1} Summary: ${successCount} total successful, ${errorCount} total failed`);
        console.log(`📊 Overall Progress: ${successCount + errorCount}/${urlItems.length} URLs processed`);

      } catch (batchError) {
        console.error(`💥 Batch ${batchIndex + 1} failed completely:`, batchError);

        // Add error for this entire batch
        const batchErrorMessage = `Batch ${batchIndex + 1} processing failed: ${batchError instanceof Error ? batchError.message : String(batchError)}`;
        aggregatedErrors.push(batchErrorMessage);
        errorCount += batches[batchIndex].length;
      }
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(`\n🏁 Scraping completed!`);
    console.log(`⏱️ Total time: ${duration/60} mins`);
    console.log(`✅ Successful: ${successCount}/${urlItems.length}`);
    console.log(`❌ Failed: ${errorCount}/${urlItems.length}`);
    console.log(`📊 Success rate: ${((successCount / urlItems.length) * 100).toFixed(1)}%`);

    return {
      success: errorCount < urlItems.length, // Success if not all URLs failed
      results: aggregatedResults,
      errors: aggregatedErrors,
      duration,
      errorCount,
      successCount,
      batches: batches.length,
      totalUrls: urlItems.length,
    };

  } catch (error) {
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.error("💥 Critical error in parallel browser initialization:", error);

    return {
      duration,
      success: false,
      results: [],
      errors: [error instanceof Error ? error.message : String(error)],
      batches: 0,
      successCount: 0,
      errorCount: urlItems.length, // All URLs failed
      totalUrls: urlItems.length
    };
  }
};

// Save to database immediately after successful scrape
// try {
//   await upsertScrapingResults(db, item.country, item.state, item.city, item.query, scrapeData);
//   console.log(`💾 Database updated for ${item.city}, ${item.state} - ${item.query}`);
// } catch (dbError) {
//   console.error(`❌ Database save failed for ${item.city}, ${item.state}:`, dbError);
//   // Continue processing even if DB save fails
// }