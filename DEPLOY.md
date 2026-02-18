# Deployment Guide: RealStream on Oracle Cloud Free Tier

This guide assumes you have created an **Oracle Cloud VM.Standard.A1.Flex** instance (ARM64) and have the SSH private key.

## 1. Connect to your Instance
Open your terminal and run:
```bash
# Set permissions for your key
chmod 400 "path/to/your-key.key"

# SSH into the server (User is usually 'ubuntu' or 'opc')
ssh -i "path/to/your-key.key" ubuntu@<YOUR_INSTANCE_PUBLIC_IP>
# OR
ssh -i "path/to/your-key.key" opc@<YOUR_INSTANCE_PUBLIC_IP>
```

## 2. Install Docker (One-Time Setup)
Run these commands on the server to install Docker and Git:

```bash
# Update packages
sudo apt-get update && sudo apt-get upgrade -y

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg git

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow running docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```
*(If using Oracle Linux instead of Ubuntu, use `dnf` commands from the official Docker docs)*

## 3. Deploy the Application
```bash
# 1. Clone your repository (You might need to generate an SSH key on the server and add it to GitHub/GitLab first, or use HTTPS)
git clone https://github.com/your-username/RealStream.git
cd RealStream

# 2. Add Secrets
nano .env
# Paste the content of your local .env, ensuring you set production values.
# IMPORTANT: Set POSTGRES_HOST=postgres (matches docker-compose service name)

# 3. Start Everything
docker compose -f docker-compose.prod.yml up -d --build
```

## 4. Verification
- Frontend should be accessible at: `http://<YOUR_INSTANCE_PUBLIC_IP>`
- APIs at: `http://<YOUR_INSTANCE_PUBLIC_IP>/api/...`
