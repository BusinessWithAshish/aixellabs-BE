#!/bin/bash

echo "🔍 Enhanced AWS Instance Debugging Script"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the backend directory."
    exit 1
fi

echo "✅ Found package.json"

# Check Docker containers
echo "🐳 Checking Docker containers..."
if docker ps | grep -q "puppeteer-app"; then
    echo "✅ Puppeteer app container is running"
    CONTAINER_ID=$(docker ps | grep "puppeteer-app" | awk '{print $1}')
    echo "📦 Container ID: $CONTAINER_ID"
    
    # Check Chromium installation in container
    echo ""
    echo "🌐 Checking Chromium installation in container..."
    echo "🔍 Checking /usr/bin/chromium-browser..."
    if docker exec $CONTAINER_ID ls -la /usr/bin/chromium-browser 2>/dev/null; then
        echo "✅ Chromium found at /usr/bin/chromium-browser"
    else
        echo "❌ Chromium NOT found at /usr/bin/chromium-browser"
    fi
    
    echo ""
    echo "🔍 Checking /usr/bin/chromium..."
    if docker exec $CONTAINER_ID ls -la /usr/bin/chromium 2>/dev/null; then
        echo "✅ Chromium found at /usr/bin/chromium"
    else
        echo "❌ Chromium NOT found at /usr/bin/chromium"
    fi
    
    echo ""
    echo "🔍 Searching for all chromium executables..."
    docker exec $CONTAINER_ID find /usr -name "*chromium*" 2>/dev/null | head -10
    
    echo ""
    echo "🔍 Checking if chromium can be executed..."
    if docker exec $CONTAINER_ID /usr/bin/chromium-browser --version 2>/dev/null; then
        echo "✅ Chromium can be executed"
    else
        echo "❌ Chromium cannot be executed"
        echo "🔍 Trying alternative path..."
        if docker exec $CONTAINER_ID /usr/bin/chromium --version 2>/dev/null; then
            echo "✅ Chromium found at /usr/bin/chromium"
        else
            echo "❌ Chromium cannot be executed from either path"
        fi
    fi
    
    echo ""
    echo "🔍 Checking system packages..."
    docker exec $CONTAINER_ID apk list | grep chromium 2>/dev/null || echo "No chromium packages found via apk"
    
    echo ""
    echo "🔍 Checking container environment..."
    docker exec $CONTAINER_ID env | grep -E "(NODE_ENV|PUPPETEER)" || echo "No relevant environment variables found"
    
    echo ""
    echo "🔍 Checking container user and permissions..."
    docker exec $CONTAINER_ID whoami
    docker exec $CONTAINER_ID id
    
else
    echo "❌ Puppeteer app container is not running"
    echo "🔍 Available containers:"
    docker ps -a
fi

# Test health endpoint
echo ""
echo "🏥 Testing health endpoint..."
if curl -f http://localhost:80/v1/ping 2>/dev/null; then
    echo "✅ Health endpoint is responding"
else
    echo "❌ Health endpoint is not responding"
fi

# Test the actual scraping endpoint with detailed logging
echo ""
echo "🧪 Testing scraping endpoint..."
echo "📝 Making test request to /gmaps/scrape..."

# Create a test request
TEST_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" \
  -X POST http://localhost:80/gmaps/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "query": "restaurants",
    "country": "United States",
    "states": [{
      "name": "California",
      "cities": ["Los Angeles"]
    }]
  }' 2>/dev/null)

echo "📊 Response received:"
echo "$TEST_RESPONSE"

# Check container logs for any errors
echo ""
echo "📋 Recent container logs (last 20 lines):"
docker-compose logs --tail=20

echo ""
echo "🎯 Debugging Summary:"
echo "1. Check if Chromium is properly installed in the container"
echo "2. Verify the executable path matches what's in the code"
echo "3. Check container logs for any browser launch errors"
echo "4. Test with a simple request and monitor logs in real-time"
