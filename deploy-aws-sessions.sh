#!/bin/bash
# AWS Deployment Script for IGSavr with Sessions
# Run this on your AWS instance

echo "🚀 Deploying IGSavr with Sessions..."

# Pull the latest image
docker pull sandeepseeram22/instagram-scraper:v0.0.9

# Stop existing container if running
docker stop instagram-scraper 2>/dev/null || true
docker rm instagram-scraper 2>/dev/null || true

# Run with sessions included
docker run -d \
  --name instagram-scraper \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -v ~/sessions:/app/src/sessions \
  -e INSTAGRAM_TIMEOUT=120000 \
  -e LOG_SESSION=true \
  --restart unless-stopped \
  sandeepseeram22/instagram-scraper:v0.0.9

echo "✅ Container started!"
echo "📊 Check logs: docker logs -f instagram-scraper"
echo "🔍 Check sessions: docker exec instagram-scraper ls -la /app/src/sessions/"
