#!/usr/bin/env bash
set -euo pipefail

export PORT=8080

echo "==> Starting server in background..."
cd backend
node src/server.js &

PID=$!

echo "==> Waiting for server to start..."
sleep 2

echo "==> Hitting /health on :8080"
set +e
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
RC=$?
set -e

echo "==> HTTP Response Code: $HTTP_CODE"

kill $PID || true
wait $PID 2>/dev/null || true

if [ $RC -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Healthcheck failed locally (exit code: $RC, HTTP: $HTTP_CODE)"
  exit 1
else
  echo "✅ Healthcheck OK locally"
fi

