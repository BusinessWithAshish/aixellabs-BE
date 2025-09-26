# API Documentation

## Overview

The Aixellabs Google Maps Scraping API provides comprehensive endpoints for extracting business information from Google Maps. The API supports both web scraping and Google Places API integration methods.

## Base URL

```
http://localhost:8100
```

## Authentication

Currently, the API is open and uses IP-based rate limiting for protection.

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Standard rate limit headers are included in responses
- **Configuration**: Adjustable via `RATE_LIMIT_MAX` environment variable

## Content Types

- **Request**: `application/json`
- **Response**: `application/json` or `text/event-stream` (for streaming endpoints)

## Endpoints

### 1. Health Check

#### GET /v1/ping

Check if the server is running and responsive.

**Request:**
```http
GET /v1/ping
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running"
}
```

**Status Codes:**
- `200 OK`: Server is healthy

---

### 2. Browser Test

#### GET /v1/test-browser

Test browser launch functionality and configuration. Useful for debugging browser-related issues.

**Request:**
```http
GET /v1/test-browser
```

**Response:**
```json
{
  "success": true,
  "message": "Browser test successful",
  "title": "Google",
  "browserOptions": {
    "headless": "shell",
    "defaultViewport": null,
    "executablePath": "/usr/bin/chromium-browser",
    "args": [...],
    "timeout": 60000
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Browser test failed",
  "details": "Error message details"
}
```

**Status Codes:**
- `200 OK`: Browser test successful
- `500 Internal Server Error`: Browser test failed

---

### 3. Google Maps Web Scraping

#### POST /gmaps/scrape

Extract business information from Google Maps using web scraping. This endpoint uses Server-Sent Events (SSE) to provide real-time progress updates.

**Request:**
```http
POST /gmaps/scrape
Content-Type: application/json

{
  "query": "Digital marketing agencies",
  "country": "India",
  "states": [
    {
      "name": "Maharashtra",
      "cities": ["Pune", "Mumbai", "Nashik"]
    },
    {
      "name": "Gujarat",
      "cities": ["Ahmedabad", "Surat", "Vadodara"]
    }
  ]
}
```

**Request Schema:**
```typescript
interface GmapsScrapeRequest {
  query: string;           // Search query (required)
  country: string;         // Country name (required)
  states: Array<{          // Array of states (required)
    name: string;          // State name (required)
    cities: string[];      // Array of city names (required)
  }>;
}
```

**Response:** Server-Sent Events stream

**Event Types:**

