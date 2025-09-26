# AixelLabs - Google Maps Scraping API Server

A robust Node.js/TypeScript API server for scraping business information from Google Maps. This system provides both web scraping and Google Places API integration for comprehensive business lead extraction.

## 🚀 Features

- **Dual Scraping Methods**: Web scraping with Puppeteer and Google Places API integration
- **Batch Processing**: Concurrent browser sessions for high-volume scraping
- **Real-time Streaming**: Server-Sent Events (SSE) for live progress updates
- **MongoDB Integration**: Structured data storage with automatic upsert operations
- **Rate Limiting**: Built-in protection against API abuse
- **Production Ready**: Optimized browser configurations for cloud deployment
- **Geographic Targeting**: Support for multi-state, multi-city scraping campaigns

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │───▶│   Express API    │───▶│   MongoDB       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Browser Pool    │
                       │  (Puppeteer)     │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Google Maps     │
                       │  Scraping        │
                       └──────────────────┘
```

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Deployment](#deployment)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## 🛠️ Installation

### Prerequisites

- Node.js 18+ 
- MongoDB 4.4+
- Chrome/Chromium browser (for scraping)
- Google Maps Places API key (optional, for API method)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/BusinessWithAshish/aixellabs-BE.git
   cd aixellabs-BE
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build and start**
   ```bash
   npm run build
   npm start
   ```

### Production Setup (EC2/Linux)

Use the provided setup script:

```bash
chmod +x src/setup.sh
sudo ./src/setup.sh
```

This script automatically:
- Updates system packages
- Installs Node.js, pnpm, and Chromium
- Clones the repository
- Installs dependencies
- Creates environment configuration
- Starts the application

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=8100
NODE_ENV=production

# Browser Pool Settings
MAX_BROWSER_SESSIONS=10
MAX_PAGES_PER_BROWSER=5

# API Keys
GOOGLE_MAPS_PLACES_API_KEY=your_api_key_here

# Database
MONGODB_URI=mongodb://localhost:27017/aixellabs

# Security
ALLOWED_ORIGINS=https://yourdomain.com,https://anotherdomain.com
RATE_LIMIT_MAX=100
```

### Browser Configuration

The system uses optimized browser arguments for production environments. Key optimizations include:

- Headless operation with shell mode
- Disabled images, CSS, and unnecessary resources
- Memory and CPU optimizations
- Request interception for faster loading

## 📡 API Endpoints

### Health Check

**GET** `/v1/ping`

Returns server status.

```json
{
  "success": true,
  "message": "Server is running"
}
```

### Browser Test

**GET** `/v1/test-browser`

Tests browser functionality and configuration.

### Web Scraping Endpoint

**POST** `/gmaps/scrape`

Performs comprehensive web scraping of Google Maps business listings.

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
      "cities": ["Ahmedabad", "Surat"]
    }
  ]
}
```

**Response:** Server-Sent Events stream with real-time progress updates.

**Stream Events:**
- `status`: Progress updates and system messages
- `progress`: Processing completion percentages
- `error`: Error notifications
- `complete`: Final results with extracted data

### Google Places API Endpoint

**POST** `/gmaps/search_scrape`

Uses Google Places API for business search (requires API key).

**Request Body:** Same as web scraping endpoint.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "place_id_here",
      "name": "Business Name",
      "attributions": []
    }
  ]
}
```

## 📊 Data Models

### Input Schema

```typescript
{
  query: string;           // Search term (e.g., "restaurants")
  country: string;         // Country name
  states: Array<{
    name: string;          // State/province name
    cities: string[];      // Array of city names
  }>;
}
```

### Extracted Business Data

```typescript
{
  website: string;         // Business website URL
  phoneNumber: string;     // Contact phone number
  name: string;           // Business name
  gmapsUrl: string;       // Google Maps URL
  overAllRating: string;  // Average rating
  numberOfReviews: string; // Review count
}
```

### MongoDB Storage Format

```json
{
  "state": "Maharashtra",
  "cities": [
    {
      "city_name": "Pune",
      "queries": [
        {
          "search_query": "digital marketing agencies",
          "query_slug": "digital-marketing-agencies",
          "leads": [
            {
              "name": "Business Name",
              "phoneNumber": "+91 1234567890",
              "website": "https://example.com",
              "gmapsUrl": "https://maps.app.goo.gl/xyz",
              "overAllRating": "4.5",
              "numberOfReviews": "120"
            }
          ]
        }
      ]
    }
  ],
  "timestamp": "26th September 2025"
}
```

