#!/bin/bash

echo "Restarting InstaFetch backend server..."

# Kill any existing node processes running the server
pkill -f "node.*server.js" || true
pkill -f "nodemon.*server.js" || true

# Wait a moment for processes to fully terminate
sleep 2

# Start the server
if [ -f "package.json" ]; then
    echo "Starting server with npm..."
    npm start
else
    echo "Starting server with node..."
    node src/server.js
fi 