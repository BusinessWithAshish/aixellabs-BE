# Deployment Guide

## Overview

This guide covers deployment strategies for the AixelLabs Google Maps scraping API across different environments and platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [AWS EC2 Deployment](#aws-ec2-deployment)
- [Container Orchestration](#container-orchestration)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Specifications:**
- CPU: 2 vCPUs
- RAM: 4GB
- Storage: 20GB SSD
- Network: 10 Mbps bandwidth

**Recommended Specifications:**
- CPU: 4+ vCPUs
- RAM: 8GB+
- Storage: 50GB+ SSD
- Network: 100+ Mbps bandwidth

### Software Dependencies

- Node.js 18.x or higher
- npm or pnpm package manager
- Chrome/Chromium browser
- MongoDB 4.4+
- Git (for source code management)

### External Services

- **MongoDB**: Database for storing scraped data
- **Google Places API** (optional): For Places API functionality
- **Load Balancer** (production): For high availability

## Local Development

### Quick Start

1. **Clone Repository**
   ```bash
   git clone https://github.com/BusinessWithAshish/aixellabs-BE.git
   cd aixellabs-BE
   ```

2. **Install Dependencies**
   ```bash
   # Using npm
   npm install
   
   # Using pnpm (recommended)
   pnpm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```env
   PORT=8100
   NODE_ENV=development
   MAX_BROWSER_SESSIONS=5
   MAX_PAGES_PER_BROWSER=3
   MONGODB_URI=mongodb://localhost:27017/aixellabs
   ```

4. **Start Development Server**
   ```bash
   # Build and start
   npm run build
   npm start
   
   # Or watch mode
   npm run build:watch
   ```

5. **Verify Installation**
   ```bash
   curl http://localhost:8100/v1/ping
   curl http://localhost:8100/v1/test-browser
   ```

### Development Tools

**VS Code Configuration** (`.vscode/settings.json`):
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

**TypeScript Watch Mode:**
```bash
npm run build:watch
```

## Docker Deployment

### Single Container

**Dockerfile:**
```dockerfile
FROM node:18-alpine

# Install Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer executable path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile --prod

# Copy source code
COPY . .

# Build application
RUN pnpm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 8100

CMD ["pnpm", "start"]
```

**Build and Run:**
```bash
# Build image
docker build -t aixellabs-api .

# Run container
docker run -d \
  --name aixellabs \
  -p 8100:8100 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/aixellabs \
  -e MAX_BROWSER_SESSIONS=10 \
  -e MAX_PAGES_PER_BROWSER=5 \
  aixellabs-api
```

### Docker Compose

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8100:8100"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/aixellabs
      - MAX_BROWSER_SESSIONS=10
      - MAX_PAGES_PER_BROWSER=5
      - RATE_LIMIT_MAX=100
    depends_on:
      - mongodb
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 2G
          cpus: '1.0'

  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=aixellabs
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped

volumes:
  mongodb_data:
```

**Start Services:**
```bash
docker-compose up -d
```

## AWS EC2 Deployment

### Automated Setup

**Using the provided setup script:**

1. **Launch EC2 Instance**
   - AMI: Ubuntu 20.04 LTS or newer
   - Instance Type: t3.medium or larger
   - Security Group: Allow ports 22, 80, 443, 8100
   - Storage: 20GB+ EBS volume

2. **Connect and Run Setup**
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   
   # Download and run setup script
   wget https://raw.githubusercontent.com/BusinessWithAshish/aixellabs-BE/main/src/setup.sh
   chmod +x setup.sh
   sudo ./setup.sh
   ```

3. **Configure Environment**
   ```bash
   cd aixellabs-BE
   sudo nano .env
   ```
   
   Add your configuration:
   ```env
   PORT=8100
   NODE_ENV=production
   MAX_BROWSER_SESSIONS=10
   MAX_PAGES_PER_BROWSER=5
   MONGODB_URI=mongodb://localhost:27017/aixellabs
   GOOGLE_MAPS_PLACES_API_KEY=your_api_key
   RATE_LIMIT_MAX=100
   ```

### Manual EC2 Setup

1. **System Updates**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install pnpm**
   ```bash
   sudo npm install -g pnpm
   ```

4. **Install Chromium**
   ```bash
   sudo apt-get install -y chromium-browser
   ```

5. **Install MongoDB**
   ```bash
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

6. **Deploy Application**
   ```bash
   git clone https://github.com/BusinessWithAshish/aixellabs-BE.git
   cd aixellabs-BE
   pnpm install
   pnpm run build
   ```

7. **Create Systemd Service**
   ```bash
   sudo nano /etc/systemd/system/aixellabs.service
   ```
   
   Service configuration:
   ```ini
   [Unit]
   Description=AixelLabs API Server
   After=network.target mongodb.service
   
   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/aixellabs-BE
   Environment=NODE_ENV=production
   ExecStart=/usr/bin/node dist/index.js
   Restart=on-failure
   RestartSec=10
   StandardOutput=syslog
   StandardError=syslog
   SyslogIdentifier=aixellabs
   
   [Install]
   WantedBy=multi-user.target
   ```

8. **Start Service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable aixellabs
   sudo systemctl start aixellabs
   sudo systemctl status aixellabs
   ```

### Nginx Reverse Proxy

**Install Nginx:**
```bash
sudo apt install nginx
```

**Configuration** (`/etc/nginx/sites-available/aixellabs`):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Proxy settings
    location / {
        proxy_pass http://localhost:8100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # SSE support
        proxy_buffering off;
        proxy_cache off;
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
```

**Enable Site:**
```bash
sudo ln -s /etc/nginx/sites-available/aixellabs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Container Orchestration

### Kubernetes Deployment

**Namespace:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aixellabs
```

**ConfigMap:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aixellabs-config
  namespace: aixellabs
data:
  NODE_ENV: "production"
  MAX_BROWSER_SESSIONS: "10"
  MAX_PAGES_PER_BROWSER: "5"
  RATE_LIMIT_MAX: "100"
```

**Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aixellabs-api
  namespace: aixellabs
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aixellabs-api
  template:
    metadata:
      labels:
        app: aixellabs-api
    spec:
      containers:
      - name: api
        image: aixellabs-api:latest
        ports:
        - containerPort: 8100
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: aixellabs-secrets
              key: mongodb-uri
        envFrom:
        - configMapRef:
            name: aixellabs-config
        resources:
          limits:
            memory: "4Gi"
            cpu: "2000m"
          requests:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /v1/ping
            port: 8100
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /v1/ping
            port: 8100
          initialDelaySeconds: 5
          periodSeconds: 5
```

**Service:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: aixellabs-service
  namespace: aixellabs
spec:
  selector:
    app: aixellabs-api
  ports:
  - port: 80
    targetPort: 8100
  type: LoadBalancer
```

**HPA (Horizontal Pod Autoscaler):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aixellabs-hpa
  namespace: aixellabs
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aixellabs-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### ECS Fargate Deployment

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
          "name": "MAX_BROWSER_SESSIONS",
          "value": "10"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:aixellabs/mongodb-uri"
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

## Database Setup

### MongoDB Atlas (Recommended)

1. **Create Cluster**
   - Sign up at https://cloud.mongodb.com
   - Create M10 or larger cluster
   - Configure network access (whitelist your IPs)
   - Create database user

2. **Connection Configuration**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aixellabs?retryWrites=true&w=majority
   ```

3. **Index Creation**
   ```javascript
   // Connect to MongoDB and create indexes
   db.india.createIndex({ "state": 1 })
   db.india.createIndex({ "cities.city_name": 1 })
   db.india.createIndex({ "cities.queries.query_slug": 1 })
   ```

### Self-Hosted MongoDB

**Installation (Ubuntu):**
```bash
# Install MongoDB
sudo apt-get install -y mongodb-org

# Start and enable service
sudo systemctl start mongod
sudo systemctl enable mongod

# Secure installation
mongo --eval "db.adminCommand('listCollections')"
```

**Configuration** (`/etc/mongod.conf`):
```yaml
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  fork: true
  pidFilePath: /var/run/mongodb/mongod.pid
  timeZoneInfo: /usr/share/zoneinfo

security:
  authorization: enabled
```

**Create Database and User:**
```javascript
use admin
db.createUser({
  user: "aixellabs",
  pwd: "secure_password",
  roles: [
    { role: "readWrite", db: "aixellabs" },
    { role: "dbAdmin", db: "aixellabs" }
  ]
})
```

## Environment Configuration

### Production Environment Variables

**Complete .env Template:**
```env
# Server Configuration
PORT=8100
NODE_ENV=production

# Browser Pool Settings
MAX_BROWSER_SESSIONS=10
MAX_PAGES_PER_BROWSER=5

# Database Configuration
MONGODB_URI=mongodb://username:password@localhost:27017/aixellabs

# API Keys
GOOGLE_MAPS_PLACES_API_KEY=your_google_api_key

# Security Settings
ALLOWED_ORIGINS=https://yourdomain.com,https://anotherdomain.com
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

### Environment-Specific Configurations

**Development:**
```env
NODE_ENV=development
MAX_BROWSER_SESSIONS=3
MAX_PAGES_PER_BROWSER=2
LOG_LEVEL=debug
```

**Staging:**
```env
NODE_ENV=staging
MAX_BROWSER_SESSIONS=5
MAX_PAGES_PER_BROWSER=3
LOG_LEVEL=info
```

**Production:**
```env
NODE_ENV=production
MAX_BROWSER_SESSIONS=15
MAX_PAGES_PER_BROWSER=8
LOG_LEVEL=warn
```

### Secret Management

**AWS Secrets Manager:**
```bash
# Store secrets
aws secretsmanager create-secret \
  --name "aixellabs/mongodb-uri" \
  --description "MongoDB connection string" \
  --secret-string "mongodb+srv://user:pass@cluster.mongodb.net/aixellabs"

aws secretsmanager create-secret \
  --name "aixellabs/google-api-key" \
  --description "Google Maps API Key" \
  --secret-string "your_google_api_key"
```

**Kubernetes Secrets:**
```bash
kubectl create secret generic aixellabs-secrets \
  --from-literal=mongodb-uri="mongodb://user:pass@host:27017/aixellabs" \
  --from-literal=google-api-key="your_google_api_key" \
  --namespace=aixellabs
```

## Monitoring and Maintenance

### Health Checks

**Application Health:**
```bash
# Basic health check
curl http://localhost:8100/v1/ping

# Browser functionality test
curl http://localhost:8100/v1/test-browser
```

**System Health:**
```bash
# Check service status
sudo systemctl status aixellabs

# Check resource usage
htop
df -h
free -m

# Check logs
sudo journalctl -u aixellabs -f
```

### Log Management

**Application Logs:**
```bash
# View recent logs
sudo journalctl -u aixellabs --since "1 hour ago"

# Follow logs in real-time
sudo journalctl -u aixellabs -f

# Export logs
sudo journalctl -u aixellabs --since "1 day ago" > aixellabs.log
```

**Log Rotation:**
```bash
# Configure logrotate
sudo nano /etc/logrotate.d/aixellabs
```

```
/var/log/aixellabs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    create 644 ubuntu ubuntu
    postrotate
        sudo systemctl reload aixellabs
    endscript
}
```

### Backup and Recovery

**Database Backup:**
```bash
# Create backup
mongodump --uri="mongodb://localhost:27017/aixellabs" --out=/backup/$(date +%Y%m%d)

# Restore backup
mongorestore --uri="mongodb://localhost:27017/aixellabs" /backup/20250926/aixellabs/
```

**Application Backup:**
```bash
# Backup configuration and code
tar -czf aixellabs-backup-$(date +%Y%m%d).tar.gz \
  /home/ubuntu/aixellabs-BE \
  /etc/systemd/system/aixellabs.service \
  /etc/nginx/sites-available/aixellabs
```

### Performance Monitoring

**System Metrics:**
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor in real-time
htop              # CPU and memory
iotop             # Disk I/O
nethogs           # Network usage
```

**Application Metrics:**
```javascript
// Add to your application for monitoring
const memUsage = process.memoryUsage();
console.log('Memory usage:', {
  rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
  heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
  heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
});
```

## Troubleshooting

### Common Issues

**Browser Launch Failures:**
```bash
# Check Chromium installation
chromium-browser --version

# Install missing dependencies
sudo apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxss1 \
  libgtk-3-0 \
  libxrandr2 \
  libasound2 \
  libpangocairo-1.0-0 \
  libatk1.0-0 \
  libcairo-gobject2 \
  libgtk-3-0 \
  libgdk-pixbuf2.0-0

# Test browser manually
chromium-browser --headless --no-sandbox --dump-dom https://google.com
```

**Memory Issues:**
```bash
# Check memory usage
free -m
ps aux --sort=-%mem | head -10

# Increase swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**Database Connection Issues:**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Test connection
mongo --eval "db.adminCommand('ismaster')"

# Check network connectivity
telnet localhost 27017
```

**High CPU Usage:**
```bash
# Identify processes
top -c

# Reduce browser sessions
# Edit .env file
MAX_BROWSER_SESSIONS=5
MAX_PAGES_PER_BROWSER=3

# Restart service
sudo systemctl restart aixellabs
```

### Performance Tuning

**System Optimization:**
```bash
# Increase file descriptor limits
echo "* soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65535" | sudo tee -a /etc/security/limits.conf

# Optimize network settings
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.ip_local_port_range = 1024 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Application Tuning:**
```bash
# Adjust browser pool settings based on resources
# For 4GB RAM, 2 CPU:
MAX_BROWSER_SESSIONS=5
MAX_PAGES_PER_BROWSER=3

# For 8GB RAM, 4 CPU:
MAX_BROWSER_SESSIONS=10
MAX_PAGES_PER_BROWSER=5

# For 16GB RAM, 8 CPU:
MAX_BROWSER_SESSIONS=15
MAX_PAGES_PER_BROWSER=8
```

### Debugging

**Enable Debug Mode:**
```env
NODE_ENV=development
LOG_LEVEL=debug
```

**Browser Debug Mode:**
```javascript
// In browser.ts, set headless to false for debugging
export const getBrowserOptions = async (): Promise<LaunchOptions> => {
  return {
    headless: false,  // Set to false for debugging
    defaultViewport: null,
    args: [...optimisedBrowserArgs],
    timeout: 60000
  }
}
```

**Network Debugging:**
```bash
# Monitor network connections
sudo netstat -tulpn | grep 8100

# Check firewall rules
sudo ufw status

# Test API endpoints
curl -v http://localhost:8100/v1/ping
```

---

This deployment guide provides comprehensive instructions for deploying the AixelLabs API across various environments and platforms. Choose the deployment method that best fits your infrastructure and requirements.