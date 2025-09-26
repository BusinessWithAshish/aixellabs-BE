# Aixellabs - Google Maps Scraping API Server

A high-performance, enterprise-grade Google Maps scraping API server built with Node.js, TypeScript, and Puppeteer. This service provides real-time business lead extraction from Google Maps with advanced browser automation, concurrent processing, and MongoDB integration.

## 🚀 Features

- **Real-time Google Maps Scraping**: Extract business listings, contact information, and ratings
- **Concurrent Browser Processing**: Multi-browser architecture for high-performance scraping
- **Server-Sent Events (SSE)**: Real-time progress streaming for long-running operations
- **MongoDB Integration**: Automatic data persistence with hierarchical organization
- **Rate Limiting & Security**: Built-in protection against abuse and security vulnerabilities
- **Google Places API Support**: Alternative API-based scraping method
- **Lead Filtering & Routing**: Intelligent lead categorization and routing system
- **Production Ready**: Optimized for deployment with Docker and cloud environments

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Development](#development)
- [Contributing](#contributing)

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm (package manager)
- MongoDB (for data persistence)
- Google Maps Places API Key (optional, for API-based scraping)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/BusinessWithAshish/aixellabs-BE.git
   cd aixellabs-BE
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Install Puppeteer browsers**
   ```bash
   pnpm run posinstall
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start the server**
   ```bash
   pnpm run start
   ```

The server will start on `http://localhost:8100` (or your configured PORT).

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=8100
NODE_ENV=production

# Browser Configuration
MAX_BROWSER_SESSIONS=10
MAX_PAGES_PER_BROWSER=5

# Rate Limiting
RATE_LIMIT_MAX=100

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Google Maps Places API (Optional)
GOOGLE_MAPS_PLACES_API_KEY=your_api_key_here

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/aixellabs
```

## 📚 API Documentation

### Base URL
```
http://localhost:8100
```

### Authentication
Currently, the API is open. Rate limiting is applied per IP address.

### Endpoints

#### 1. Health Check
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

#### 2. Browser Test
```http
GET /v1/test-browser
```

Tests browser launch and basic functionality.

**Response:**
```json
{
  "success": true,
  "message": "Browser test successful",
  "title": "Google",
  "browserOptions": { ... }
}
```

#### 3. Google Maps Scraping (Web Scraping)
```http
POST /gmaps/scrape
```

**Request Body:**
```json
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
      "cities": ["Ahmedabad", "Surat"]
    }
  ]
}
```

**Response:** Server-Sent Events stream with real-time progress updates.

**Event Types:**
- `status`: Progress updates and phase information
- `progress`: Individual item completion
- `error`: Error notifications
- `complete`: Final results

**Example Event:**
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

#### 4. Google Maps Search API
```http
POST /gmaps/search_scrape
```

Uses Google Places API for faster, more reliable results.

**Request Body:** Same as web scraping endpoint.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "place_id_here",
      "name": "Business Name",
      "attributions": [...]
    }
  ]
}
```

### Data Models

#### Business Lead Information
```typescript
interface TGoogleMapLeadInfo {
  website: string;
  phoneNumber: string;
  name: string;
  gmapsUrl: string;
  overAllRating: string;
  numberOfReviews: string;
}
```

#### Scraping Request
```typescript
interface GmapsScrape {
  query: string;
  country: string;
  states: Array<{
    name: string;
    cities: string[];
  }>;
}
```

## 🏗️ Architecture

### System Overview

The application follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Express API   │────│  Browser Handler │────│   Puppeteer     │
│   (Routes)      │    │  (Concurrency)   │    │   (Scraping)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MongoDB       │    │   Lead Filter    │    │   Google Maps   │
│   (Storage)     │    │   (Routing)      │    │   (Target)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Core Components

#### 1. API Layer (`/src/apis/`)
- **GMAPS_SCRAPE.ts**: Main web scraping endpoint with SSE streaming
- **GMAPS_SEARCH_API_SCRAPE.ts**: Google Places API integration

#### 2. Browser Management (`/src/functions/common/`)
- **browser-batch-handler.ts**: Concurrent browser orchestration
- Manages multiple browser instances with configurable concurrency
- Implements batch processing for optimal resource utilization

#### 3. Scraping Functions (`/src/functions/`)
- **gmap-details-lead-extractor.ts**: Business detail extraction
- **scrape-links.ts**: Business listing URL collection
- **gmaps-save-to-db.ts**: MongoDB integration

#### 4. Utilities (`/src/utils/`)
- **browser.ts**: Browser configuration and optimization
- **helpers.ts**: URL generation and data formatting
- **constants.ts**: Application constants
- **lead-filter-router.ts**: Lead categorization system

### Data Flow

1. **Request Reception**: API receives scraping request with query and location data
2. **URL Generation**: System generates Google Maps search URLs for each city
3. **Browser Orchestration**: Multiple browser instances process URLs concurrently
4. **Link Collection**: First phase extracts business listing URLs
5. **Detail Extraction**: Second phase extracts detailed business information
6. **Data Processing**: Information is filtered and categorized
7. **Storage**: Results are saved to MongoDB with hierarchical organization
8. **Streaming**: Real-time progress updates sent via Server-Sent Events

### Concurrency Model

The system uses a sophisticated concurrency model:

- **Browser Sessions**: Configurable number of browser instances (default: 10)
- **Pages per Browser**: Multiple pages per browser (default: 5)
- **Batch Processing**: URLs processed in batches to manage resource usage
- **Resource Management**: Automatic cleanup and error handling

