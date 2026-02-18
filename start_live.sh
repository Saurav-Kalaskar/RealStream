#!/bin/bash
echo "🚀 Starting RealStream Live Environment..."

# 1. Start Docker Containers
echo "📦 Making sure Docker services are up..."
docker compose -f docker-compose.prod.yml up -d

# 2. Check if Tunnel is already running
if pgrep -x "cloudflared" > /dev/null
then
    echo "✅ Cloudflare Tunnel is already running."
else
    echo "🌐 Starting Cloudflare Tunnel..."
    # Start tunnel in background and log to tunnel.log
    cloudflared tunnel --url http://localhost:80 > tunnel.log 2>&1 &
    echo "⏳ Waiting for Tunnel URL..."
    sleep 5
fi

# 3. Display Info
echo "-----------------------------------------------------"
echo "✅ App should be live!"
echo "👇 Your Public URL is:"
cat tunnel.log | grep -o 'https://[^ ]*trycloudflare.com' | head -n 1
echo ""
echo "-----------------------------------------------------"
