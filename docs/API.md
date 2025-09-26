# API Documentation

## Overview

The AixelLabs API provides two main methods for extracting business information from Google Maps:

1. **Web Scraping** (`/gmaps/scrape`) - Uses Puppeteer for comprehensive data extraction
2. **Places API** (`/gmaps/search_scrape`) - Uses Google Places API for basic business information

## Base URL

```
Production: https://your-domain.com
Development: http://localhost:8100
```

## Authentication

Currently, the API does not require authentication. Rate limiting is applied per IP address.

## Rate Limiting

- **Window**: 15 minutes
- **Limit**: 100 requests per IP (configurable via `RATE_LIMIT_MAX`)
- **Headers**: Standard rate limit headers are included in responses

## Common Request/Response Patterns

### Success Response
```json
{
  "success": true,
  "message": "Operation completed",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "details": "Additional error information"
}
```

## Endpoints

---

## Health Check

### `GET /v1/ping`

Simple health check endpoint to verify server status.

**Response:**
```json
{
  "success": true,
  "message": "Server is running"
}
```

**Status Codes:**
- `200`: Server is operational

---

## Browser Test

### `GET /v1/test-browser`

Tests browser configuration and functionality. Useful for debugging deployment issues.

**Response:**
```json
{
  "success": true,
  "message": "Browser test successful",
  "title": "Google",
  "browserOptions": {
    "headless": "shell",
    "args": ["--no-sandbox", "..."]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Browser test failed",
  "details": "Chrome launch failed"
}
```

**Status Codes:**
- `200`: Browser test successful
- `500`: Browser configuration issues

---

## Web Scraping

### `POST /gmaps/scrape`

Comprehensive web scraping of Google Maps business listings with real-time progress updates.

**Request Body:**
```json
{
  "query": "digital marketing agencies",
  "country": "India",
  "states": [
    {
      "name": "Maharashtra",
      "cities": ["Mumbai", "Pune", "Nashik"]
    },
    {
      "name": "Gujarat", 
      "cities": ["Ahmedabad", "Surat", "Vadodara"]
    }
  ]
}
```

**Request Schema:**
- `query` (string, required): Search term for businesses
- `country` (string, required): Country name
- `states` (array, required): Array of state objects
  - `name` (string, required): State/province name
  - `cities` (array of strings, required): City names to search

**Response Type:** Server-Sent Events (SSE) stream

**Content-Type:** `text/event-stream`

**Stream Event Types:**

### Status Events
```json
{
  "type": "status",
  "message": "Starting Google Maps scraping for \"digital marketing agencies\" in 2 states",
  "data": {
    "total": 5,
    "stage": "api_start"
  },
  "timestamp": "2025-09-26T10:30:00.000Z"
}
```

### Progress Events
```json
{
  "type": "progress", 
  "message": "Successfully processed item 3 in browser 1",
  "data": {
    "current": 3,
    "total": 10,
    "percentage": 30,
    "browser": 1,
    "batch": 1
  },
  "timestamp": "2025-09-26T10:30:15.000Z"
}
```

### Error Events
```json
{
  "type": "error",
  "message": "Failed to process item 5 in browser 2",
  "data": {
    "browser": 2,
    "batch": 1,
    "current": 5,
    "total": 10
  },
  "timestamp": "2025-09-26T10:30:20.000Z"
}
```

### Completion Event
```json
{
  "type": "complete",
  "message": "Scraping completed successfully!",
  "data": {
    "founded": ["url1", "url2", "url3"],
    "foundedLeadsCount": 3,
    "allLeads": [
      {
        "website": "https://example.com",
        "phoneNumber": "+91 1234567890",
        "name": "Business Name",
        "gmapsUrl": "https://maps.app.goo.gl/xyz",
        "overAllRating": "4.5",
        "numberOfReviews": "120"
      }
    ],
    "allLeadsCount": 1,
    "stage": "final_results"
  },
  "timestamp": "2025-09-26T10:35:00.000Z"
}
```

**Processing Stages:**

1. **api_start**: Initial request processing
2. **phase_1_start**: Beginning URL discovery phase
3. **phase_2_start**: Beginning detailed data extraction
4. **batch_start**: Starting new batch of URLs
5. **browser_allocation**: Allocating browser resources
6. **batch_complete**: Batch processing finished
7. **final_results**: All processing completed

**Status Codes:**
- `200`: Stream started successfully
- `400`: Invalid request parameters

**Error Handling:**
- Invalid query parameters return immediate 400 error
- Runtime errors are streamed as error events
- System errors terminate the stream with error event

---

## Places API Search

### `POST /gmaps/search_scrape`

Uses Google Places API for basic business information retrieval.

**Requirements:**
- Valid `GOOGLE_MAPS_PLACES_API_KEY` environment variable

