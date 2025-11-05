# Nginx Troubleshooting Guide

## Quick Diagnostic Commands

Run these commands on your server to diagnose nginx issues:

### 1. Check if nginx is running
```bash
sudo systemctl status nginx
```

### 2. Check if nginx is listening on port 80
```bash
sudo netstat -tulpn | grep :80
# or
sudo ss -tulpn | grep :80
```

### 3. Check nginx configuration
```bash
sudo nginx -t
```

### 4. Check if nginx config file exists
```bash
ls -la /etc/nginx/sites-available/urbanesta-admin-panel
ls -la /etc/nginx/sites-enabled/urbanesta-admin-panel
```

### 5. Check nginx error logs
```bash
sudo tail -50 /var/log/nginx/error.log
sudo tail -50 /var/log/nginx/urbanesta-admin-error.log
```

### 6. Check firewall rules
```bash
sudo ufw status
sudo iptables -L -n | grep 80
```

### 7. Test nginx configuration syntax
```bash
sudo nginx -T  # Shows full config
```

## Common Issues and Fixes

### Issue 1: Nginx not installed or not running
```bash
# Install nginx
sudo apt install -y nginx

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Issue 2: Configuration file not set up
```bash
cd ~/admin-panel/urbanesta-admin

# Copy config file
sudo cp nginx-admin-panel.conf /etc/nginx/sites-available/urbanesta-admin-panel

# Remove default
sudo rm -f /etc/nginx/sites-enabled/default

# Create symlink
sudo ln -s /etc/nginx/sites-available/urbanesta-admin-panel /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Issue 3: Port 80 blocked by firewall
```bash
# Allow port 80
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### Issue 4: Nginx config has errors
```bash
# Test config
sudo nginx -t

# If errors, check the specific file
sudo nano /etc/nginx/sites-available/urbanesta-admin-panel

# After fixing, test again
sudo nginx -t
sudo systemctl reload nginx
```

### Issue 5: Wrong server_name or IP
```bash
# Check what IP nginx is configured for
sudo grep "server_name" /etc/nginx/sites-available/urbanesta-admin-panel

# Should show: server_name 13.233.58.166;
```

### Issue 6: PM2 apps not accessible from nginx
```bash
# Check if apps are running
pm2 status

# Check if they're listening on correct ports
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :3002

# Test local access
curl http://localhost:3000
curl http://localhost:3002/health
```

## Complete Setup Checklist

Run these commands in order:

```bash
# 1. Ensure nginx is installed and running
sudo apt update
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 2. Pull latest config
cd ~/admin-panel/urbanesta-admin
git pull origin main

# 3. Copy nginx config
sudo cp nginx-admin-panel.conf /etc/nginx/sites-available/urbanesta-admin-panel

# 4. Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# 5. Enable your site
sudo ln -s /etc/nginx/sites-available/urbanesta-admin-panel /etc/nginx/sites-enabled/

# 6. Test configuration
sudo nginx -t

# 7. If test passes, reload nginx
sudo systemctl reload nginx

# 8. Check firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 9. Verify nginx is listening
sudo netstat -tulpn | grep :80

# 10. Test from server
curl http://localhost
curl http://13.233.58.166
```

## Test from Your Local Machine

```bash
# Test if port 80 is accessible from outside
curl http://13.233.58.166
curl http://13.233.58.166/health
curl http://13.233.58.166/api/health

# Or use browser
# Open: http://13.233.58.166
```

## View Real-time Logs

```bash
# Watch nginx access logs
sudo tail -f /var/log/nginx/urbanesta-admin-access.log

# Watch nginx error logs
sudo tail -f /var/log/nginx/urbanesta-admin-error.log

# Watch PM2 logs
pm2 logs
```

