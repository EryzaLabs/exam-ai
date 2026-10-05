#!/bin/bash
# Quick Setup Commands for VM
# Run these commands step-by-step after connecting to your VM

# ====================
# STEP 1: Extract Zip File
# ====================
cd ~
# Replace 'your-file.zip' with your actual filename
# unzip your-file.zip
# OR for tar.gz:
# tar -xzvf your-file.tar.gz

# ====================
# STEP 2: Install Dependencies
# ====================
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python and other tools
sudo apt install -y python3 python3-pip python3-venv

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# ====================
# STEP 3: Setup Application
# ====================
cd ~/exam-ai  # Adjust path as needed

# Install dependencies
cd server
npm install
npm run build
cd ..

# Create logs directory
mkdir -p logs

# ====================
# STEP 4: Configure Firewall
# ====================
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# ====================
# STEP 5: Setup Nginx (Manual Step Required)
# ====================
echo "Now create Nginx configuration:"
echo "sudo nano /etc/nginx/sites-available/exam-ai"
echo ""
echo "After saving the config file, run:"
echo "sudo ln -s /etc/nginx/sites-available/exam-ai /etc/nginx/sites-enabled/"
echo "sudo nginx -t"
echo "sudo systemctl restart nginx"
echo "sudo systemctl enable nginx"

# ====================
# STEP 6: Start Application with systemd
# ====================
cd ~/exam-ai
sudo cp exam-ai.service /etc/systemd/system/exam-ai.service
sudo systemctl daemon-reload
sudo systemctl enable --now exam-ai.service

# ====================
# STEP 7: Setup SSL (Replace your-domain.com with your actual domain)
# ====================
echo "Setup SSL certificate:"
echo "sudo certbot --nginx -d your-domain.com -d www.your-domain.com"

# ====================
# STEP 8: Verify Everything is Running
# ====================
sudo systemctl status exam-ai.service --no-pager
sudo systemctl status nginx
curl http://localhost:5670/health

echo ""
echo "Setup complete! Visit https://your-domain.com to verify"
