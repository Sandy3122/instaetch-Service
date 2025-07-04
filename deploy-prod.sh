  #!/bin/bash

# Production Deployment Script for InstaFetch Backend
# This script deploys the latest version from Docker Hub

set -e

# Configuration
IMAGE_NAME="sandeepseeram22/instagram-scraper"
CONTAINER_NAME="instagram-scraper-prod"
VERSION=${1:-"latest"}
PORT=3000

echo "🚀 InstaFetch Production Deployment"
echo "===================================="
echo "Image: $IMAGE_NAME:$VERSION"
echo "Container: $CONTAINER_NAME"
echo "Port: $PORT"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop and remove existing container if it exists
if docker ps -a --format "table {{.Names}}" | grep -q "^$CONTAINER_NAME$"; then
    echo "🛑 Stopping existing container..."
    docker stop $CONTAINER_NAME || true
    docker rm $CONTAINER_NAME || true
    echo "✅ Existing container removed."
fi

# Pull the latest image
echo "📥 Pulling latest image from Docker Hub..."
docker pull $IMAGE_NAME:$VERSION

# Create necessary volumes if they don't exist
echo "📁 Creating volumes..."
docker volume create instagram_sessions 2>/dev/null || true
docker volume create pm2_logs 2>/dev/null || true
docker volume create app_data 2>/dev/null || true

# Run the container
echo "🏃 Starting container..."
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p $PORT:3000 \
    -e NODE_ENV=production \
    -e PM2_HOME=/app/.pm2 \
    -v instagram_sessions:/app/src/sessions \
    -v pm2_logs:/app/logs \
    -v app_data:/app/data \
    --memory=2g \
    --cpus=1.0 \
    --health-cmd="curl -f http://localhost:3000/api/health" \
    --health-interval=30s \
    --health-timeout=10s \
    --health-retries=3 \
    --health-start-period=40s \
    $IMAGE_NAME:$VERSION

echo "✅ Container started successfully!"

# Wait for health check
echo "⏳ Waiting for service to be healthy..."
for i in {1..30}; do
    if docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME | grep -q "healthy"; then
        echo "✅ Service is healthy!"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

# Show container status
echo ""
echo "📊 Container Status:"
docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📋 Useful Commands:"
echo "   View logs: docker logs -f $CONTAINER_NAME"
echo "   Stop service: docker stop $CONTAINER_NAME"
echo "   Restart service: docker restart $CONTAINER_NAME"
echo "   Check PM2 status: docker exec $CONTAINER_NAME pm2 status"
echo "   View PM2 logs: docker exec $CONTAINER_NAME pm2 logs"
echo ""
echo "🌐 Service URL: http://localhost:$PORT"
echo "🔍 Health Check: http://localhost:$PORT/api/health" 
