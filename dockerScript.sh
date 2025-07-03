#!/bin/bash

# Define variables
IMAGE_NAME="instagram-scraper"
DOCKER_USER="sandeepseeram22"
VERSION=$1

# Check if version is provided
if [ -z "$VERSION" ]; then
  echo "Usage: ./dockerScript.sh <version>"
  exit 1
fi

echo "Building Docker Image: $IMAGE_NAME:$VERSION..."
docker build -t $IMAGE_NAME:$VERSION .

echo "Tagging Image for Docker Hub..."
docker tag $IMAGE_NAME:$VERSION $DOCKER_USER/$IMAGE_NAME:$VERSION

echo "Pushing Image to Docker Hub..."
docker push $DOCKER_USER/$IMAGE_NAME:$VERSION

echo "Docker Image Pushed Successfully: $DOCKER_USER/$IMAGE_NAME:$VERSION"












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
