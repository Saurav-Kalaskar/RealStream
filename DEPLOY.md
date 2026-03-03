# Deployment Guide: RealStream on Digital Ocean

Production URL: **https://realstream.site**
Server: Digital Ocean Droplet (Ubuntu 24.04), IP `164.92.81.126`

---

## 1. Connect to the Server

```bash
ssh -i "SSh-KEY/SSh-KEY" root@164.92.81.126
```

## 2. Initial Server Setup (One-Time)

```bash
# Install Docker (if not already installed)
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow OpenSSH
sudo ufw enable
```

## 3. Deploy the Application

```bash
cd /root/RealStream

# Create .env from the example (first time only)
cp .env.production.example .env
nano .env  # Fill in real values

# Build and start everything
docker compose -f docker-compose.prod.yml up -d --build
```

## 4. SSL Certificates

Certs are managed by Let's Encrypt. The flat cert copies at `certbot/certs/` are what nginx uses (avoids Docker symlink issues).

**First-time issuance:**
```bash
# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Issue certs
docker run --rm -v ./certbot/conf:/etc/letsencrypt -v ./certbot/www:/var/www/certbot \
  -p 80:80 certbot/certbot certonly --standalone -d realstream.site -d www.realstream.site

# Copy to flat directory
mkdir -p certbot/certs
cp -L certbot/conf/live/realstream.site/fullchain.pem certbot/certs/fullchain.pem
cp -L certbot/conf/live/realstream.site/privkey.pem certbot/certs/privkey.pem

# Restart stack
docker compose -f docker-compose.prod.yml up -d
```

**Automated renewal** is handled by cron (see Operations section below).

## 5. Verification

```bash
# HTTPS
curl -I https://realstream.site

# All containers running
docker compose -f docker-compose.prod.yml ps

# Health check
bash deployment/healthcheck.sh
```

---

## Operations

### Auto-Start on Reboot (systemd)

```bash
# Install the service
sudo cp deployment/realstream.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable realstream.service

# Now the stack auto-starts on reboot. Manual controls:
sudo systemctl start realstream
sudo systemctl stop realstream
sudo systemctl status realstream
```

### Certificate Auto-Renewal (cron)

```bash
chmod +x deployment/renew-certs.sh

# Add to root crontab
sudo crontab -e
# Add this line (runs every Monday at 3am):
# 0 3 * * 1 /root/RealStream/deployment/renew-certs.sh >> /var/log/realstream-cert-renewal.log 2>&1
```

### Database Backups (cron)

```bash
chmod +x deployment/backup.sh

# Add to root crontab
sudo crontab -e
# Add this line (runs daily at 2am):
# 0 2 * * * /root/RealStream/deployment/backup.sh >> /var/log/realstream-backup.log 2>&1
```

Backups are stored in `/root/backups/realstream/` with 7-day retention.

**Restore Postgres:**
```bash
gunzip -c /root/backups/realstream/postgres_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U user -d realstream
```

**Restore MongoDB:**
```bash
docker compose -f docker-compose.prod.yml exec -T mongo \
  mongorestore --db=realstream_content --archive --gzip < /root/backups/realstream/mongo_YYYYMMDD_HHMMSS.archive.gz
```

### Health Monitoring (cron)

```bash
chmod +x deployment/healthcheck.sh

# Add to root crontab (runs every 5 minutes):
# */5 * * * * /root/RealStream/deployment/healthcheck.sh >> /var/log/realstream-health.log 2>&1

# Or run manually:
bash deployment/healthcheck.sh
```

### Log Rotation

Docker log sizes are managed via `/etc/docker/daemon.json`:
```bash
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
sudo systemctl restart docker
```

### Useful Commands

```bash
# View logs for a service
docker compose -f docker-compose.prod.yml logs -f auth-service

# Restart a single service
docker compose -f docker-compose.prod.yml restart auth-service

# Rebuild and redeploy
docker compose -f docker-compose.prod.yml up -d --build

# Shell into a container
docker compose -f docker-compose.prod.yml exec postgres psql -U user -d realstream
```
