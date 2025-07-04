#!/bin/bash

# InstaFetch Backend Startup Script
# This script sets up and starts the InstaFetch backend server

set -e

echo "🚀 InstaFetch Backend Startup Script"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Check if .env file exists, create from example if not
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        echo "📝 Creating .env file from env.example..."
        cp env.example .env
        echo "✅ .env file created. Please edit it with your configuration."
    else
        echo "⚠️  No .env file found and no env.example available."
        echo "📝 Creating basic .env file..."
        cat > .env << EOF
# Server Configuration
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-super-secret-jwt-key-here
API_KEY_SECRET=your-api-key-secret-here

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

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://yourdomain.com
EOF
        echo "✅ Basic .env file created. Please edit it with your configuration."
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed."
else
    echo "✅ Dependencies already installed."
fi

# Check if running in production mode
if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 Starting in PRODUCTION mode with PM2..."
    npm run pm2:start
else
    echo "🔧 Starting in DEVELOPMENT mode..."
    echo "💡 Use 'NODE_ENV=production ./start.sh' for production mode"
    npm run dev
fi 