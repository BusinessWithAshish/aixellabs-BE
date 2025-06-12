import { Page } from "puppeteer-core";

const PAGE_LOAD_TIMEOUT = 30000
const SCROLL_CONTAINER_DIVIDER = 'TFQHme'
const MAX_LIST_COUNT_GOOGLE =  120;
const LAZY_LOAD_SLEEP_TIMEOUT = 1500;
const SCROLL_PIXEL_VALUE = 2000;
const SCROLL_STOP_TIMEOUT = 25000;
const LEAD_LIMIT_THRESHOLD = MAX_LIST_COUNT_GOOGLE - 1 || 20;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

export const scrapeMapItems = async (url: string, page: Page): Promise<TGoogleMapItem[]> => {

  let currentItemsCount = 0;
  let initialItemsCount = 0;

  // setInterval(async () => {
  //
  //   console.log('currentItemsCount', currentItemsCount);
  //   console.log('initialItemsCount', initialItemsCount);
  //
  //   if (currentItemsCount !== initialItemsCount) {
  //     console.log(`🔄 Scrolling smoothly`);
  //     initialItemsCount = currentItemsCount;
  //   }
  //   else if (currentItemsCount >= LEAD_LIMIT_THRESHOLD) {
  //     console.log(`🔄 Reached the end of the list for ${url}`);
  //     return;
  //   }
  //   else {
  //     console.log(`Scrolling stopped for ${url}. Refreshing page and trying again...`);
  //     await page.reload({ waitUntil: "domcontentloaded", timeout: PAGE_LOAD_TIMEOUT });
  //   }
  // }, SCROLL_STOP_TIMEOUT);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_LOAD_TIMEOUT });

  const scrollContainer = await page.$('div[aria-label^="Results for"]');
  if (!scrollContainer) {
    throw new Error('Scroll container not found');
  }

  // initialItemsCount = await page.evaluate((container, SCROLL_CONTAINER_DIVIDER) => {
  //   return container.querySelectorAll(`.${SCROLL_CONTAINER_DIVIDER}`).length;
  // }, scrollContainer, SCROLL_CONTAINER_DIVIDER);

  let reachedEnd = false;
  while (!reachedEnd) {

    // currentItemsCount = await page.evaluate((container, SCROLL_CONTAINER_DIVIDER) => {
    //   return container.querySelectorAll(`.${SCROLL_CONTAINER_DIVIDER}`).length;
    // }, scrollContainer, SCROLL_CONTAINER_DIVIDER);

    await page.evaluate((container, SCROLL_PIXEL_VALUE) => {
      container.scrollBy(0, SCROLL_PIXEL_VALUE);
    }, scrollContainer, SCROLL_PIXEL_VALUE);

    await sleep(LAZY_LOAD_SLEEP_TIMEOUT);

    reachedEnd = await page.evaluate((container, SCROLL_CONTAINER_DIVIDER, LEAD_LIMIT_THRESHOLD) => {
      const numberOfItems = container.querySelectorAll(`.${SCROLL_CONTAINER_DIVIDER}`).length;
      return numberOfItems >= LEAD_LIMIT_THRESHOLD;
    }, scrollContainer, SCROLL_CONTAINER_DIVIDER, LEAD_LIMIT_THRESHOLD);
  }

  await page.evaluate(tagLeads, scrollContainer, SCROLL_CONTAINER_DIVIDER);

  return await scrapeLeads(page);
}


const tagLeads  = async (container: HTMLDivElement, SCROLL_CONTAINER_DIVIDER: string) => {
  const allMapItems = Array.from(container.querySelectorAll(`.${SCROLL_CONTAINER_DIVIDER}`));

  for (let index = 0; index < allMapItems.length - 1; index++) {
    const el = allMapItems[index];
    const isLast = index === allMapItems.length - 1;
    const prev = el.previousElementSibling;
    if (prev) {
      prev.setAttribute('data-temp-click-id', `click-${index}`)
    }
    if (isLast) {
      const next = el.nextElementSibling;
      if (next) {
        next.setAttribute('data-temp-click-id', `click-${index}`)
      }
    }
  }
}

const scrapeLeads = async (page: Page) => {

  let result: TGoogleMapItem[] = [];
  const allMapItems = Array.from(await page.$$(`.${SCROLL_CONTAINER_DIVIDER}`));

  for (let index = 0; index < allMapItems.length - 1; index++) {
    try {
      const clickElement = await page.$(`[data-temp-click-id="click-${index}"]`);
      await clickElement?.click()
      await sleep(LAZY_LOAD_SLEEP_TIMEOUT);

      const isPlaceTemporarilyClosed = await page.$('div[aria-label="Notice"]');

      if (isPlaceTemporarilyClosed) {
        continue;
      }

      const leadInfo = await page.evaluate(() => {

        //Get current URL
        const gmapsUrl = window.location.href ?? 'N/A';

        //WEBSITE
        const website  = document.querySelector('a[aria-label^="Website:"]')?.getAttribute('href') ?? 'N/A';

        //PHONE_NUMBER
        const phoneNumber = document.querySelector('button[aria-label^="Phone:"]')?.ariaLabel?.replace('Phone: ', '').replace(/\s/g, '') ?? 'N/A';

        //RATING
        const overAllRating = document.getElementsByClassName('ceNzKf')?.[0]?.ariaLabel?.split(' ')?.[0].trim() ?? 'N/A';

        //NUMBER_OF_REVIEWS
        const numberOfReviews = document.querySelector('span[aria-label*="reviews"]')?.getAttribute('aria-label')?.split(' ')[0] ?? 'N/A';

        const name = document.querySelector('div[aria-label^="Information for"]')?.getAttribute('aria-label')?.replace('Information for ', '') ?? 'N/A';

        return {
          website,
          name,
          phoneNumber,
          gmapsUrl,
          overAllRating,
          numberOfReviews
        }
      })

      result.push({
        leadIndex: index + 1,
        leadInfo: {...leadInfo},
      });
    }
    catch (error) {
      console.log(`Click failed for index ${index}:`, error);
      result.push({ leadIndex: index, leadInfo: null });
    }
  }
  return result;
}