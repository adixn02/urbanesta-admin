# Nginx Configuration Deployment Guide

## Quick Deployment Steps

Follow these steps to deploy the nginx configuration on your Lightsail server.

### Step 1: Pull Latest Code
```bash
cd ~/admin-pl
git pull origin main
```

### Step 2: Backup Current Config (Optional but Recommended)
```bash
sudo cp /etc/nginx/sites-available/urbanesta-admin-panel.conf /etc/nginx/sites-available/urbanesta-admin-panel.conf.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 3: Copy New Config to sites-available
```bash
sudo cp ~/admin-pl/nginx-admin-panel.conf /etc/nginx/sites-available/urbanesta-admin-panel.conf
```

### Step 4: Remove Old Symlink (if exists)
```bash
sudo rm -f /etc/nginx/sites-enabled/urbanesta-admin-panel.conf
```

### Step 5: Create New Symlink
```bash
sudo ln -s /etc/nginx/sites-available/urbanesta-admin-panel.conf /etc/nginx/sites-enabled/urbanesta-admin-panel.conf
```

### Step 6: Test Nginx Configuration
```bash
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

If you see errors, fix them before proceeding.

### Step 7: Reload Nginx
```bash
sudo systemctl reload nginx
```

### Step 8: Restart PM2 Processes
```bash
# Restart backend
pm2 restart urbanesta-admin-api

# Restart frontend
pm2 restart urbanesta-admin-frontend

# Save PM2 config
pm2 save
```

### Step 9: Verify Everything Works
```bash
# Test backend health
curl http://localhost:3002/health

# Test frontend via nginx (should return HTML)
curl http://localhost/

# Test via IP
curl http://52.66.17.130/

# Test domain redirect (should redirect to HTTPS)
curl -I http://admin.urbanesta.in/

# Check nginx status
sudo systemctl status nginx

# Check PM2 status
pm2 status
```

## One-Line Deployment Script

If you want to do it all at once (after pulling code):

```bash
cd ~/admin-pl && \
sudo cp /etc/nginx/sites-available/urbanesta-admin-panel.conf /etc/nginx/sites-available/urbanesta-admin-panel.conf.backup.$(date +%Y%m%d_%H%M%S) && \
sudo cp ~/admin-pl/nginx-admin-panel.conf /etc/nginx/sites-available/urbanesta-admin-panel.conf && \
sudo rm -f /etc/nginx/sites-enabled/urbanesta-admin-panel.conf && \
sudo ln -s /etc/nginx/sites-available/urbanesta-admin-panel.conf /etc/nginx/sites-enabled/urbanesta-admin-panel.conf && \
sudo nginx -t && \
sudo systemctl reload nginx && \
pm2 restart urbanesta-admin-api && \
pm2 restart urbanesta-admin-frontend && \
pm2 save && \
echo "✅ Deployment complete! Testing..." && \
curl -s http://localhost:3002/health | head -1 && \
curl -s http://localhost/ | head -1
```

## Configuration Details

### Server Blocks

1. **Main HTTP Server Block** (Lines 25-234)
   - Handles: `admin.urbanesta.in`, `52.66.17.130`, and any other hostname (`_`)
   - Serves frontend on port 3000
   - Proxies `/api` to backend on port 3002
   - Handles all static files and Next.js routes

2. **Certbot Redirect Block** (End of file)
   - Handles: `admin.urbanesta.in` only
   - Redirects HTTP → HTTPS
   - Does NOT handle IP addresses (they use main block)

### Ports

- **Frontend (Next.js)**: `127.0.0.1:3000`
- **Backend (Express)**: `127.0.0.1:3002`
- **Nginx HTTP**: `80`
- **Nginx HTTPS**: `443` (after SSL setup)

### Troubleshooting

#### If nginx test fails:
```bash
# Check for syntax errors
sudo nginx -t

# View error details
sudo tail -50 /var/log/nginx/error.log
```

#### If 404 errors:
```bash
# Check if frontend is running
curl http://127.0.0.1:3000/

# Check if backend is running
curl http://127.0.0.1:3002/health

# Check nginx error logs
sudo tail -20 /var/log/nginx/urbanesta-admin-error.log
```

#### If connection refused:
```bash
# Check PM2 status
pm2 status

# Check if ports are listening
sudo netstat -tlnp | grep -E ':(3000|3002|80|443)'

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

## Notes

- The config file is located at: `~/admin-pl/nginx-admin-panel.conf`
- After SSL setup with Certbot, the HTTPS server block will be automatically added
- The Certbot redirect block only affects the domain, not IP addresses
- Always test nginx config before reloading: `sudo nginx -t`

