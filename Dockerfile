# Use Node.js base image
FROM node:18-slim

# Build arguments
ARG NODE_ENV=production
ARG BUILD_DATE
ARG VERSION

# Labels for better image management
LABEL maintainer="InstaFetch Team"
LABEL version="${VERSION}"
LABEL build-date="${BUILD_DATE}"
LABEL description="Instagram Scraper Backend with PM2"

# Install dependencies for Playwright and Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    libgconf-2-4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libnss3 \
    libnspr4 \
    libx11-6 \
    libxcb1 \
    libxext6 \
    libxrender1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=${NODE_ENV}
ENV PM2_HOME=/app/.pm2

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install PM2 globally for production process management
RUN npm install -g pm2

# Install Playwright browsers
RUN npx playwright install chromium

# Copy the rest of the application
COPY . .

# Copy env.example to .env if .env doesn't exist
RUN cp -n env.example .env 2>/dev/null || true

# Create logs directory
RUN mkdir -p logs

# Expose the port your app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application with PM2 in production mode
CMD ["pm2", "start", "ecosystem.config.js", "--env", "production", "--no-daemon"] 