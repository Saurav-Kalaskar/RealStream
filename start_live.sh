#!/bin/bash
set -e
echo "🚀 Starting RealStream Live Environment..."

# Build & start all containers
echo "📦 Building and starting Docker services..."
docker compose -f docker-compose.prod.yml up -d --build

# Wait for services to stabilize
echo "⏳ Waiting for services to start..."
sleep 10

# Quick health check
echo "🔍 Running health checks..."
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 || echo "000")
if [ "$FRONTEND" = "301" ] || [ "$FRONTEND" = "200" ]; then
    echo "✅ Frontend/nginx is responding"
else
    echo "⚠️  Frontend returned HTTP $FRONTEND — check logs: docker compose -f docker-compose.prod.yml logs nginx"
fi

echo "-----------------------------------------------------"
echo "✅ App is LIVE at:"
echo "👉 https://realstream.site"
echo "-----------------------------------------------------"
echo "📊 Service status:"
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}"
