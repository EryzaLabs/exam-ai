#!/bin/bash

# Exam AI - AWS EC2 Deployment Script
# This script automates the deployment process on AWS EC2

set -e  # Exit on error

echo "🚀 Starting Exam AI Deployment on AWS EC2..."

# Configuration
APP_DIR="/home/ubuntu/exam-ai"
BACKUP_DIR="/home/ubuntu/backups"
LOG_FILE="/var/log/exam-ai-deploy.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    error "This script should be run as ubuntu user"
fi

# Create backup
log "Creating backup..."
mkdir -p "$BACKUP_DIR"
BACKUP_NAME="exam-ai-$(date +'%Y%m%d-%H%M%S').tar.gz"
if [ -d "$APP_DIR" ]; then
    tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C "$APP_DIR" . || warn "Backup failed, continuing..."
    log "Backup created: $BACKUP_NAME"
fi

# Navigate to app directory
cd "$APP_DIR" || error "App directory not found: $APP_DIR"

# Stop existing server
log "Stopping existing server..."
sudo systemctl stop exam-ai.service || warn "No existing systemd service to stop"

# Pull latest code
log "Pulling latest code from repository..."
git fetch origin
git reset --hard origin/main || git reset --hard origin/master

# Install/Update Node.js dependencies
log "Installing Node.js dependencies..."
cd server
npm install --production

# Build TypeScript
log "Building server..."
npm run build || error "Build failed"

# Install/Update Python dependencies
log "Installing Python dependencies..."
cd ..
python3.11 -m pip install --upgrade pip
python3.11 -m pip install -r requirements.txt || warn "Some Python packages failed to install"

# Check environment variables
log "Checking environment configuration..."
if [ ! -f "server/.env" ]; then
    if [ -f "server/.env.production" ]; then
        log "Copying .env.production to .env..."
        cp server/.env.production server/.env
    else
        error ".env file not found. Please create server/.env with required configuration"
    fi
fi

# Create required directories
log "Creating required directories..."
mkdir -p uploads output cache temp data logs user_reports

# Set permissions
log "Setting permissions..."
chmod +x server/dist/index.js

# Test build
log "Testing server build..."
if [ ! -f "server/dist/index.js" ]; then
    error "Build output not found: server/dist/index.js"
fi

# Install and start the systemd service
log "Installing systemd service..."
sudo cp "$APP_DIR/exam-ai.service" /etc/systemd/system/exam-ai.service
sudo systemctl daemon-reload
sudo systemctl enable exam-ai.service
sudo systemctl restart exam-ai.service

# Wait for server to start
log "Waiting for server to start..."
sleep 5

# Check if server is running
if sudo systemctl is-active --quiet exam-ai.service; then
    log "✅ Server started successfully!"
else
    error "Server failed to start. Check logs with: sudo journalctl -u exam-ai.service -n 100"
fi

# Show server status
sudo systemctl status exam-ai.service --no-pager

# Health check
log "Performing health check..."
sleep 3
HEALTH_CHECK=$(curl -s http://localhost:5670/health || echo "failed")
if [[ "$HEALTH_CHECK" == *"ok"* ]] || [[ "$HEALTH_CHECK" == *"healthy"* ]]; then
    log "✅ Health check passed!"
else
    warn "Health check failed or endpoint not available"
fi

# Reload Nginx
log "Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx || warn "Nginx reload failed"

# Clean up old backups (keep last 10)
log "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t | tail -n +11 | xargs -r rm --

# Display logs location
log "================================================"
log "Deployment completed successfully! 🎉"
log "================================================"
log "Server logs: sudo journalctl -u exam-ai.service -f"
log "Application logs: $APP_DIR/logs/"
log "Service status: sudo systemctl status exam-ai.service"
log "Backup created: $BACKUP_DIR/$BACKUP_NAME"
log "================================================"

# Show recent logs
log "Recent logs:"
sudo journalctl -u exam-ai.service -n 20 --no-pager
