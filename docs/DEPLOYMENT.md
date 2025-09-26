# Deployment Guide

## Overview

This guide covers various deployment strategies for the Aixellabs Google Maps Scraping API, from local development to production cloud deployments. The system is designed to be containerized and cloud-native for maximum scalability and reliability.

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Production Configuration](#production-configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Local Development Setup

### Prerequisites

- **Node.js**: Version 18+ (LTS recommended)
- **pnpm**: Package manager
- **MongoDB**: Local instance or MongoDB Atlas
- **Git**: Version control

### Quick Start

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

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start development server**
   ```bash
   pnpm run build:watch
   # In another terminal
   pnpm run start
   ```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=8100
NODE_ENV=development

# Browser Configuration
MAX_BROWSER_SESSIONS=5
MAX_PAGES_PER_BROWSER=3

# Rate Limiting
RATE_LIMIT_MAX=50

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Google Maps Places API (Optional)
GOOGLE_MAPS_PLACES_API_KEY=your_api_key_here

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/aixellabs
```

## Docker Deployment

### Single Container Deployment

#### 1. Create Dockerfile

```dockerfile
# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install Chromium and necessary dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 8100

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8100/v1/ping || exit 1

# Start the application
CMD ["pnpm", "run", "start"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  aixellabs-api:
    build: .
    ports:
      - "8100:8100"
    environment:
      - NODE_ENV=production
      - PORT=8100
      - MAX_BROWSER_SESSIONS=10
      - MAX_PAGES_PER_BROWSER=5
      - RATE_LIMIT_MAX=100
      - MONGODB_URI=mongodb://mongodb:27017/aixellabs
      - ALLOWED_ORIGINS=https://yourdomain.com
    depends_on:
      - mongodb
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8100/v1/ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=aixellabs
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - aixellabs-api
    restart: unless-stopped

volumes:
  mongodb_data:
```

#### 3. Create nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    upstream aixellabs_backend {
        server aixellabs-api:8100;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name yourdomain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # Rate limiting
        limit_req zone=api burst=20 nodelay;

        # Proxy configuration
        location / {
            proxy_pass http://aixellabs_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check endpoint
        location /v1/ping {
            proxy_pass http://aixellabs_backend;
            access_log off;
        }
    }
}
```

#### 4. Deploy with Docker Compose

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale the API service
docker-compose up -d --scale aixellabs-api=3

# Stop services
docker-compose down
```

### Multi-Stage Docker Build

For production optimization:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

# Install Chromium
RUN apk add --no-cache chromium

# Create app directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 8100

CMD ["node", "dist/index.js"]
```

## Cloud Deployment

### AWS Deployment

#### 1. EC2 Instance Setup

Use the provided setup script:

```bash
# On your EC2 instance
curl -fsSL https://raw.githubusercontent.com/your-repo/setup.sh | bash
```

#### 2. Manual EC2 Setup

```bash
# Update system
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
sudo npm install -g pnpm

# Install Chromium
sudo apt-get install -y chromium-browser

# Clone repository
git clone https://github.com/BusinessWithAshish/aixellabs-BE.git
cd aixellabs-BE

# Install dependencies
pnpm install

# Create environment file
cat <<EOF > .env
PORT=8100
NODE_ENV=production
MAX_BROWSER_SESSIONS=10
MAX_PAGES_PER_BROWSER=5
RATE_LIMIT_MAX=100
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aixellabs
ALLOWED_ORIGINS=https://yourdomain.com
GOOGLE_MAPS_PLACES_API_KEY=your_api_key
EOF

# Start application
pnpm run start
```

#### 3. AWS ECS Deployment

**Task Definition:**
```json
{
  "family": "aixellabs-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "aixellabs-api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/aixellabs-api:latest",
      "portMappings": [
        {
          "containerPort": 8100,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "8100"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:mongodb-uri"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aixellabs-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8100/v1/ping || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### 4. AWS Lambda Deployment

For serverless deployment:

```yaml
# serverless.yml
service: aixellabs-api

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  memorySize: 3008
  timeout: 900
  environment:
    NODE_ENV: production
    MONGODB_URI: ${env:MONGODB_URI}
    GOOGLE_MAPS_PLACES_API_KEY: ${env:GOOGLE_MAPS_PLACES_API_KEY}

functions:
  api:
    handler: dist/index.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
    layers:
      - arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:25

plugins:
  - serverless-offline
  - serverless-plugin-chrome
```

### Google Cloud Platform

#### 1. Cloud Run Deployment

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/aixellabs-api', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/aixellabs-api']
  - name: 'gcr.io/cloud-builders/gcloud'
    args: [
      'run', 'deploy', 'aixellabs-api',
      '--image', 'gcr.io/$PROJECT_ID/aixellabs-api',
      '--region', 'us-central1',
      '--platform', 'managed',
      '--allow-unauthenticated',
      '--memory', '4Gi',
      '--cpu', '2',
      '--timeout', '900',
      '--concurrency', '10',
      '--max-instances', '10'
    ]
```

#### 2. Deploy to Cloud Run

```bash
# Build and deploy
gcloud builds submit --config cloudbuild.yaml

# Set environment variables
gcloud run services update aixellabs-api \
  --set-env-vars="NODE_ENV=production,MONGODB_URI=your_mongodb_uri"
```

### Azure Deployment

#### 1. Container Instances

```yaml
# azure-deploy.yaml
apiVersion: 2018-10-01
location: eastus
name: aixellabs-api
properties:
  containers:
  - name: aixellabs-api
    properties:
      image: your-registry.azurecr.io/aixellabs-api:latest
      resources:
        requests:
          cpu: 2
          memoryInGb: 4
      ports:
      - port: 8100
        protocol: TCP
      environmentVariables:
      - name: NODE_ENV
        value: production
      - name: PORT
        value: "8100"
  osType: Linux
  ipAddress:
    type: Public
    ports:
    - protocol: TCP
      port: 8100
  restartPolicy: Always
type: Microsoft.ContainerInstance/containerGroups
```

## Production Configuration

### Environment Variables

```env
# Production Configuration
NODE_ENV=production
PORT=8100

# Performance Tuning
MAX_BROWSER_SESSIONS=15
MAX_PAGES_PER_BROWSER=8
RATE_LIMIT_MAX=200

# Security
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aixellabs?retryWrites=true&w=majority

# External APIs
GOOGLE_MAPS_PLACES_API_KEY=your_production_api_key

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
```

### Performance Optimization

#### 1. Node.js Optimization

```bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable cluster mode
export CLUSTER_MODE=true
export CLUSTER_WORKERS=4
```

#### 2. Browser Optimization

```typescript
// Production browser configuration
const productionBrowserArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-web-security',
  '--disable-images',
  '--disable-css',
  '--disable-fonts',
  '--memory-pressure-off',
  '--max-old-space-size=4096',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-features=TranslateUI',
  '--disable-ipc-flooding-protection',
  '--disable-sync',
  '--disable-background-networking',
  '--disable-plugins',
  '--disable-print-preview',
  '--disable-speech-api',
  '--disable-file-system',
  '--disable-presentation-api',
  '--disable-permissions-api',
  '--disable-component-update',
  '--disable-domain-reliability',
  '--disable-hang-monitor',
  '--disable-prompt-on-repost',
  '--allow-running-insecure-content',
  '--ignore-certificate-errors',
  '--ignore-ssl-errors',
  '--disable-remote-fonts',
  '--disable-web-fonts',
  '--disable-remote-playback-api',
  '--blink-settings=imagesEnabled=false',
  '--disable-logging',
  '--use-gl=swiftshader',
  '--disable-background-media-suspend',
  '--autoplay-policy=user-gesture-required',
  '--disable-features=WebRtcRemoteEventLogUpload',
  '--disable-shared-workers',
  '--disable-storage-reset',
  '--disable-tab-for-desktop-share',
  '--disable-threaded-animation',
  '--disable-threaded-scrolling',
  '--disable-partial-raster',
  '--disable-skia-runtime-opts',
  '--disable-webgl',
  '--disable-webgl2',
  '--num-raster-threads=1',
  '--enable-surface-synchronization',
  '--run-all-compositor-stages-before-draw',
  '--disable-checker-imaging',
  '--disable-new-content-rendering-timeout',
  '--disable-chromium-updater',
  '--disable-device-discovery-notifications',
  '--disable-renderer-accessibility',
  '--disable-pdf-extension',
  '--disable-remote-extensions',
  '--disable-speech-synthesis-api',
  '--hide-scrollbars',
  '--mute-audio',
  '--disable-gl-extensions',
  '--disable-webgl-extensions',
  '--disable-webgl-image-chromium',
  '--disable-webgl-multisampling',
  '--force-color-profile=srgb',
  '--disable-color-correct-rendering'
];
```

### Security Configuration

#### 1. SSL/TLS Setup

```nginx
# SSL configuration
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

#### 2. Security Headers

```nginx
# Security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
```

#### 3. Firewall Configuration

```bash
# UFW firewall rules
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 8100/tcp   # Block direct access to API
sudo ufw enable
```

## Monitoring and Maintenance

### 1. Health Monitoring

#### Application Health Checks

```bash
# Basic health check
curl -f http://localhost:8100/v1/ping

# Browser functionality test
curl -f http://localhost:8100/v1/test-browser

# Database connectivity test
curl -f http://localhost:8100/v1/health/db
```

#### System Health Monitoring

```bash
# Memory usage
free -h

# CPU usage
top -p $(pgrep -f "node.*index.js")

# Disk usage
df -h

# Network connections
netstat -tulpn | grep :8100
```

### 2. Log Management

#### Log Rotation

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/aixellabs << EOF
/var/log/aixellabs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        systemctl reload aixellabs
    endscript
}
EOF
```

#### Log Monitoring

```bash
# Monitor application logs
tail -f /var/log/aixellabs/application.log

# Monitor error logs
tail -f /var/log/aixellabs/error.log

# Monitor access logs
tail -f /var/log/aixellabs/access.log
```

### 3. Performance Monitoring

#### Key Metrics to Monitor

- **Response Time**: API endpoint response times
- **Throughput**: Requests per second
- **Success Rate**: Successful scraping percentage
- **Memory Usage**: Browser and Node.js memory consumption
- **CPU Usage**: System CPU utilization
- **Database Performance**: MongoDB query times
- **Browser Performance**: Browser launch and operation times

#### Monitoring Tools

```bash
# Install monitoring tools
npm install -g pm2
npm install -g clinic

# Start with PM2
pm2 start dist/index.js --name aixellabs-api

# Monitor with PM2
pm2 monit

# Performance profiling
clinic doctor -- node dist/index.js
```

### 4. Backup and Recovery

#### Database Backup

```bash
# MongoDB backup
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/aixellabs" --out=/backup/$(date +%Y%m%d)

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="/backup/$DATE"
tar -czf "/backup/aixellabs_$DATE.tar.gz" "/backup/$DATE"
rm -rf "/backup/$DATE"
```

#### Application Backup

```bash
# Backup application code
tar -czf "aixellabs_backup_$(date +%Y%m%d).tar.gz" /app

# Backup configuration
cp .env /backup/env_$(date +%Y%m%d)
```

## Troubleshooting

### Common Issues

#### 1. Browser Launch Failures

**Symptoms:**
- Browser test endpoint returns 500 error
- "Failed to launch browser" errors

**Solutions:**
```bash
# Check if Chromium is installed
which chromium-browser

# Install Chromium
sudo apt-get install chromium-browser

# Check browser permissions
ls -la /usr/bin/chromium-browser

# Test browser launch manually
chromium-browser --headless --no-sandbox --disable-gpu --dump-dom https://www.google.com
```

#### 2. Memory Issues

**Symptoms:**
- Out of memory errors
- Browser crashes
- Slow performance

**Solutions:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Reduce browser sessions
export MAX_BROWSER_SESSIONS=5

# Monitor memory usage
free -h
ps aux --sort=-%mem | head -10
```

#### 3. Database Connection Issues

**Symptoms:**
- MongoDB connection errors
- Database timeout errors

**Solutions:**
```bash
# Test MongoDB connection
mongosh "$MONGODB_URI"

# Check MongoDB status
systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod
```

#### 4. Rate Limiting Issues

**Symptoms:**
- 429 Too Many Requests errors
- Slow response times

**Solutions:**
```bash
# Check rate limit settings
curl -I http://localhost:8100/v1/ping

# Adjust rate limits
export RATE_LIMIT_MAX=200

# Monitor rate limit headers
curl -v http://localhost:8100/v1/ping
```

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
DEBUG=aixellabs:*
LOG_LEVEL=debug
```

### Performance Debugging

```bash
# CPU profiling
node --prof dist/index.js

# Memory profiling
node --inspect dist/index.js

# Network debugging
tcpdump -i any port 8100

# Browser debugging
chromium-browser --remote-debugging-port=9222
```

### Emergency Procedures

#### 1. Service Restart

```bash
# Restart application
pm2 restart aixellabs-api

# Restart with Docker
docker-compose restart aixellabs-api

# Restart system service
sudo systemctl restart aixellabs
```

#### 2. Rollback Procedure

```bash
# Rollback to previous version
git checkout previous-version
pnpm run build
pm2 restart aixellabs-api

# Rollback Docker image
docker-compose down
docker-compose up -d --image aixellabs-api:previous-version
```

#### 3. Emergency Maintenance

```bash
# Put service in maintenance mode
echo "MAINTENANCE_MODE=true" >> .env
pm2 restart aixellabs-api

# Disable maintenance mode
sed -i '/MAINTENANCE_MODE=true/d' .env
pm2 restart aixellabs-api
```

This deployment guide provides comprehensive instructions for deploying the Aixellabs Google Maps Scraping API in various environments, from local development to production cloud deployments. Follow the appropriate section based on your deployment requirements and infrastructure setup.