#!/bin/bash
set -e

echo "=========================================="
echo "STARTUP SCRIPT EXECUTING"
echo "=========================================="
echo "Current directory: $(pwd)"
echo "Listing root directory:"
ls -la
echo ""
echo "Changing to backend directory..."
cd backend
echo "Current directory: $(pwd)"
echo "Listing backend directory:"
ls -la
echo ""
echo "Listing src directory:"
ls -la src/
echo ""
echo "About to run: node src/server.js"
echo "=========================================="
node src/server.js
