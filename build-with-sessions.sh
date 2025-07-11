#!/bin/bash

set -ex

# Define variables
IMAGE_NAME="instagram-scraper"
DOCKER_USER="sandeepseeram22"
VERSION=$1

# Check if version is provided
if [ -z "$VERSION" ]; then
  echo "Usage: ./build-with-sessions.sh <version>"
  echo "Example: ./build-with-sessions.sh v1.0.1"
  exit 1
fi

echo "🔍 Checking session files..."
if [ ! -d "src/sessions" ]; then
  echo "❌ No sessions directory found!"
  echo "Please ensure you have session files in src/sessions/"
  exit 1
fi

SESSION_COUNT=$(ls src/sessions/*.json 2>/dev/null | wc -l)
if [ $SESSION_COUNT -eq 0 ]; then
  echo "❌ No session files found in src/sessions/"
  echo "Please run 'node check-sessions.js' to verify your sessions"
  exit 1
fi

echo "✅ Found $SESSION_COUNT session files:"
ls -la src/sessions/*.json

echo ""
echo "🚀 Building Docker Image with Sessions: $IMAGE_NAME:$VERSION..."

# Build with production optimizations and session files included
docker build -t $IMAGE_NAME:$VERSION \
  --build-arg NODE_ENV=production \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg VERSION=$VERSION \
  .

echo "🏷️  Tagging Image for Docker Hub..."
docker tag $IMAGE_NAME:$VERSION $DOCKER_USER/$IMAGE_NAME:$VERSION
docker tag $IMAGE_NAME:$VERSION $DOCKER_USER/$IMAGE_NAME:latest

echo "📤 Pushing Image to Docker Hub..."
docker push $DOCKER_USER/$IMAGE_NAME:$VERSION
docker push $DOCKER_USER/$IMAGE_NAME:latest

echo "✅ Docker Image Pushed Successfully!"
echo "   Image: $DOCKER_USER/$IMAGE_NAME:$VERSION"
echo "   Latest: $DOCKER_USER/$IMAGE_NAME:latest"
echo "   Sessions included: $SESSION_COUNT files"

# Clean up local images to save space
echo "🧹 Cleaning up local images..."
docker rmi $IMAGE_NAME:$VERSION 2>/dev/null || true
docker rmi $DOCKER_USER/$IMAGE_NAME:$VERSION 2>/dev/null || true

echo "🎉 Production deployment ready!"
echo ""
echo "📋 AWS Deployment Commands:"
echo "   # On your AWS instance:"
echo "   docker pull $DOCKER_USER/$IMAGE_NAME:$VERSION"
echo "   docker run -d -p 3000:3000 --name instagram-scraper $DOCKER_USER/$IMAGE_NAME:$VERSION"
echo ""
echo "🔧 Or use docker-compose on AWS:"
echo "   # Update docker-compose.prod.yml with the new image version"
echo "   docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "📊 Verify sessions are working:"
echo "   docker logs instagram-scraper | grep 'session'"
echo "   docker exec instagram-scraper ls -la /app/src/sessions/"

# Create a deployment script for AWS
cat > deploy-aws-sessions.sh << EOF
#!/bin/bash
# AWS Deployment Script for IGSavr with Sessions
# Run this on your AWS instance

echo "🚀 Deploying IGSavr with Sessions..."

# Pull the latest image
docker pull $DOCKER_USER/$IMAGE_NAME:$VERSION

# Stop existing container if running
docker stop instagram-scraper 2>/dev/null || true
docker rm instagram-scraper 2>/dev/null || true

# Run with sessions included
docker run -d \\
  --name instagram-scraper \\
  -p 3000:3000 \\
  -e NODE_ENV=production \\
  -v ~/sessions:/app/src/sessions \\
  -e INSTAGRAM_TIMEOUT=120000 \\
  -e LOG_SESSION=true \\
  --restart unless-stopped \\
  $DOCKER_USER/$IMAGE_NAME:$VERSION

echo "✅ Container started!"
echo "📊 Check logs: docker logs -f instagram-scraper"
echo "🔍 Check sessions: docker exec instagram-scraper ls -la /app/src/sessions/"
EOF

chmod +x deploy-aws-sessions.sh
echo ""
echo "📄 Created deploy-aws-sessions.sh for easy AWS deployment"
echo "   Copy this file to your AWS instance and run: ./deploy-aws-sessions.sh <version>" 