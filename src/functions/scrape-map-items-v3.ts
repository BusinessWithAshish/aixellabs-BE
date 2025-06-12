import { Page } from "puppeteer-core";

const PAGE_LOAD_TIMEOUT = 30000
const SCROLL_CONTAINER_DIVIDER = 'TFQHme'
const MAX_LIST_COUNT_GOOGLE =  120;
const LAZY_LOAD_SLEEP_TIMEOUT = 1500;
const SCROLL_PIXEL_VALUE = 2000;
const SCROLL_STOP_TIMEOUT = 25000;
const LEAD_LIMIT_THRESHOLD = MAX_LIST_COUNT_GOOGLE - 1 || 20;

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const scrapeMapItemsV3 = async (url: string, page: Page) => {

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_LOAD_TIMEOUT });
  await page.goto(url, { waitUntil: "networkidle2", timeout: PAGE_LOAD_TIMEOUT });

  let result: TGoogleMapItem[] = [];

    // Get separator divs dynamically each time (handles new elements from scrolling)
  const results:TGoogleMapItem[]  = await page.evaluate(async () => {

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const scrollContainer = document.querySelector('div[aria-label^="Results for"]');

      if (!scrollContainer) {
        return [];
      }

      let currentIndex = 0;
      let reachedEnd = false;

      // LOOP START
      while (!reachedEnd) {

        try {
          const separatorDivs =  Array.from(scrollContainer.querySelectorAll('div.TFQHme'));

          console.log('for', currentIndex ,'of', separatorDivs.length);

          let currentSeparatorDiv;

          if (!separatorDivs.length) {
            console.log('no separator divs found');
            break;
          }

          const isLastSeparator = currentIndex === separatorDivs.length - 1;
          if (isLastSeparator) {

            console.log('for', currentIndex, 'inside last separator');

            currentSeparatorDiv = separatorDivs[currentIndex];
            const previousDiv = currentSeparatorDiv.previousElementSibling;

            console.log('got previous div');

            const nextDiv = currentSeparatorDiv.nextElementSibling;

            console.log('got next div');

            previousDiv?.querySelector('a')?.click();
            console.log('clicked previous div and sleeping');

            const isPlaceTemporarilyClosed = document.querySelector('div[aria-label="Notice"]');

            if (isPlaceTemporarilyClosed) {
              continue;
            }

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

            result.push({
              leadInfo: {
                website,
                phoneNumber,
                name,
                gmapsUrl,
                overAllRating,
                numberOfReviews,
              },
              leadIndex: currentIndex + 1,
            })

            await sleep(1500);

            nextDiv?.querySelector('a')?.click();
            console.log('clicked next div and sleeping');



            await sleep(1500);
            reachedEnd = true;
            break;
          }

          console.log('continuing normal flow');
          currentSeparatorDiv = separatorDivs[currentIndex];
          const previousDiv = currentSeparatorDiv.previousElementSibling;
          console.log('got previous div');

          previousDiv?.querySelector('a')?.click();
          console.log('clicked previous div and scrolling');

          scrollContainer.scrollBy(0, 100000);

          await sleep(1500);
        }
        catch (error) {



        }


        currentIndex++;

      }
      // LOOP END

      return [];

    });

  // await sleep(2000000)

  return results;

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