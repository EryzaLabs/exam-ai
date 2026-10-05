#!/bin/bash
# =======================
# COPY AND PASTE THESE COMMANDS INTO YOUR VM
# =======================

# 1. UPGRADE NODE.JS TO VERSION 20
echo "=== Step 1: Upgrading Node.js to v20 ==="
sudo apt remove nodejs -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
echo "Node.js version:"
node --version
echo "NPM version:"
npm --version

# 2. CLEAN AND REBUILD PROJECT
echo ""
echo "=== Step 2: Rebuilding Project ==="
cd ~/exam-ai/server
rm -rf node_modules package-lock.json
npm install
npm run build

# 3. CREATE LOGS DIRECTORY
echo ""
echo "=== Step 3: Creating logs directory ==="
cd ~/exam-ai
mkdir -p logs

# 4. START APPLICATION WITH SYSTEMD
echo ""
echo "=== Step 4: Starting application ==="
sudo cp ~/exam-ai/exam-ai.service /etc/systemd/system/exam-ai.service
sudo systemctl daemon-reload
sudo systemctl enable --now exam-ai.service

echo ""
echo "After starting the systemd service, continue with:"
echo "1. Configure Nginx (see VM_SETUP_SSL_GUIDE.md Step 5)"
echo "2. Setup SSL with Certbot (see VM_SETUP_SSL_GUIDE.md Step 8)"
echo ""
echo "Check application status:"
sudo systemctl status exam-ai.service --no-pager
sudo journalctl -u exam-ai.service -n 100 --no-pager