#### Status Events
```json
{
  "type": "status",
  "message": "Starting Google Maps scraping for \"Digital marketing agencies\" in 2 states",
  "data": {
    "total": 5,
    "stage": "api_start"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Progress Events
```json
{
  "type": "progress",
  "message": "Successfully processed item 3 in browser 1",
  "data": {
    "browser": 1,
    "batch": 1,
    "current": 3,
    "total": 5,
    "percentage": 60
  },
  "timestamp": "2024-01-15T10:30:15.000Z"
}
```

#### Phase Events
```json
{
  "type": "status",
  "message": "Phase 1: Searching for business listings...",
  "data": {
    "stage": "phase_1_start",
    "phase": 1
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

```json
{
  "type": "status",
  "message": "Phase 2: Extracting details from 15 business listings...",
  "data": {
    "stage": "phase_2_start",
    "phase": 2,
    "total": 15
  },
  "timestamp": "2024-01-15T10:32:00.000Z"
}
```

#### Completion Event
```json
{
  "type": "complete",
  "message": "Scraping completed successfully!",
  "data": {
    "founded": [
      "https://www.google.com/maps/place/Business+1",
      "https://www.google.com/maps/place/Business+2"
    ],
    "foundedLeadsCount": 2,
    "allLeads": [
      {
        "website": "https://example.com",
        "phoneNumber": "+91 9876543210",
        "name": "Digital Marketing Pro",
        "gmapsUrl": "https://www.google.com/maps/place/Business+1",
        "overAllRating": "4.5",
        "numberOfReviews": "128"
      }
    ],
    "allLeadsCount": 1,
    "stage": "final_results"
  },
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

#### Error Events
```json
{
  "type": "error",
  "message": "Failed to process item 2 in browser 1",
  "data": {
    "browser": 1,
    "batch": 1,
    "current": 2,
    "total": 5
  },
  "timestamp": "2024-01-15T10:30:10.000Z"
}
```

**Status Codes:**
- `200 OK`: Streaming started successfully
- `400 Bad Request`: Invalid request parameters
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Error Responses:**
```json
{
  "success": false,
  "error": "Invalid query parameters"
}
```

---

### 4. Google Maps Search API

#### POST /gmaps/search_scrape

Extract business information using Google Places API. This method is faster and more reliable than web scraping but requires a Google Places API key.

**Request:**
```http
POST /gmaps/search_scrape
Content-Type: application/json

{
  "query": "Digital marketing agencies",
  "country": "India",
  "states": [
    {
      "name": "Maharashtra",
      "cities": ["Pune", "Mumbai"]
    }
  ]
}
```

**Request Schema:** Same as web scraping endpoint

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "name": "Digital Marketing Solutions",
      "attributions": [
        {
          "sourceUri": "https://www.google.com/maps/place/Digital+Marketing+Solutions",
          "sourceName": "Google Maps"
        }
      ]
    },
    {
      "id": "ChIJKxjxuaNqEmsRZ_7j4l8nLx0",
      "name": "Pro Marketing Agency",
      "attributions": [
        {
          "sourceUri": "https://www.google.com/maps/place/Pro+Marketing+Agency",
          "sourceName": "Google Maps"
        }
      ]
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Invalid or missing API key
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Error Responses:**
```json
{
  "error": "Invalid query parameters"
}
```

---

## Data Models

### Business Lead Information

```typescript
interface TGoogleMapLeadInfo {
  website: string;        // Business website URL
  phoneNumber: string;    // Contact phone number
  name: string;          // Business name
  gmapsUrl: string;      // Google Maps URL
  overAllRating: string; // Overall rating (e.g., "4.5")
  numberOfReviews: string; // Number of reviews (e.g., "128")
}
```

### Scraping Request

```typescript
interface GmapsScrapeRequest {
  query: string;         // Search query
  country: string;       // Country name
  states: Array<{        // Array of states
    name: string;        // State name
    cities: string[];    // Array of city names
  }>;
}
```

### Google Maps URL Object

```typescript
interface TGoogleMapsUrls {
  city: string;          // City name
  state: string;         // State name
  country: string;       // Country name
  query: string;         // Search query
  url: string;          // Generated Google Maps URL
}
```

### Browser Batch Handler Result

```typescript
interface TBrowserBatchHandlerReturn<T> {
  success: boolean;      // Overall success status
  results: T[];         // Array of successful results
  errors: string[];     // Array of error messages
  successCount: number; // Number of successful operations
  errorCount: number;   // Number of failed operations
  totalUrls: number;    // Total number of URLs processed
  batches: number;      // Number of batches processed
  duration: number;     // Processing duration in seconds
}
```

---

## Error Handling

### Common Error Scenarios

#### 1. Invalid Request Parameters
```json
{
  "success": false,
  "error": "Invalid query parameters"
}
```

#### 2. No URLs Generated
```json
{
  "success": false,
  "error": "No URLs provided"
}
```

#### 3. Browser Launch Failure
```json
{
  "success": false,
  "error": "Browser test failed",
  "details": "Failed to launch browser: No usable sandbox!"
}
```

#### 4. Rate Limit Exceeded
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642248000
```

#### 5. Server Error
```json
{
  "type": "error",
  "message": "Scraping failed due to system error",
  "data": {
    "stage": "api_error",
    "error": "Database connection failed"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Usage Examples

### JavaScript/Node.js

```javascript
// Web scraping with Server-Sent Events
async function scrapeGoogleMaps() {
  const response = await fetch('http://localhost:8100/gmaps/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'Digital marketing agencies',
      country: 'India',
      states: [
        {
          name: 'Maharashtra',
          cities: ['Pune', 'Mumbai']
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
          console.log('Scraping completed:', data.data);
        }
      }
    }
  }
}

// Google Places API
async function searchWithPlacesAPI() {
  const response = await fetch('http://localhost:8100/gmaps/search_scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'Restaurants',
      country: 'India',
      states: [
        {
          name: 'Maharashtra',
          cities: ['Pune']
        }
      ]
    })
  });

  const result = await response.json();
  console.log('Places found:', result.data);
}
```

### Python

```python
import requests
import json

