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

export const scrapeMapItemsV2 = async (url: string, page: Page) => {

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_LOAD_TIMEOUT });
  await page.goto(url, { waitUntil: "networkidle2", timeout: PAGE_LOAD_TIMEOUT });

  const scrollContainer = await page.$('div[aria-label^="Results for"]');
  if (!scrollContainer) {
    return [];
  }

  let currentIndex = 0;
  let reachedEnd = false;

  while (!reachedEnd) {

    // Get separator divs dynamically each time (handles new elements from scrolling)
    const separatorDivs = await page.evaluate(() => {
      return Array.from(document.querySelector('div[aria-label^="Results for"]')?.querySelectorAll('div.TFQHme') || []);
    });

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

      // @ts-ignore
      await previousDiv.click();
      console.log('clicked previous div and sleeping');
      await sleep(LAZY_LOAD_SLEEP_TIMEOUT);

      // @ts-ignore
      await nextDiv.click();
      console.log('clicked next div and sleeping');
      await sleep(LAZY_LOAD_SLEEP_TIMEOUT);
      reachedEnd = true;
      break;
    }

    console.log('continuing normal flow');
    currentSeparatorDiv = separatorDivs[currentIndex];
    const previousDiv = await page.evaluateHandle((el) => {
      return el.previousElementSibling;
    }, currentSeparatorDiv);
    console.log('got previous div');

    // @ts-ignore
    await (previousDiv.asElement())?.click();
    console.log('clicked previous div and sleeping');
    await sleep(LAZY_LOAD_SLEEP_TIMEOUT);




    // Check if next-to-next sibling is also a separator (your end condition)
    // const hasNextSeparator = await currentSeparatorDiv.evaluate((el) => {
    //   const nextSibling = el.nextElementSibling;
    //   if (!nextSibling) return false;
    //   const nextToNextSibling = nextSibling.nextElementSibling;
    //   return nextToNextSibling && nextToNextSibling.classList.contains('TFQHme');
    // });

    // console.log('logs at index', currentIndex, logs);

    // if (clicked) {
    //   await new Promise(resolve => setTimeout(resolve, 1500));
    //   console.log('Clicked element with index:', currentIndex);
    // }

    // If no next separator found, this is the last one
    // if (!hasNextSeparator) {
    //   console.log('Reached end - no more separator siblings');
    //   reachedEnd = true;
    // }

    currentIndex++;
  }

  // await tfqDivs[0].evaluate((el) => {
  //   el.setAttribute('data-temp-click-id', 'index-0');
  // })


  // await page.evaluate(async () => {
  //
  //   const scrollContainer = document.querySelector('div[aria-label^="Results for"]');
  //
  //   if (!scrollContainer) {
  //     return [];
  //   }
  //
  //   let reachedEnd = false;
  //   let currentIndex = 0;
  //
  //   while (!reachedEnd) {
  //
  //     const separatorDivs = scrollContainer.querySelectorAll('div.TFQHme');
  //     const currentSeparatorDiv = separatorDivs[currentIndex];
  //
  //     const previousSibling = currentSeparatorDiv.previousElementSibling;
  //     if (previousSibling) {
  //       previousSibling.querySelector('a')?.click();
  //       await new Promise(resolve => setTimeout(resolve, 1500));
  //       console.log('Clicked element with index:', currentIndex);
  //     }
  //
  //     // if(currentSeparatorDiv.nextElementSibling?.nextElementSibling?.classList.contains('TFQHme')) {
  //     //   currentSeparatorDiv.nextElementSibling?.nextElementSibling?.setAttribute('data-last', currentIndex.toString());
  //     //   console.log('Reached the end of the list at index:', currentIndex);
  //     //   reachedEnd = true;
  //     // }
  //
  //     console.log('increasing index', currentIndex)
  //     currentIndex++;
  //
  //   }
  // });


  await sleep(2000000)


  // let reachedEnd = false;
  // let currentIndex = 0;
  //
  // while (!reachedEnd) {
  //   const tfqDivs = await scrollContainer.$$('div.TFQHme');
  //
  //   // Check if we have reached the end of available items
  //   if (currentIndex >= tfqDivs.length) {
  //     console.log('No more items to process');
  //     break;
  //   }
  //
  //   const currentTfqDiv = tfqDivs[currentIndex];
  //
  //   // Get the previous element (sibling) of the current TFQHme div
  //   const previousElement = await page.evaluateHandle((el) => {
  //     return el.previousElementSibling;
  //   }, currentTfqDiv);
  //
  //   // Check if previous element exists and find the first <a> tag in it
  //   if (previousElement) {
  //     try {
  //        await page.evaluate((el) => {
  //         return el?.querySelector('a')?.click();
  //       }, previousElement);
  //
  //         console.log(`Clicked on item ${currentIndex + 1}`);
  //
  //         // Wait a bit for the page to load/update after clicking
  //         await sleep(LAZY_LOAD_SLEEP_TIMEOUT);
  //
  //         // Here you can add code to scrape the details from the opened item
  //         // For example:
  //         // await scrapeItemDetails(page);
  //     } catch (error) {
  //       console.log(`Error clicking item ${currentIndex + 1}:`, error);
  //     }
  //   }
  //
  //   // Check if we've reached the end by looking for the pattern you described
  //   // Get the next-to-next sibling of current TFQHme div
  //   const nextToNextSibling = await page.evaluateHandle((el) => {
  //     const nextSibling = el.nextElementSibling;
  //     return nextSibling ? nextSibling.nextElementSibling : null;
  //   }, currentTfqDiv);
  //
  //   // Check if the next-to-next sibling is also a TFQHme div
  //   if (nextToNextSibling) {
  //     const isNextToNextTfqDiv = await page.evaluate((el) => {
  //       return el && el.classList && el.classList.contains('TFQHme');
  //     }, nextToNextSibling);
  //
  //     if (isNextToNextTfqDiv) {
  //       console.log('Reached end of list - found TFQHme div as next-to-next sibling');
  //       reachedEnd = true;
  //     }
  //   } else {
  //     // If there's no next-to-next sibling, we've likely reached the end
  //     console.log('No next-to-next sibling found - reached end of list');
  //     reachedEnd = true;
  //   }
  //
  //   // Move to next item
  //   currentIndex++;
  //
  //   // Safety check to prevent infinite loops
  //   if (currentIndex > 1000) {
  //     console.log('Safety limit reached - stopping scraping');
  //     break;
  //   }
  // }

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