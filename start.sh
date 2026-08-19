#!/bin/bash
# Start both services: admin API (:3001) + main site (:3000)
# Usage: ./start.sh
set -e

# Start admin server in background
cd "$(dirname "$0")/admin"
node server.mjs &
ADMIN_PID=$!
echo "Admin server started (PID $ADMIN_PID, :3001)"

# Start main site server (exposed port)
cd "$(dirname "$0")"
npm run start -- --port 3000 --hostname 0.0.0.0 &
MAIN_PID=$!
echo "Main site started (PID $MAIN_PID, :3000)"

# Cleanup on exit
trap "kill $ADMIN_PID $MAIN_PID 2>/dev/null" EXIT

wait
