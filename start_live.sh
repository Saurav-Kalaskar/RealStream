#!/bin/bash
echo "🚀 Starting RealStream Live Environment..."

# 1. Start Docker Containers
echo "📦 Making sure Docker services are up..."
docker compose -f docker-compose.prod.yml up -d

# Start Cloudflare Tunnel (Permanent)
echo "🌐 Starting Cloudflare Tunnel (realstream.site)..."
# Using nohup to keep it running in background
nohup cloudflared tunnel run realstream > tunnel.log 2>&1 &
PID=$!
echo "✅ Tunnel started with PID: $PID"

echo "-----------------------------------------------------"
echo "✅ App is LIVE at:"
echo "👉 https://realstream.site"
echo "-----------------------------------------------------"
