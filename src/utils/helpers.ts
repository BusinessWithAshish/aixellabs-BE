import {GmapsScrape} from "../apis/GMAPS_SCRAPE";
import {GOOGLE_MAPS_BASE_URL} from "./constants";

/**
 * Google Maps URL Generation Utilities
 * 
 * This module provides functions for generating properly formatted Google Maps
 * search URLs from structured geographic and query data. It handles URL encoding,
 * formatting, and geographic data processing.
 * 
 * Key Features:
 * - Geographic data processing (country, state, city)
 * - Query term formatting and encoding
 * - URL construction with proper encoding
 * - Batch URL generation for multiple locations
 * - Comprehensive logging for debugging
 */

/**
 * Creates a properly formatted Google Maps search URL for a specific business query and location.
 * 
 * This function constructs Google Maps search URLs that target specific business types
 * in specific geographic locations. It handles proper formatting, encoding, and
 * geographic specificity to improve search result accuracy.
 * 
 * @param query - The business type or service to search for (e.g., "restaurants", "hotels")
 * @param city - The city name to search in
 * @param state - The state/province name
 * @param country - The country name
 * @returns A properly formatted Google Maps search URL
 * 
 * URL Construction Process:
 * 1. Clean and format the business query (lowercase, replace spaces with +)
 * 2. Create geographic location string (City, State, Country)
 * 3. Combine query with location using "in" connector
 * 4. URL encode the search term while preserving + symbols
 * 5. Append to Google Maps base URL
 * 
 * Example:
 * Input: query="digital marketing agencies", city="Mumbai", state="Maharashtra", country="India"
 * Output: "https://www.google.com/maps/search/digital+marketing+agencies+in+Mumbai,+Maharashtra,+India"
 * 
 * Features:
 * - Comprehensive logging for debugging and monitoring
 * - Proper URL encoding to handle special characters
 * - Geographic specificity for accurate results
 * - Case-insensitive query handling
 * - Space normalization and formatting
 */
function createGoogleMapsUrl(query: string, city: string, state: string, country: string) {
  console.log(`🔗 Creating URL for: "${query}" in "${city}, ${state}, ${country}"`);
  
  // Clean and format the business query
  const formattedQuery = query.toLowerCase().trim().replace(/\s+/g, '+');
  console.log(`🔗 Formatted query: "${formattedQuery}"`);

  // Create geographic location string: City, State, Country
  const location = `${city}, ${state}, ${country}`;
  const formattedLocation = location.replace(/\s+/g, '+').replace(/,/g, ',');
  console.log(`🔗 Formatted location: "${formattedLocation}"`);

  // Construct the complete search term with geographic targeting
  const searchTerm = `${formattedQuery}+in+${formattedLocation}`;
  console.log(`🔗 Search term: "${searchTerm}"`);

  // URL encode the search term while preserving + symbols for spaces
  const encodedSearchTerm = encodeURIComponent(searchTerm).replace(/%2B/g, '+');
  console.log(`🔗 Encoded search term: "${encodedSearchTerm}"`);

  // Construct the final Google Maps search URL
  const finalUrl = `${GOOGLE_MAPS_BASE_URL}${encodedSearchTerm}`;
  console.log(`🔗 Final URL: "${finalUrl}"`);

  return finalUrl;
}

/**
 * Type definition for Google Maps URL objects containing both
 * the geographic/query metadata and the generated URL.
 */
export type TGoogleMapsUrls = {
  /** The city name for this search */
  city: string;
  /** The state/province name for this search */
  state: string;
  /** The country name for this search */
  country: string;
  /** The business query/search term */
  query: string;
  /** The generated Google Maps search URL */
  url: string;
};

/**
 * Generates Google Maps search URLs for all combinations of locations and queries.
 * 
 * This function processes structured geographic data and generates individual
 * Google Maps search URLs for each city in each state, using the provided
 * business query. It creates a comprehensive list of URLs for batch processing.
 * 
 * @param data - Structured scraping request data containing query and geographic information
 * @returns Array of Google Maps search URLs ready for scraping
 * 
 * Process Flow:
 * 1. Iterate through each state in the request
 * 2. For each state, iterate through each city
 * 3. Generate a Google Maps URL for the query in that specific location
 * 4. Collect all URLs with their metadata
 * 5. Return just the URLs for scraping (metadata available if needed)
 * 
 * Example Input:
 * ```
 * {
 *   query: "restaurants",
 *   country: "USA",
 *   states: [
 *     { name: "California", cities: ["Los Angeles", "San Francisco"] },
 *     { name: "New York", cities: ["New York City", "Buffalo"] }
 *   ]
 * }
 * ```
 * 
 * Example Output:
 * ```
 * [
 *   "https://www.google.com/maps/search/restaurants+in+Los+Angeles,+California,+USA",
 *   "https://www.google.com/maps/search/restaurants+in+San+Francisco,+California,+USA",
 *   "https://www.google.com/maps/search/restaurants+in+New+York+City,+New+York,+USA",
 *   "https://www.google.com/maps/search/restaurants+in+Buffalo,+New+York,+USA"
 * ]
 * ```
 * 
 * Features:
 * - Handles multiple states and cities efficiently
 * - Maintains geographic specificity for accurate results
 * - Preserves metadata for potential future use
 * - Returns clean URL array for immediate use in scraping
 */
export function generateGoogleMapsUrls(data: GmapsScrape) {
  const urls: TGoogleMapsUrls[] = [];

  // Process each state and its cities
  data.states.forEach(state => {
    state.cities.forEach(city => {
      // Generate Google Maps URL for this specific location and query
      const url = createGoogleMapsUrl(data.query, city, state.name, data.country);
      
      // Store URL with metadata (for potential future use)
      urls.push({
        city: city,
        state: state.name,
        country: data.country,
        query: data.query,
        url: url
      });
    });
  });

  // Return just the URLs for scraping (metadata could be used for enhanced processing)
  return urls.map(url => url.url);
}