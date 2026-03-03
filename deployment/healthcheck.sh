#!/bin/bash
# RealStream Health Check
# Run via cron: */5 * * * * /root/RealStream/deployment/healthcheck.sh >> /var/log/realstream-health.log 2>&1
# Or run manually to check status.

PROJECT_DIR="/root/RealStream"
DOMAIN="realstream.site"
ALERT_FILE="/tmp/realstream_alert_sent"

check_url() {
    local name="$1"
    local url="$2"
    local expected="${3:-200}"
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    if [ "$code" = "$expected" ] || [ "$code" = "301" ]; then
        echo "  ✅ $name: HTTP $code"
        return 0
    else
        echo "  ❌ $name: HTTP $code (expected $expected)"
        return 1
    fi
}

echo "=== [$(date)] RealStream Health Check ==="

FAILURES=0

# Check HTTPS endpoints
echo "External endpoints:"
check_url "Homepage (HTTPS)" "https://$DOMAIN/" || ((FAILURES++))
check_url "Scraper health"   "https://$DOMAIN/api/scraper/" || ((FAILURES++))

# Check Docker containers
echo ""
echo "Container status:"
CONTAINERS=$(docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps --format "{{.Name}}:{{.Status}}" 2>/dev/null)
while IFS=: read -r name status; do
    if echo "$status" | grep -qi "up"; then
        echo "  ✅ $name: $status"
    else
        echo "  ❌ $name: $status"
        ((FAILURES++))
    fi
done <<< "$CONTAINERS"

# Check disk space
echo ""
echo "Disk usage:"
DISK_PCT=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_PCT" -gt 90 ]; then
    echo "  ❌ Disk: ${DISK_PCT}% used (CRITICAL)"
    ((FAILURES++))
elif [ "$DISK_PCT" -gt 80 ]; then
    echo "  ⚠️  Disk: ${DISK_PCT}% used (WARNING)"
else
    echo "  ✅ Disk: ${DISK_PCT}% used"
fi

# Check memory
MEM_PCT=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
echo "  Memory: ${MEM_PCT}% used"

# Summary
echo ""
if [ "$FAILURES" -gt 0 ]; then
    echo "🔴 $FAILURES health check(s) FAILED"
    # Auto-restart if containers are down
    if docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps | grep -qi "exit\|dead"; then
        echo "Attempting auto-restart..."
        docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" up -d
    fi
else
    echo "🟢 All health checks passed"
    # Clear alert flag if everything recovered
    rm -f "$ALERT_FILE"
fi
