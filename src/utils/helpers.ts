import {TPOSTv2ScrapeSchema} from "../apis/GMAPS_SCRAPE";
import {GOOGLE_MAPS_BASE_URL} from "./constants";

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

export function generateGoogleMapsUrls(data: TPOSTv2ScrapeSchema) {
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

  return urls.map(url => url.url);
}