# Web scraping with Server-Sent Events
def scrape_google_maps():
    url = 'http://localhost:8100/gmaps/scrape'
    payload = {
        'query': 'Digital marketing agencies',
        'country': 'India',
        'states': [
            {
                'name': 'Maharashtra',
                'cities': ['Pune', 'Mumbai']
            }
        ]
    }
    
    response = requests.post(url, json=payload, stream=True)
    
    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('data: '):
                data = json.loads(line[6:])
                print(f"Event: {data}")
                
                if data.get('type') == 'complete':
                    print(f"Scraping completed: {data['data']}")

# Google Places API
def search_with_places_api():
    url = 'http://localhost:8100/gmaps/search_scrape'
    payload = {
        'query': 'Restaurants',
        'country': 'India',
        'states': [
            {
                'name': 'Maharashtra',
                'cities': ['Pune']
            }
        ]
    }
    
    response = requests.post(url, json=payload)
    result = response.json()
    print(f"Places found: {result['data']}")
```

### cURL

```bash
# Health check
curl -X GET http://localhost:8100/v1/ping

# Browser test
curl -X GET http://localhost:8100/v1/test-browser

# Web scraping (streaming)
curl -X POST http://localhost:8100/gmaps/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Digital marketing agencies",
    "country": "India",
    "states": [
      {
        "name": "Maharashtra",
        "cities": ["Pune", "Mumbai"]
      }
    ]
  }'

# Google Places API
curl -X POST http://localhost:8100/gmaps/search_scrape \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Restaurants",
    "country": "India",
    "states": [
      {
        "name": "Maharashtra",
        "cities": ["Pune"]
      }
    ]
  }'
```

---

## Best Practices

### 1. Request Optimization

- **Batch Requests**: Combine multiple cities in a single request
- **Specific Queries**: Use specific search terms for better results
- **Reasonable Scope**: Avoid requesting too many locations at once

### 2. Error Handling

- **Implement Retry Logic**: Handle temporary failures gracefully
- **Monitor Rate Limits**: Respect rate limiting headers
- **Handle Streaming**: Properly process Server-Sent Events

### 3. Performance

- **Use Google Places API**: For faster, more reliable results
- **Monitor Progress**: Use SSE events to track long-running operations
- **Resource Management**: Close connections properly

### 4. Data Processing

- **Validate Results**: Check for required fields in responses
- **Handle Duplicates**: Implement deduplication logic
- **Store Efficiently**: Use appropriate data structures for storage

---

## Rate Limiting

The API implements rate limiting to prevent abuse and ensure fair usage:

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: Standard rate limit headers included
- **Configuration**: Adjustable via environment variables

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

### Handling Rate Limits

```javascript
async function makeRequestWithRetry(url, data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.status === 429) {
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const waitTime = (resetTime * 1000) - Date.now();
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## Monitoring and Debugging

### Health Monitoring

```bash
# Check server health
curl http://localhost:8100/v1/ping

# Test browser functionality
curl http://localhost:8100/v1/test-browser
```

### Debug Information

The API provides detailed debug information through:

- **Server-Sent Events**: Real-time progress and error information
- **Response Headers**: Rate limiting and performance metrics
- **Error Details**: Specific error messages and stack traces

### Logging

Monitor these logs for debugging:

- **Application Logs**: Node.js application events
- **Browser Logs**: Puppeteer browser operations
- **Database Logs**: MongoDB operations
- **Network Logs**: HTTP request/response details