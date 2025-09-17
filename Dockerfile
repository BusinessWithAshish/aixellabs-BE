# ====================
# Base Stage
# ====================
FROM node:18-alpine AS base

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm


# ====================
# Build Stage
# ====================
FROM base AS builder

# Copy package files for dependency caching
COPY package.json pnpm-lock.yaml* ./

# Skip Chromium download during install
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install ALL dependencies (with dev) for building
RUN pnpm install

# Copy source code
COPY . .

# Build TypeScript -> dist
RUN pnpm build


# ====================
# Dependencies Stage
# ====================
FROM base AS deps

COPY package.json pnpm-lock.yaml* ./

# Skip Chromium download during install
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install only production dependencies
RUN pnpm install --prod && \
    pnpm store prune


# ====================
# Production Stage
# ====================
FROM node:18-alpine AS production

USER root
WORKDIR /app

# Install system Chromium + curl for health checks
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      curl

# Puppeteer expects Chromium here
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy production dependencies
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Switch to non-root
USER node

EXPOSE 8100

CMD ["node", "dist/index.js"]