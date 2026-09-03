#!/usr/bin/env bash
set -e

# Resolve project root directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

echo "🚀 Starting all services (API, Worker, Web Frontend, Ngrok) in separate terminals..."

if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS: Open separate Terminal windows using AppleScript
  osascript <<APPLESCRIPT
tell application "Terminal"
    activate
    -- Terminal 1: Backend API Server
    do script "cd \"$DIR\" && echo '🌐 [1/4] Starting API Server (port 4000)...' && yarn workspace @recovery/api dev"
    
    -- Terminal 2: Worker
    do script "cd \"$DIR\" && echo '⚙️ [2/4] Starting Background Worker...' && yarn workspace @recovery/worker dev"
    
    -- Terminal 3: Web Frontend
    do script "cd \"$DIR\" && echo '💻 [3/4] Starting Next.js Web Frontend (port 3000)...' && yarn workspace web dev"
    
    -- Terminal 4: Ngrok Tunnel
    do script "cd \"$DIR\" && echo '🔗 [4/4] Starting Ngrok Tunnel for Webhooks (port 4000)...' && (command -v ngrok >/dev/null 2>&1 && ngrok http 4000 || npx ngrok http 4000)"
end tell
APPLESCRIPT
  echo "✅ Opened 4 separate terminal windows for API, Worker, Web, and Ngrok!"
else
  echo "⚠️ Non-macOS environment detected. Running services with background processes..."
  (cd "$DIR" && yarn workspace @recovery/api dev) &
  (cd "$DIR" && yarn workspace @recovery/worker dev) &
  (cd "$DIR" && yarn workspace web dev) &
  (cd "$DIR" && (command -v ngrok >/dev/null 2>&1 && ngrok http 4000 || npx ngrok http 4000)) &
  wait
fi
