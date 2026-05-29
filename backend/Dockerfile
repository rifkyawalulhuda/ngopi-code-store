# NgopiCode Digital Store - Vendure Backend Dockerfile
# Multi-stage build for optimized production image
# Memory limit: 1GB container, 900MB Node.js heap (--max-old-space-size=900)

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    cp -R node_modules /prod_modules && \
    npm ci

# Stage 2: Build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src

RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Install wget for health checks
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup --system --gid 1001 vendure && \
    adduser --system --uid 1001 vendure

# Copy production dependencies and built files
COPY --from=deps /prod_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Create static assets directory
RUN mkdir -p static/assets && chown -R vendure:vendure /app

USER vendure

# Expose Vendure API port
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start Vendure with memory limit (Requirement 12.1: 900MB heap limit)
# Worker runs inline - no separate worker process (Requirement 12.4)
CMD ["node", "--max-old-space-size=900", "dist/index.js"]
