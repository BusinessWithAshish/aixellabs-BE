import {Page} from "puppeteer";
import {DEFAULT_PAGE_LOAD_TIMEOUT} from "../utils/constants";

export const scrapeLinks = async (url: string, page: Page): Promise<string[]> => {
    console.log(`🔍 scrapeLinks: Starting to scrape URL: ${url}`);
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.goto(url, { waitUntil: "networkidle2", timeout: DEFAULT_PAGE_LOAD_TIMEOUT });
    console.log(`✅ scrapeLinks: Page loaded successfully`);

    const result = await page.evaluate(async () => {
        console.log("🔍 scrapeLinks: Starting page evaluation");
        
        // Debug: Check what's on the page
        const pageTitle = document.title;
        console.log("📄 Page title:", pageTitle);
        
        // Debug: Look for various possible containers
        const possibleContainers = [
            'div[aria-label^="Results for"]',
            'div[aria-label*="Results"]',
            'div[role="main"]',
            'div[data-value="Search results"]',
            '.section-layout-root',
            '[data-value="Search results"]'
        ];
        
        let scrollContainer = null;
        let containerSelector = null;
        
        for (const selector of possibleContainers) {
            const element = document.querySelector(selector);
            if (element) {
                scrollContainer = element;
                containerSelector = selector;
                console.log(`✅ Found container with selector: ${selector}`);
                break;
            }
        }
        
        if (!scrollContainer) {
            console.log("❌ No scroll container found. Available divs with aria-label:");
            const allDivs = document.querySelectorAll('div[aria-label]');
            allDivs.forEach((div, index) => {
                if (index < 10) { // Only log first 10
                    console.log(`  - ${div.getAttribute('aria-label')}`);
                }
            });
            return [];
        }

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        const isEndReached = () => {
            const endElement = document.querySelector('span.HlvSq');
            if (endElement) {
                const text = endElement.textContent || '';
                console.log("🔍 End element text:", text);
                return text.includes("You've reached the end of the list.");
            }
            return false;
        };

        const getVisibleLeads = () => {
            const children = Array.from(scrollContainer.children);
            console.log(`🔍 Total children in container: ${children.length}`);
            
            const filtered = children.filter(el => !el.classList.contains('TFQHme'));
            console.log(`🔍 Children after filtering: ${filtered.length}`);
            
            return filtered;
        };

        console.log("🔄 Starting to scroll...");
        let scrollCount = 0;
        while (!isEndReached() && scrollCount < 10) { // Limit to 10 scrolls for debugging
            scrollContainer.scrollBy(0, 1000);
            await sleep(1000);
            scrollCount++;
            console.log(`📜 Scroll ${scrollCount} completed`);
        }

        const leads = getVisibleLeads();
        console.log(`🔍 Found ${leads.length} lead elements`);
        
        const uniqueUrls = new Set<string>();
        const results: string[] = [];

        leads.forEach((el, index) => {
            if (index < 5) { // Debug first 5 elements
                console.log(`🔍 Element ${index}:`, el.className, el.tagName);
            }
            
            const anchor = el.querySelector('a[href*="/maps/place/"]');
            if (anchor) {
                const href = anchor.getAttribute('href');
                if (href && !uniqueUrls.has(href)) {
                    uniqueUrls.add(href);
                    const fullUrl = href.startsWith('http') ? href : 'https://www.google.com' + href;
                    results.push(fullUrl);
                    console.log(`✅ Found link: ${fullUrl}`);
                }
            } else if (index < 5) {
                // Debug: Check what links are available in this element
                const allLinks = el.querySelectorAll('a');
                console.log(`🔍 Element ${index} has ${allLinks.length} links:`, 
                    Array.from(allLinks).map(a => a.getAttribute('href')).filter(Boolean));
            }
        });

        console.log(`🎯 Final results: ${results.length} unique URLs found`);
        return results;
    });

    console.log(`📊 scrapeLinks: Found ${result.length} results for URL: ${url}`);
    return result;
}