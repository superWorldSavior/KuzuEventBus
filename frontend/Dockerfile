# Multi-stage build for Vite React TypeScript app
FROM node:22.13-alpine3.20 AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Set NODE_ENV for optimization
ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --omit=dev --prefer-offline --no-audit --no-fund && \
    npm cache clean --force

# Development stage (for potential dev builds)
FROM base AS dev-deps
ENV NODE_ENV=development
RUN npm ci --prefer-offline --no-audit --no-fund

# Build stage
FROM dev-deps AS builder

# Copy source code with better layering
COPY tsconfig.json tsconfig.node.json vite.config.ts ./
COPY tailwind.config.js postcss.config.js ./
COPY index.html ./
COPY src/ ./src/

# Build the application (skip type checking for now - TODO: fix TS errors)
RUN npm run build

# Production stage with security hardening
FROM nginx:1.27-alpine3.20 AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Install curl for health checks and security updates
RUN apk add --no-cache curl && \
    apk upgrade --no-cache

# Copy built assets from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/dist /usr/share/nginx/html

# Copy nginx configuration with proper permissions
COPY --chown=nextjs:nodejs nginx.conf /etc/nginx/nginx.conf

# Create necessary directories with correct permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nextjs:nodejs /var/cache/nginx /var/log/nginx /var/run /usr/share/nginx/html

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 8080

# Add labels for better container management
LABEL maintainer="KuzuEventBus Team" \
      version="1.0" \
      description="KuzuEventBus Frontend - React/TypeScript with Vite" \
      org.opencontainers.image.source="https://github.com/superWorldSavior/KuzuEventBus"

# Health check with improved configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start nginx with proper signal handling
CMD ["nginx", "-g", "daemon off;"]