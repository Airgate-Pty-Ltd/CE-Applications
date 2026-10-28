#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-8080}
TIMEOUT=${TIMEOUT:-30}

echo "==> Starting server on port $PORT..."

# Start server in background
cd "$(dirname "$0")/../.." || exit 1
( PORT=$PORT npm start > /tmp/app.out 2>/tmp/app.err ) &
PID=$!

# Wait for server to start (max $TIMEOUT seconds)
echo "==> Waiting for server to start (max ${TIMEOUT}s)..."
for i in $(seq 1 $TIMEOUT); do
  sleep 1
  if curl -sS -f "http://127.0.0.1:$PORT/health" > /dev/null 2>&1; then
    echo "==> ✅ Server responded after ${i}s"
    break
  fi
  if [ $i -eq $TIMEOUT ]; then
    echo "==> ❌ Server did not respond after ${TIMEOUT}s"
    echo "==> STDOUT:"
    cat /tmp/app.out || true
    echo "==> STDERR:"
    cat /tmp/app.err || true
    kill $PID 2>/dev/null || true
    exit 1
  fi
done

echo "==> Testing /health endpoint..."
OUT=$(curl -sS -i "http://127.0.0.1:$PORT/health" || true)
STATUS=$(echo "$OUT" | head -n1)

echo "$OUT"

if echo "$STATUS" | grep -q "200"; then
  echo "==> ✅ Health probe OK"
  kill $PID 2>/dev/null || true
  wait $PID 2>/dev/null || true
  exit 0
else
  echo "==> ❌ Health probe failed: $STATUS"
  kill $PID 2>/dev/null || true
  wait $PID 2>/dev/null || true
  exit 1
fi

