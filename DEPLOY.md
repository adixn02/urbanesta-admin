# 🚀 Quick Deployment Guide for AWS Lightsail

## Your Instance Details
- **IP**: 13.233.58.166
- **Instance**: urbanesta-admin
- **Resources**: 2 GB RAM, 2 vCPUs, 60 GB SSD

## Step 1: SSH into Your Server

```bash
ssh ubuntu@13.233.58.166
```

## Step 2: Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git (if not already installed)
sudo apt install -y git
```

## Step 3: Clone Your Repository

```bash
cd ~
git clone https://github.com/adixn02/urbanesta-admin.git admin-pannel
cd admin-pannel
```

## Step 4: Create Environment Files

### Backend Environment (`server/.env`)

```bash
cd ~/admin-pannel/server
nano .env
```

Paste this and update with your actual values:

```env
NODE_ENV=production
PORT=3002
MONGODB_URL=your_mongodb_connection_string

# CORS - Update with your domain or IP
ALLOWED_ORIGINS=http://13.233.58.166,http://localhost:3000

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=urbanesta-assets

CLOUDFRONT_DOMAIN=https://dhkq2r1k6k5w8.cloudfront.net
CLOUDFRONT_SIDE_URL=dhkq2r1k6k5w8.cloudfront.net/img-assets

# Two Factor Authentication
TWO_FACTOR_API_KEY=your_2fa_api_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=30m
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# Session Configuration
SESSION_SECRET=your_session_secret
SESSION_COOKIE_NAME=urbanesta_token
SESSION_EXPIRE_DAYS=14

# API Key
API_KEY=your_api_key
```

Save and exit (Ctrl+X, then Y, then Enter)

### Frontend Environment (`admin/.env`)

```bash
cd ~/admin-pannel/admin
nano .env
```

```env
NEXT_PUBLIC_API_URL=http://13.233.58.166/api
```

Save and exit.

## Step 5: Install Dependencies

```bash
# Backend
cd ~/admin-pannel/server
npm install --production

# Frontend
cd ~/admin-pannel/admin
npm install --production
```

## Step 6: Create Required Directories

```bash
mkdir -p ~/admin-pannel/server/logs
mkdir -p ~/admin-pannel/admin/logs
mkdir -p ~/admin-pannel/server/uploads
```

## Step 7: Build Frontend

```bash
cd ~/admin-pannel/admin
npm run build
```

## Step 8: Configure Nginx

```bash
# Remove default config
sudo rm /etc/nginx/sites-enabled/default

# Create new config
sudo nano /etc/nginx/sites-available/urbanesta-admin
```

Paste this configuration:

```nginx
upstream backend {
    server 127.0.0.1:3002;
    keepalive 64;
}

upstream frontend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name 13.233.58.166;

    access_log /var/log/nginx/urbanesta-access.log;
    error_log /var/log/nginx/urbanesta-error.log;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 50M;
    }

    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }
}
```

Save and exit, then:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/urbanesta-admin /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

## Step 9: Start Applications with PM2

```bash
# Start backend
cd ~/admin-pannel/server
pm2 start ecosystem.config.js --only urbanesta-admin-api

# Start frontend
cd ~/admin-pannel/admin
pm2 start ecosystem.config.js --only urbanesta-admin-frontend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the command output to complete setup
```

## Step 10: Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable
```

## Step 11: Verify Deployment

```bash
# Check backend
curl http://localhost:3002/health

# Check frontend
curl http://localhost:3000

# Check through nginx
curl http://13.233.58.166/health
```

## Step 12: View Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/urbanesta-access.log
```

## 🔄 Updating Your Application

```bash
cd ~/admin-pannel
git pull origin main

# Backend
cd server
npm install --production
pm2 restart urbanesta-admin-api

# Frontend
cd ../admin
npm install --production
npm run build
pm2 restart urbanesta-admin-frontend
```

## 📊 Useful Commands

```bash
# PM2 status
pm2 status

# PM2 logs
pm2 logs

# PM2 monitor
pm2 monit

# Restart all
pm2 restart all

# Stop all
pm2 stop all
```

## ⚠️ Important Notes

1. **Environment Files**: Never commit `.env` files to git. They are already in `.gitignore`.

2. **MongoDB**: Make sure your MongoDB Atlas IP whitelist includes: `13.233.58.166`

3. **Security**: 
   - Keep your environment variables secure
   - Rotate secrets regularly
   - Set up SSL certificate (Let's Encrypt) for HTTPS

4. **Domain**: If you have a domain, update:
   - `ALLOWED_ORIGINS` in `server/.env`
   - `NEXT_PUBLIC_API_URL` in `admin/.env`
   - Nginx `server_name` configuration

## 🆘 Troubleshooting

### Application not starting
```bash
pm2 logs
pm2 status
```

### Port already in use
```bash
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :3002
```

### Nginx issues
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

---

Your admin panel should now be accessible at: **http://13.233.58.166**

