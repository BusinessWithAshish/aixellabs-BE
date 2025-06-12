import { TPOSTv1ScrapeSchema } from "../apis/POST-v1-scrape";

export const GOOGLE_MAPS_BASE_URL = 'https://www.google.com/maps/search/';

function createGoogleMapsUrl(query: string, city: string, state: string, country: string) {
  // Clean and format the query
  const formattedQuery = query.toLowerCase().trim().replace(/\s+/g, '+');

  // Create location string: City, State, Country
  const location = `${city}, ${state}, ${country}`;
  const formattedLocation = location.replace(/\s+/g, '+').replace(/,/g, ',');

  // Construct the final URL
  const searchTerm = `${formattedQuery}+in+${formattedLocation}`;

  // URL encode the entire search term
  const encodedSearchTerm = encodeURIComponent(searchTerm).replace(/%2B/g, '+');

  return `${GOOGLE_MAPS_BASE_URL}${encodedSearchTerm}`;
}

export type TGoogleMapsUrls = {
  city: string;
  state: string;
  country: string;
  query: string;
  url: string;
};

export function generateGoogleMapsUrls(data: TPOSTv1ScrapeSchema) {
  const urls: TGoogleMapsUrls[] = [];

  data.states.forEach(state => {
    state.cities.forEach(city => {
      const url = createGoogleMapsUrl(data.query, city, state.name, data.country);
      urls.push({
        city: city,
        state: state.name,
        country: data.country,
        query: data.query,
        url: url
      });
    });
  });

  return urls;
}