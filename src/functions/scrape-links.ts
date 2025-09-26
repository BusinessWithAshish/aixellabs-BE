import {Page} from "puppeteer";
import {DEFAULT_PAGE_LOAD_TIMEOUT} from "../utils/constants";

/**
 * Google Maps Search Results Link Extractor
 * 
 * This module handles the first phase of Google Maps scraping: discovering business
 * listing URLs from search results pages. It implements sophisticated scrolling and
 * link extraction techniques to find all available business listings.
 * 
 * Key Features:
 * - Infinite scroll simulation to load all results
 * - End-of-results detection
 * - Duplicate URL filtering
 * - User-Agent spoofing for better compatibility
 * - Robust error handling for dynamic content
 */

/**
 * Scrapes business listing URLs from a Google Maps search results page.
 * 
 * This function implements the first phase of the scraping process: URL discovery.
 * It navigates to a Google Maps search results page, scrolls through all results
 * to trigger lazy loading, and extracts all business listing URLs.
 * 
 * @param url - The Google Maps search URL to scrape
 * @param page - The Puppeteer page instance to use
 * @returns Promise resolving to an array of unique business listing URLs
 * 
 * Process Flow:
 * 1. Set realistic User-Agent to avoid detection
 * 2. Navigate to the search results page
 * 3. Find the results container using aria-label
 * 4. Implement infinite scroll to load all results
 * 5. Detect end of results using specific UI elements
 * 6. Extract all business listing links
 * 7. Filter duplicates and normalize URLs
 * 8. Return array of unique business URLs
 * 
 * Scrolling Strategy:
 * - Scrolls in 1000px increments to trigger lazy loading
 * - Waits 1 second between scrolls for content to load
 * - Continues until "end of list" message appears
 * - Filters out advertisement containers (TFQHme class)
 * 
 * URL Extraction:
 * - Looks for links containing "/maps/place/" in href
 * - Converts relative URLs to absolute URLs
 * - Uses Set for automatic duplicate filtering
 * - Maintains insertion order for consistent results
 * 
 * Error Handling:
 * - Returns empty array if results container not found
 * - Handles missing or malformed href attributes
 * - Gracefully handles dynamic content loading issues
 * 
 * Performance Considerations:
 * - Uses page.evaluate() to run code in browser context
 * - Minimizes DOM queries by caching elements
 * - Efficient scrolling with reasonable delays
 * - Memory-efficient duplicate filtering with Set
 */
export const scrapeLinks = async (url: string, page: Page): Promise<string[]> => {

    // Set a realistic User-Agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to the search results page
    await page.goto(url, { waitUntil: "networkidle2", timeout: DEFAULT_PAGE_LOAD_TIMEOUT });

    // Execute the link extraction logic in the browser context
    return await page.evaluate(async () => {
        // Find the main results container
        const scrollContainer = document.querySelector('div[aria-label^="Results for"]');
        if (!scrollContainer) return [];

        // Utility function for delays between scroll actions
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Check if we've reached the end of the results
        const isEndReached = () => {
            return !!document.querySelector('span.HlvSq')?.textContent?.includes("You've reached the end of the list.");
        };

        // Get visible business listings (filter out ads and irrelevant content)
        const getVisibleLeads = () => {
            return Array.from(scrollContainer.children).filter(el => !el.classList.contains('TFQHme'));
        };

        // Implement infinite scroll to load all results
        while (!isEndReached()) {
            scrollContainer.scrollBy(0, 1000);
            await sleep(1000); // Wait for content to load
        }

        // Extract all business listing URLs
        const leads = getVisibleLeads();
        const uniqueUrls = new Set<string>();
        const results: string[] = [];

        leads.forEach((el, index) => {
            // Look for links that contain the Google Maps place identifier
            const anchor = el.querySelector('a[href*="/maps/place/"]');
            if (anchor) {
                const href = anchor.getAttribute('href');
                if (href && !uniqueUrls.has(href)) {
                    uniqueUrls.add(href);
                    
                    // Normalize URLs (convert relative to absolute)
                    results.push(href.startsWith('http') ? href : 'https://www.google.com' + href);
                }
            }
        });

        return results;
    });

}
