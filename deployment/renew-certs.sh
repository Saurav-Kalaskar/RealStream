#!/bin/bash
# RealStream SSL Certificate Renewal
# Run via cron: 0 3 * * 1 /root/RealStream/deployment/renew-certs.sh >> /var/log/realstream-cert-renewal.log 2>&1
set -e

DOMAIN="realstream.site"
PROJECT_DIR="/root/RealStream"
CERT_SRC="$PROJECT_DIR/certbot/conf/live/$DOMAIN"
CERT_DST="$PROJECT_DIR/certbot/certs"

echo "=== [$(date)] Starting cert renewal check ==="

# Attempt renewal using the certbot container
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" run --rm certbot \
    certbot renew --quiet --no-random-sleep-on-renew

# Copy renewed certs to flat directory (resolves symlinks)
if [ -f "$CERT_SRC/fullchain.pem" ]; then
    cp -L "$CERT_SRC/fullchain.pem" "$CERT_DST/fullchain.pem"
    cp -L "$CERT_SRC/privkey.pem" "$CERT_DST/privkey.pem"
    echo "Certs copied to $CERT_DST"

    # Reload nginx without downtime
    docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec nginx nginx -s reload
    echo "nginx reloaded"
else
    echo "WARNING: Cert files not found at $CERT_SRC"
fi

echo "=== [$(date)] Cert renewal check complete ==="
