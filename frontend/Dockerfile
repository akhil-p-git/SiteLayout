# Production Dockerfile for Site Layouts Frontend
# Multi-stage build for optimized static assets

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_MAPBOX_TOKEN

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_MAPBOX_TOKEN=${VITE_MAPBOX_TOKEN}

# Build the application
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user (nginx already has one)
RUN chown -R nginx:nginx /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
