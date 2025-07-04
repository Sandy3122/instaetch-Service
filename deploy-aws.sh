#!/bin/bash

# AWS Production Deployment Script for InstaFetch Backend
# This script deploys the application on AWS EC2 using docker-compose

set -e

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
SERVICE_NAME="instagram-scraper"
VERSION=${1:-"latest"}
DOMAIN=${2:-""}

echo "🚀 InstaFetch AWS Production Deployment"
echo "======================================="
echo "Compose File: $COMPOSE_FILE"
echo "Service: $SERVICE_NAME"
echo "Version: $VERSION"
echo "Domain: $DOMAIN"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install it first."
    exit 1
fi

# Create deployment directory
DEPLOY_DIR="/opt/instafetch"
echo "📁 Setting up deployment directory: $DEPLOY_DIR"
sudo mkdir -p $DEPLOY_DIR
sudo chown $USER:$USER $DEPLOY_DIR

# Copy docker-compose file to deployment directory
echo "�� Copying docker-compose configuration..."
cp docker-compose.prod.yml $DEPLOY_DIR/
cd $DEPLOY_DIR

# Create .env file for environment variables
echo "🔧 Creating environment configuration..."
cat > .env << EOF
# AWS Production Environment
NODE_ENV=production
PM2_HOME=/app/.pm2

# Server Configuration
PORT=3000

# Security
JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 32)}
API_KEY_SECRET=${API_KEY_SECRET:-$(openssl rand -hex 32)}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Instagram Scraping
INSTAGRAM_USER_AGENT=Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36
INSTAGRAM_TIMEOUT=30000

# Cache Configuration
CACHE_TTL=3600
CACHE_CHECK_PERIOD=600

# Logging
LOG_LEVEL=info

# CORS - Update with your domain
ALLOWED_ORIGINS=http://localhost:3000,https://$DOMAIN
EOF

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down --remove-orphans || true

# Pull the latest image
echo "📥 Pulling latest image from Docker Hub..."
docker-compose -f $COMPOSE_FILE pull

# Start the services
echo "🏃 Starting services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for service to be healthy
echo "⏳ Waiting for service to be healthy..."
for i in {1..60}; do
    if docker-compose -f $COMPOSE_FILE ps | grep -q "Up"; then
        echo "✅ Service is running!"
        break
    fi
    echo "   Waiting... ($i/60)"
    sleep 2
done

# Show service status
echo ""
echo "📊 Service Status:"
docker-compose -f $COMPOSE_FILE ps

# Show container logs
echo ""
echo "📋 Recent logs:"
docker-compose -f $COMPOSE_FILE logs --tail=20

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Service Information:"
echo "   Local URL: http://localhost:3000"
echo "   Public URL: http://$PUBLIC_IP:3000"
echo "   Health Check: http://$PUBLIC_IP:3000/api/health"
echo ""
echo "🔧 Management Commands:"
echo "   View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "   Stop service: docker-compose -f $COMPOSE_FILE down"
echo "   Restart service: docker-compose -f $COMPOSE_FILE restart"
echo "   Update service: docker-compose -f $COMPOSE_FILE pull && docker-compose -f $COMPOSE_FILE up -d"
echo "   Check PM2 status: docker-compose -f $COMPOSE_FILE exec $SERVICE_NAME pm2 status"
echo ""
echo "📁 Deployment Directory: $DEPLOY_DIR"
echo "�� Compose File: $DEPLOY_DIR/$COMPOSE_FILE"
echo "🔐 Environment File: $DEPLOY_DIR/.env"