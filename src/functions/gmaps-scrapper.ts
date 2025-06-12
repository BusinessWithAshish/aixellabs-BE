import puppeteer, { Browser, Page } from "puppeteer-core";
import { scrapeMapItems } from "./scrape-map-item-v1";
import { getBrowserOptions } from "../utils/browser";
import { TGoogleMapsUrls } from "../utils/helpers";
import { getDatabase } from "./mongo-db";
import { config } from "dotenv";
import { upsertScrapingResults } from "./gmaps-save-to-db";
import { scrapeMapItemsV2 } from "./scrape-map-items-v2";
import { scrapeMapItemsV3 } from "./scrape-map-items-v3";
config();

// Configuration constants
const MAX_BROWSER_SESSIONS = 8;
const MAX_PAGES_PER_BROWSER = 3;
const TOTAL_CONCURRENT_URLS = MAX_BROWSER_SESSIONS * MAX_PAGES_PER_BROWSER;

type ScrapeResult = TGoogleMapsUrls & {
  data?: any;
  error?: string;
  browserIndex?: number;
  pageIndex?: number;
}

const processBrowserBatch = async (
  urlItems: TGoogleMapsUrls[],
  browserIndex: number
): Promise<ScrapeResult[]> => {

  const dbName = process.env.WORLD_LEADS_DB_NAME as string
  const { db } = await getDatabase(dbName);

  let browser: Browser | null = null;
  const pages: Page[] = [];
  const results: ScrapeResult[] = [];

  try {
    console.log(`🚀 Launching Browser ${browserIndex} for ${urlItems.length} URLs...`);

    const browserOptions = await getBrowserOptions();
    browser = await puppeteer.launch(browserOptions);

    if (!browser) {
      console.error(`❌ Browser ${browserIndex} failed to launch`);
      return urlItems.map(item => ({
        ...item,
        error: "Browser launch failed",
        browserIndex
      }));
    }

    // Process each URL with its own page
    const scrapePromises = urlItems.map(async (item, pageIndex) => {
      let page: Page | null = null;

      try {
        console.log(`📄 Browser ${browserIndex}-Page ${pageIndex + 1}: Processing ${item.city}, ${item.state} - ${item.query}`);

        page = await browser!.newPage();
        pages.push(page);

        // Set page timeout and other configurations
        page.setDefaultTimeout(60000); // 60 seconds timeout
        page.setDefaultNavigationTimeout(60000);

        const scrapeData = await scrapeMapItemsV3(item.url, page);

        // Save to database immediately after successful scrape
        // try {
        //   await upsertScrapingResults(db, item.country, item.state, item.city, item.query, scrapeData);
        //   console.log(`💾 Database updated for ${item.city}, ${item.state} - ${item.query}`);
        // } catch (dbError) {
        //   console.error(`❌ Database save failed for ${item.city}, ${item.state}:`, dbError);
        //   // Continue processing even if DB save fails
        // }

        console.log(`✅ Browser ${browserIndex}-Page ${pageIndex + 1}: Completed ${item.city}, ${item.state}`);

        return {
          ...item,
          data: scrapeData,
          browserIndex,
          pageIndex: pageIndex + 1
        };

      } catch (scrapeError) {
        console.error(`❌ Browser ${browserIndex}-Page ${pageIndex + 1}: Scraping failed for ${item.city}, ${item.state}:`, scrapeError);

        return {
          ...item,
          error: scrapeError instanceof Error ? scrapeError.message : String(scrapeError),
          browserIndex,
          pageIndex: pageIndex + 1
        };
      }
    });

    const batchResults = await Promise.all(scrapePromises);
    results.push(...batchResults);

    console.log(`🎉 Browser ${browserIndex} completed all ${urlItems.length} URLs`);
    return results;

  } catch (error) {
    console.error(`💥 Browser ${browserIndex} critical error:`, error);

    return urlItems.map((item, index) => ({
      ...item,
      error: error instanceof Error ? error.message : String(error),
      browserIndex,
      pageIndex: index + 1
    }));

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

const processSingleBatch = async (urlItems: TGoogleMapsUrls[], batchNumber: number): Promise<ScrapeResult[]> => {
  console.log(`\n🔄 Processing Batch ${batchNumber} (${urlItems.length} URLs)`);
  console.log(`📊 Batch ${batchNumber}: Using ${MAX_BROWSER_SESSIONS} browsers with ${MAX_PAGES_PER_BROWSER} pages each`);

  // Split URLs into groups for each browser
  const browserPagesBatches: TGoogleMapsUrls[][] = [];
  for (let i = 0; i < urlItems.length; i += MAX_PAGES_PER_BROWSER) {
    browserPagesBatches.push(urlItems.slice(i, i + MAX_PAGES_PER_BROWSER));
  }

  // Process all browsers in this batch concurrently
  const browserPromises = browserPagesBatches.map((batch, index) =>
    processBrowserBatch(batch, index + 1)
  );

  const batchResults = await Promise.all(browserPromises);
  const flatResults = batchResults.flat();

  console.log(`✅ Batch ${batchNumber} completed: ${flatResults.length} results`);

  // Add delay between batches to prevent overwhelming the system
  console.log(`⏳ Batch ${batchNumber}: Waiting 10 seconds before next batch...`);
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Check for device temperature here, if greater than certain threshold then sleep for 10 minutes and then
  // continue further

  return flatResults;
};

export const GMAPS_SCRAPPER = async (urlItems: TGoogleMapsUrls[]) => {
  const startTime = Date.now();
  console.log(`\n🎯 Starting scraping process for ${urlItems.length} URLs`);
  console.log(`⚙️ Configuration: ${MAX_BROWSER_SESSIONS} browsers × ${MAX_PAGES_PER_BROWSER} pages = ${TOTAL_CONCURRENT_URLS} concurrent URLs per batch`);

  try {
    // Split all URLs into batches that can be processed simultaneously
    const batches: TGoogleMapsUrls[][] = [];
    for (let i = 0; i < urlItems.length; i += TOTAL_CONCURRENT_URLS) {
      batches.push(urlItems.slice(i, i + TOTAL_CONCURRENT_URLS));
    }

    console.log(`📦 Total number of batches to process: ${batches.length}`);

    const allResults: ScrapeResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each batch sequentially to manage resource usage
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      try {
        const batchResults = await processSingleBatch(batches[batchIndex], batchIndex + 1);
        allResults.push(...batchResults);

        // Count successes and errors
        const batchSuccessCount = batchResults.filter(result => !result.error).length;
        const batchErrorCount = batchResults.filter(result => result.error).length;

        successCount += batchSuccessCount;
        errorCount += batchErrorCount;

        console.log(`📈 Batch ${batchIndex + 1} Summary: ${batchSuccessCount} successful, ${batchErrorCount} failed`);
        console.log(`📊 Overall Progress: ${allResults.length}/${urlItems.length} URLs processed`);

      } catch (batchError) {
        console.error(`💥 Batch ${batchIndex + 1} failed completely:`, batchError);

        // Add error results for this entire batch
        const failedBatchResults: ScrapeResult[] = batches[batchIndex].map(item => ({
         ...item,
          error: `Batch processing failed: ${batchError instanceof Error ? batchError.message : String(batchError)}`
        }));

        allResults.push(...failedBatchResults);
        errorCount += failedBatchResults.length;
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
      success: true,
      results: allResults,
      summary: {
        total: urlItems.length,
        successful: successCount,
        failed: errorCount,
        successRate: (successCount / urlItems.length) * 100,
        duration: duration,
        batches: batches.length
      }
    };

  } catch (error) {
    console.error("💥 Critical error in parallel browser initialization:", error);

    return {
      success: false,
      results: urlItems.map(item => ({
        ...item,
        error: error instanceof Error ? error.message : String(error)
      })),
      summary: {
        total: urlItems.length,
        successful: 0,
        failed: urlItems.length,
        successRate: 0,
        duration: Math.round((Date.now() - startTime) / 1000),
        batches: 0
      },
      error: error instanceof Error ? error.message : String(error)
    };
  }
};