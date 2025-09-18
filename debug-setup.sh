#!/bin/bash

echo "🔍 AWS Instance Debugging Script"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the backend directory."
    exit 1
fi

echo "✅ Found package.json"

# Check Docker installation
echo "🐳 Checking Docker installation..."
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    docker --version
else
    echo "❌ Docker is not installed"
fi

# Check Docker Compose
echo "🐳 Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose is installed"
    docker-compose --version
else
    echo "❌ Docker Compose is not installed"
fi

# Check if .env file exists
echo "📄 Checking .env file..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "📋 .env contents:"
    cat .env
else
    echo "⚠️ .env file not found. Creating a basic one..."
    cat > .env << EOF
NODE_ENV=production
PORT=8100
ALLOWED_ORIGINS=*
RATE_LIMIT_MAX=100
MAX_BROWSER_SESSIONS=10
MAX_PAGES_PER_BROWSER=5
EOF
    echo "✅ Created basic .env file"
fi

# Check if Docker container is running
echo "🐳 Checking Docker containers..."
if docker ps | grep -q "puppeteer-app"; then
    echo "✅ Puppeteer app container is running"
    docker ps | grep "puppeteer-app"
else
    echo "⚠️ Puppeteer app container is not running"
fi

# Check Chromium installation in container
echo "🌐 Checking Chromium in container..."
if docker ps | grep -q "puppeteer-app"; then
    echo "🔍 Checking Chromium executable path..."
    docker exec puppeteer-app ls -la /usr/bin/chromium-browser 2>/dev/null && echo "✅ Chromium found at /usr/bin/chromium-browser" || echo "❌ Chromium not found at /usr/bin/chromium-browser"
    
    echo "🔍 Checking alternative Chromium paths..."
    docker exec puppeteer-app find /usr -name "*chromium*" 2>/dev/null | head -5
    
    echo "🔍 Checking system info..."
    docker exec puppeteer-app uname -a
fi

# Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -f http://localhost:8100/v1/ping 2>/dev/null; then
    echo "✅ Health endpoint is responding"
else
    echo "❌ Health endpoint is not responding"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. If Docker container is not running: docker-compose up -d"
echo "2. If Chromium path is wrong, check the Dockerfile"
echo "3. Check container logs: docker-compose logs -f"
echo "4. Test with a sample request to /gmaps/scrape"