## ⚙️ Configuration

### Browser Optimization

The system includes extensive browser optimization for production environments:

```typescript
// Key optimizations include:
- Disabled images, CSS, and unnecessary resources
- Memory optimization settings
- GPU acceleration disabled for server environments
- Request interception for performance
- Custom user agents and viewport settings
```

### Performance Tuning

Adjust these environment variables for optimal performance:

```env
# Increase for more concurrent processing
MAX_BROWSER_SESSIONS=15
MAX_PAGES_PER_BROWSER=8

# Adjust rate limiting based on your needs
RATE_LIMIT_MAX=200

# MongoDB connection pooling
MONGODB_URI=mongodb://localhost:27017/aixellabs?maxPoolSize=20
```

### Security Configuration

```env
# Restrict CORS origins in production
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Enable production mode
NODE_ENV=production
```

## 🚀 Deployment

### Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   # Install Chromium
   RUN apk add --no-cache chromium
   
   # Set working directory
   WORKDIR /app
   
   # Copy package files
   COPY package*.json pnpm-lock.yaml ./
   
   # Install dependencies
   RUN npm install -g pnpm && pnpm install
   
   # Copy source code
   COPY . .
   
   # Build application
   RUN pnpm run build
   
   # Expose port
   EXPOSE 8100
   
   # Start application
   CMD ["pnpm", "run", "start"]
   ```

2. **Build and run**
   ```bash
   docker build -t aixellabs-api .
   docker run -p 8100:8100 --env-file .env aixellabs-api
   ```

### Cloud Deployment

#### AWS EC2 Setup

Use the provided setup script:

```bash
# On your EC2 instance
curl -fsSL https://raw.githubusercontent.com/your-repo/setup.sh | bash
```

#### Environment Variables for Production

```env
NODE_ENV=production
PORT=8100
MAX_BROWSER_SESSIONS=10
MAX_PAGES_PER_BROWSER=5
RATE_LIMIT_MAX=100
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aixellabs
ALLOWED_ORIGINS=https://yourdomain.com
```

### Load Balancing

For high-traffic deployments, consider:

1. **Multiple Instances**: Deploy multiple API instances
2. **Load Balancer**: Use nginx or AWS ALB
3. **Database Scaling**: MongoDB replica sets or sharding
4. **Monitoring**: Implement health checks and metrics

## 🛠️ Development

### Project Structure

```
src/
├── apis/                    # API endpoints
│   ├── GMAPS_SCRAPE.ts     # Main scraping endpoint
│   └── GMAPS_SEARCH_API_SCRAPE.ts
├── functions/              # Core business logic
│   ├── common/            # Shared utilities
│   ├── gmap-details-lead-extractor.ts
│   ├── gmaps-save-to-db.ts
│   ├── mongo-db.ts
│   └── scrape-links.ts
├── utils/                  # Utility functions
│   ├── browser.ts
│   ├── constants.ts
│   ├── helpers.ts
│   └── lead-filter-router.ts
├── index.ts               # Application entry point
└── setup.sh              # Deployment script
```

### Development Commands

```bash
# Development with hot reload
pnpm run build:watch

# Build for production
pnpm run build

# Start production server
pnpm run start

# Install Puppeteer browsers
pnpm run posinstall
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for code quality
- **Prettier**: Code formatting
- **Conventional Commits**: For commit messages

### Testing

```bash
# Run tests (when implemented)
pnpm test

# Test browser functionality
curl http://localhost:8100/v1/test-browser
```

## 📊 Monitoring & Logging

### Health Checks

The API provides built-in health monitoring:

```bash
# Basic health check
curl http://localhost:8100/v1/ping

# Browser functionality test
curl http://localhost:8100/v1/test-browser
```

### Logging

The application uses structured logging:

- **Morgan**: HTTP request logging
- **Console**: Application events and errors
- **Server-Sent Events**: Real-time progress streaming

### Metrics to Monitor

- **Response Times**: API endpoint performance
- **Browser Success Rate**: Scraping success percentage
- **Memory Usage**: Browser and Node.js memory consumption
- **Database Performance**: MongoDB query times
- **Error Rates**: Failed requests and scraping errors

## 🔧 Troubleshooting

### Common Issues

#### 1. Browser Launch Failures
```bash
# Check if Chromium is installed
which chromium-browser

# Install if missing
sudo apt-get install chromium-browser
```

#### 2. Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### 3. Rate Limiting
```bash
# Check current rate limit settings
curl -H "X-RateLimit-Limit" http://localhost:8100/v1/ping
```

#### 4. MongoDB Connection
```bash
# Test MongoDB connection
mongosh "mongodb://localhost:27017/aixellabs"
```

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
DEBUG=aixellabs:*
```

## 🤝 Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add JSDoc comments for public APIs
- Ensure all tests pass
- Update documentation for new features
- Follow conventional commit format

### Code Review Process

1. All changes require code review
2. Ensure CI/CD checks pass
3. Update documentation as needed
4. Test in staging environment

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Issues**: [GitHub Issues](https://github.com/BusinessWithAshish/aixellabs-BE/issues)
- **Discussions**: [GitHub Discussions](https://github.com/BusinessWithAshish/aixellabs-BE/discussions)
- **Email**: [Contact Information]

## 🔄 Changelog

### Version 1.0.0
- Initial release
- Google Maps web scraping
- Google Places API integration
- MongoDB integration
- Server-Sent Events streaming
- Concurrent browser processing
- Lead filtering and routing system

---

**Built with ❤️ by the Aixellabs Team**