#!/bin/bash
set -e

cd backend

# Create tables (this always exits with 0, even on errors)
echo "📋 Creating database tables..."
node src/scripts/create-all-tables.js || true

# Start the server
echo "🌐 Starting server..."
node src/server.js

