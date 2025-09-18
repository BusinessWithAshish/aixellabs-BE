#!/bin/bash

echo "🧪 Google Maps Scraping Test Script"
echo "===================================="

# Test the browser endpoint first
echo "🔍 Testing browser launch..."
BROWSER_TEST=$(curl -s http://localhost:80/v1/test-browser)
echo "Browser test result: $BROWSER_TEST"
echo ""

# Test the scraping endpoint
echo "🔍 Testing scraping endpoint..."
SCRAPE_TEST=$(curl -s -X POST http://localhost:80/gmaps/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "query": "restaurants",
    "country": "United States",
    "states": [{
      "name": "California",
      "cities": ["Los Angeles"]
    }]
  }')

echo "Scraping test result: $SCRAPE_TEST"
echo ""

# Show recent logs
echo "📋 Recent container logs:"
docker-compose logs --tail=30
