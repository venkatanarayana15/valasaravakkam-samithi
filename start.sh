#!/bin/bash
# Start both services: admin API (:3001) + main site (:3000)
# Usage:
#   ADMIN_TOKEN=<secret> ./start.sh   # required for any shared environment
#   ./start.sh                        # local dev only — mutations stay open
set -e

if [ -z "$ADMIN_TOKEN" ]; then
  echo "====================================================================="
  echo " WARNING: ADMIN_TOKEN is not set. Every admin mutation (edit, save,"
  echo " upload) is open to anyone who can reach port 3001."
  echo " Start with: ADMIN_TOKEN=<long-random-string> ./start.sh"
  echo "====================================================================="
fi

# Start admin server in background (inherits ADMIN_TOKEN)
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