**Request Body:**
```json
{
  "query": "restaurants in New York",
  "country": "USA",
  "states": [
    {
      "name": "New York",
      "cities": ["New York City", "Buffalo"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "name": "Restaurant Name",
      "attributions": []
    },
    {
      "id": "ChIJrTLr-GyuEmsRBfy61i59si0", 
      "name": "Another Restaurant",
      "attributions": []
    }
  ]
}
```

**Features:**
- Automatic pagination handling
- Rate limiting compliance
- Field mask optimization for cost efficiency

**Status Codes:**
- `200`: Successful API response
- `400`: Invalid query parameters
- `500`: API key issues or quota exceeded

**Field Masks Used:**
- `places.id`: Unique place identifier
- `places.name`: Business name
- `places.attributions`: Required attribution data
- `nextPageToken`: For pagination

---

## Client Integration Examples

### JavaScript/Fetch (Web Scraping)

```javascript
const response = await fetch('/gmaps/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'restaurants',
    country: 'USA',
    states: [
      {
        name: 'California',
        cities: ['Los Angeles', 'San Francisco']
      }
    ]
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log('Event:', data);
      
      if (data.type === 'complete') {
        console.log('Final results:', data.data.allLeads);
      }
    }
  }
}
```

### Python (Places API)

```python
import requests

url = 'http://localhost:8100/gmaps/search_scrape'
data = {
    'query': 'coffee shops',
    'country': 'Canada',
    'states': [
        {
            'name': 'Ontario',
            'cities': ['Toronto', 'Ottawa']
        }
    ]
}

response = requests.post(url, json=data)
result = response.json()

if result['success']:
    for place in result['data']:
        print(f"Business: {place['name']} (ID: {place['id']})")
else:
    print(f"Error: {result['error']}")
```

### cURL Examples

**Health Check:**
```bash
curl -X GET http://localhost:8100/v1/ping
```

**Web Scraping:**
```bash
curl -X POST http://localhost:8100/gmaps/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "query": "bakeries",
    "country": "France", 
    "states": [
      {
        "name": "Île-de-France",
        "cities": ["Paris", "Versailles"]
      }
    ]
  }' \
  --no-buffer
```

**Places API:**
```bash
curl -X POST http://localhost:8100/gmaps/search_scrape \
  -H "Content-Type: application/json" \
  -d '{
    "query": "hotels",
    "country": "Japan",
    "states": [
      {
        "name": "Tokyo",
        "cities": ["Tokyo", "Shibuya"]
      }
    ]
  }'
```

---

## Error Codes and Troubleshooting

### Common Error Scenarios

**400 Bad Request:**
- Missing required fields
- Invalid JSON format
- Empty arrays in request

**429 Too Many Requests:**
- Rate limit exceeded
- Wait for rate limit window to reset

**500 Internal Server Error:**
- Browser launch failures
- Database connection issues
- System resource exhaustion

### Debugging Tips

1. **Check Browser Test Endpoint:**
   ```bash
   curl http://localhost:8100/v1/test-browser
   ```

2. **Monitor Server Logs:**
   - Look for browser launch errors
   - Check memory usage warnings
   - Verify database connectivity

3. **Validate Request Format:**
   - Ensure JSON is properly formatted
   - Verify all required fields are present
   - Check data types match schema

4. **Stream Connection Issues:**
   - Ensure client supports Server-Sent Events
   - Check for proxy/firewall interference
   - Verify Content-Type handling

---

## Performance Considerations

### Request Optimization

- **Batch Similar Queries**: Group related searches to maximize browser efficiency
- **Reasonable Geographic Scope**: Large city lists may cause timeouts
- **Query Specificity**: More specific queries yield better results

### Response Handling

- **Stream Processing**: Process events as they arrive rather than buffering
- **Error Recovery**: Implement retry logic for failed requests
- **Resource Management**: Close streams properly to prevent memory leaks

### Rate Limiting Strategy

- **Implement Backoff**: Use exponential backoff for 429 responses
- **Monitor Usage**: Track request patterns to optimize timing
- **Distribute Load**: Use multiple IPs if legally permissible

---

## Data Quality and Validation

### Expected Data Quality

**Web Scraping Method:**
- **Coverage**: 70-90% of visible listings
- **Accuracy**: High for publicly displayed information
- **Completeness**: Varies by business profile completeness

**Places API Method:**
- **Coverage**: Limited by API quotas and field masks
- **Accuracy**: High (official Google data)
- **Completeness**: Basic information only

### Data Validation

The system automatically validates:
- URL formats and accessibility
- Phone number formats
- Website URL validity
- Rating and review count formats

### Handling Missing Data

Missing or unavailable data is marked as:
- `"N/A"` for text fields
- Empty strings for optional fields
- Null values are avoided in responses

---

## Changelog

### Version 1.0.0
- Initial API release
- Web scraping endpoint with SSE
- Places API integration
- MongoDB storage
- Rate limiting and security headers