## 🚀 Deployment

### Docker Deployment (Recommended)

```dockerfile
FROM node:18-alpine

# Install Chromium
RUN apk add --no-cache chromium

# Set environment variables
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8100
CMD ["npm", "start"]
```

### AWS EC2 Deployment

1. Launch EC2 instance (t3.medium or larger recommended)
2. Run the setup script: `sudo ./src/setup.sh`
3. Configure environment variables
4. Set up reverse proxy (nginx) for production
5. Configure SSL certificates

### Environment-Specific Configurations

**Development:**
- Headless: false (for debugging)
- Reduced browser sessions
- Detailed logging

**Production:**
- Headless: 'shell' mode
- Optimized browser arguments
- Error handling and recovery
- Resource cleanup

## 🔧 Development

### Project Structure

```
src/
├── apis/                    # API endpoint handlers
│   ├── GMAPS_SCRAPE.ts     # Web scraping endpoint
│   └── GMAPS_SEARCH_API_SCRAPE.ts # Places API endpoint
├── functions/              # Core business logic
│   ├── common/
│   │   └── browser-batch-handler.ts # Browser pool management
│   ├── gmap-details-lead-extractor.ts # Data extraction
│   ├── gmaps-save-to-db.ts # Database operations
│   ├── mongo-db.ts         # Database connection
│   └── scrape-links.ts     # URL discovery
├── utils/                  # Utility functions
│   ├── browser.ts          # Browser configuration
│   ├── constants.ts        # Application constants
│   ├── helpers.ts          # Helper functions
│   └── lead-filter-router.ts # Lead routing logic
└── index.ts               # Application entry point
```

### Key Components

**Browser Pool Management:**
- Concurrent browser sessions (configurable)
- Automatic resource cleanup
- Error recovery and retry logic
- Progress tracking and reporting

**Data Extraction Pipeline:**
1. URL generation from geographic data
2. Business listing discovery
3. Detailed information extraction
4. Data validation and formatting
5. Database storage with upsert logic

**Request Interception:**
- Blocks unnecessary resources (images, CSS, fonts)
- Reduces bandwidth and improves performance
- Configurable resource filtering

### Adding New Features

1. **New Scraping Logic:**
   - Add functions to `src/functions/`
   - Follow existing patterns for error handling
   - Include progress reporting for long operations

2. **New API Endpoints:**
   - Create handlers in `src/apis/`
   - Add input validation with Zod schemas
   - Include proper error responses

3. **Database Schema Changes:**
   - Update MongoDB operations in `gmaps-save-to-db.ts`
   - Maintain backward compatibility
   - Add migration scripts if needed

## 🐛 Troubleshooting

### Common Issues

**Browser Launch Failures:**
```bash
# Install missing dependencies
sudo apt-get install -y chromium-browser
sudo apt-get install -y libxss1 libgconf-2-4 libasound2
```

**Memory Issues:**
- Reduce `MAX_BROWSER_SESSIONS` and `MAX_PAGES_PER_BROWSER`
- Monitor system resources
- Implement request queuing for high load

**Rate Limiting:**
- Implement delays between requests
- Use proxy rotation
- Respect robots.txt and terms of service

**Database Connection:**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string
echo $MONGODB_URI
```

### Performance Optimization

1. **Browser Pool Tuning:**
   - Adjust concurrent sessions based on available CPU/memory
   - Monitor resource usage and optimize accordingly

2. **Database Optimization:**
   - Create indexes on frequently queried fields
   - Implement connection pooling
   - Use bulk operations for large datasets

3. **Network Optimization:**
   - Use CDN for static assets
   - Implement response compression
   - Optimize API response sizes

### Monitoring and Logging

**Log Levels:**
- `console.log()`: General information
- `console.warn()`: Warning conditions
- `console.error()`: Error conditions

**Key Metrics to Monitor:**
- Request response times
- Browser session utilization
- Database connection pool status
- Memory and CPU usage
- Error rates by endpoint

## 📄 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## 📞 Support

For technical support or questions:
- Create an issue in the GitHub repository
- Check existing documentation and troubleshooting guides
- Review logs for detailed error information

---

**Note:** This system is designed for legitimate business research purposes. Always comply with website terms of service and applicable laws when scraping data.