#!/bin/bash
echo "🛑 Stopping RealStream..."

# Stop all containers
docker compose -f docker-compose.prod.yml down

echo "✅ RealStream has been fully stopped."
echo "💡 Note: Your database data is preserved in Docker volumes."
echo "💡 To also remove volumes: docker compose -f docker-compose.prod.yml down -v"
