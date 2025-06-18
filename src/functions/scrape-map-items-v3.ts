import { Page } from "puppeteer-core";

export type TGoogleMapLeadInfo = {
  website: string;
  phoneNumber: string;
  name: string;
  gmapsUrl: string;
  overAllRating: string;
  numberOfReviews: string;
}

export type TGoogleMapItem = {
  leadInfo: TGoogleMapLeadInfo | null,
  leadIndex: number,
}

const PAGE_LOAD_TIMEOUT = 30000

export const scrapeMapItemsV3 = async (url: string, page: Page) => {

  await page.goto(url, { waitUntil: "networkidle2", timeout: PAGE_LOAD_TIMEOUT });

  const results: TGoogleMapItem[] = await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const scrollContainer = document.querySelector('div[aria-label^="Results for"]');
    if (!scrollContainer) return [];

    const extractPlaceData = (index: number) => {
      // Check if place is temporarily closed
      if (document.querySelector('div[aria-label="Notice"]')) {
        return {
          leadInfo: null,
          leadIndex: index + 1,
        };
      }

      const gmapsUrl = window.location.href ?? 'N/A';
      const website = document.querySelector('a[aria-label^="Website:"]')?.getAttribute('href') ?? 'N/A';
      const phoneNumber = document.querySelector('button[aria-label^="Phone:"]')
          ?.getAttribute('aria-label')?.replace('Phone: ', '').replace(/\s/g, '') ?? 'N/A';
      const overAllRating = document.querySelector('.ceNzKf')
          ?.getAttribute('aria-label')?.split(' ')?.[0]?.trim() ?? 'N/A';
      const numberOfReviews = document.querySelector('span[aria-label*="reviews"]')
          ?.getAttribute('aria-label')?.split(' ')[0] ?? 'N/A';
      const name = document.querySelector('div[aria-label^="Information for"]')
          ?.getAttribute('aria-label')?.replace('Information for ', '') ?? 'N/A';

      return {
        leadInfo: {
          website,
          phoneNumber,
          name,
          gmapsUrl,
          overAllRating,
          numberOfReviews,
        },
        leadIndex: index + 1,
      };
    };

    const results: TGoogleMapItem[] = [];
    let currentIndex = 0;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;

    while (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      try {
        // Get fresh separator divs each iteration
        const separatorDivs = Array.from(scrollContainer.querySelectorAll('div.TFQHme'));

        if (!separatorDivs.length) {
          console.log('No separator divs found');
          break;
        }

        // Check if we've processed all available separators
        if (currentIndex >= separatorDivs.length) {
          console.log(`Processed all ${separatorDivs.length} separators`);
          break;
        }

        console.log(`Processing separator ${currentIndex + 1} of ${separatorDivs.length}`);

        const currentSeparatorDiv = separatorDivs[currentIndex];
        const previousDiv = currentSeparatorDiv.previousElementSibling;

        // Click on the place
        previousDiv?.querySelector('a')?.click();
        await sleep(800); // Reduced sleep time

        // Extract data
        const placeData = extractPlaceData(currentIndex);
        results.push(placeData);

        // Handle last separator differently - click next element too
        const isLastSeparator = currentIndex === separatorDivs.length - 1;
        if (isLastSeparator) {
          const nextDiv = currentSeparatorDiv.nextElementSibling;

          if (nextDiv?.querySelector('a')) {
            nextDiv.querySelector('a')?.click();
            await sleep(800);

            // Extract data
            const placeData = extractPlaceData(currentIndex);
            results.push(placeData);
          }

          // End the loop after processing last separator
          break;
        } else {
          // Gentle scroll to trigger loading of more results
          scrollContainer.scrollBy(0, 500);
          await sleep(500);
        }

        currentIndex++;

      } catch (error) {
        console.log(`Error processing separator ${currentIndex}:`, error);
        consecutiveFailures++;
        currentIndex++;
      }
    }

    console.log(`Scraping completed. Extracted ${results.length} places.`);
    return results;
  });

  return results;

}