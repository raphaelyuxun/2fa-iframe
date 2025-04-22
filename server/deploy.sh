#!/bin/bash

# Exit on any error
set -e

# Update system packages
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
echo "Installing required packages..."
apt-get install -y nginx certbot python3-certbot-nginx nodejs npm

# Create directories
echo "Creating directories..."
mkdir -p /opt/2fa-iframe/server/data
mkdir -p /var/www/2fa-iframe/public

# Copy server files
echo "Copying server files..."
cp -r ./server/server.js /opt/2fa-iframe/server/
cp -r ./server/package.json /opt/2fa-iframe/server/

# Copy public files
echo "Copying public files..."
cp -r ./public/* /var/www/2fa-iframe/public/

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
cd /opt/2fa-iframe/server
npm install --production

# Setup Nginx configuration
echo "Setting up Nginx configuration..."
cp ./server/nginx.conf /etc/nginx/sites-available/2fa-iframe
ln -sf /etc/nginx/sites-available/2fa-iframe /etc/nginx/sites-enabled/

# Remove default Nginx site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Setup SSL with Let's Encrypt
echo "Setting up SSL certificate..."
certbot --nginx -d kocboost.com --non-interactive --agree-tos -m admin@kocboost.com

# Setup systemd service
echo "Setting up systemd service..."
cp ./server/2fa-iframe.service /etc/systemd/system/

# Reload systemd, enable and start services
echo "Starting services..."
systemctl daemon-reload
systemctl enable 2fa-iframe
systemctl restart 2fa-iframe
systemctl restart nginx

echo "Deployment completed successfully!"
echo "Your 2FA iframe server is now running at https://kocboost.com" 