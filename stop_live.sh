#!/bin/bash

echo "🛑 Stopping RealStream..."

# Stop all containers
docker compose -f docker-compose.prod.yml down

# Stop Cloudflare Tunnel
if pgrep -x "cloudflared" > /dev/null
then
    echo "🛑 Stopping Cloudflare Tunnel..."
    pkill -x "cloudflared"
fi

echo "✅ RealStream has been fully stopped."
echo "💡 Note: Your database data is safe."
