#!/bin/bash

# Define variables
IMAGE_NAME="instagram-scraper"
DOCKER_USER="sandeepseeram22"
VERSION=$1

# Check if version is provided
if [ -z "$VERSION" ]; then
  echo "Usage: ./dockerScript.sh <version>"
  echo "Example: ./dockerScript.sh v1.0.0"
  exit 1
fi

echo "🚀 Building Production Docker Image: $IMAGE_NAME:$VERSION..."

# Build with production optimizations
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

# Clean up local images to save space
echo "🧹 Cleaning up local images..."
docker rmi $IMAGE_NAME:$VERSION 2>/dev/null || true
docker rmi $DOCKER_USER/$IMAGE_NAME:$VERSION 2>/dev/null || true

echo "🎉 Production deployment ready!"
echo ""
echo "📋 Production Deployment Commands:"
echo "   docker pull $DOCKER_USER/$IMAGE_NAME:$VERSION"
echo "   docker run -d -p 3000:3000 --name instagram-scraper $DOCKER_USER/$IMAGE_NAME:$VERSION"
echo ""
echo "🔧 Or use docker-compose:"
echo "   docker-compose -f docker-compose.prod.yml up -d"

# Please give the permission to the script to run
# chmod +x dockerScript.sh

# Next time you want to push the image, you can run the following command
# ./dockerScript.sh v0.0.2

# To check the present docker image
# docker images

# To check the present docker image in docker hub
# dockerhub.com/sandeepkenpath/tools-service

# Present Docker Image
# sandeepkenpath/tools-service:v0.0.1

# Next Docker Image
# sandeepkenpath/tools-service:v0.0.2

# Delete the present docker image
# docker rmi sandeepkenpath/tools-service:v0.0.1


# docker run -p 4300:4300 sandeepkenpath/tools-service:v0.0.3
