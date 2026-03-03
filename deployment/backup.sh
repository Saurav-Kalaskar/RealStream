#!/bin/bash
# RealStream Database Backup
# Run via cron: 0 2 * * * /root/RealStream/deployment/backup.sh >> /var/log/realstream-backup.log 2>&1
set -e

PROJECT_DIR="/root/RealStream"
BACKUP_DIR="/root/backups/realstream"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "=== [$(date)] Starting RealStream backup ==="

# ─── PostgreSQL Backup ───────────────────────────────────────────
echo "Backing up PostgreSQL..."
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T postgres \
    pg_dump -U user -d realstream --no-owner --clean \
    | gzip > "$BACKUP_DIR/postgres_$DATE.sql.gz"
echo "PostgreSQL backup: postgres_$DATE.sql.gz ($(du -h "$BACKUP_DIR/postgres_$DATE.sql.gz" | cut -f1))"

# ─── MongoDB Backup ──────────────────────────────────────────────
echo "Backing up MongoDB..."
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T mongo \
    mongodump --db=realstream_content --archive --gzip \
    > "$BACKUP_DIR/mongo_$DATE.archive.gz"
echo "MongoDB backup: mongo_$DATE.archive.gz ($(du -h "$BACKUP_DIR/mongo_$DATE.archive.gz" | cut -f1))"

# ─── Cleanup old backups ─────────────────────────────────────────
echo "Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "=== [$(date)] Backup complete ==="
ls -lh "$BACKUP_DIR/"
