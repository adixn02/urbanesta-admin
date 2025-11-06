# Troubleshooting: 404 Not Found Error

## Problem
You're getting `404 Not Found nginx/1.24.0 (Ubuntu)` when accessing `52.66.17.130` or `admin.urbanesta.in`.

## Possible Causes

1. **Nginx config not active** - The config file might not be symlinked or enabled
2. **Default nginx server catching requests** - The default server block might be intercepting
3. **Nginx not reloaded** - Changes not applied
4. **Wrong server_name** - Config doesn't match the domain/IP being accessed

## Quick Fix Steps

### Step 1: Verify Nginx Config is Active

```bash
# Check if config is symlinked
ls -la /etc/nginx/sites-enabled/ | grep urbanesta

# If not found, create symlink
sudo ln -s /etc/nginx/sites-available/urbanesta-admin-panel /etc/nginx/sites-enabled/

# Remove default nginx site if it exists (it might be catching requests)
sudo rm /etc/nginx/sites-enabled/default
```

### Step 2: Verify Config File Location

```bash
# Check if config exists
ls -la /etc/nginx/sites-available/urbanesta-admin-panel

# If not, copy from project
cd ~/admin-pl
sudo cp nginx-admin-panel.conf /etc/nginx/sites-available/urbanesta-admin-panel
```

### Step 3: Test Nginx Configuration

```bash
# Test nginx config syntax
sudo nginx -t

# If test fails, check error message and fix
```

### Step 4: Check Active Server Blocks

```bash
# List all enabled sites
ls -la /etc/nginx/sites-enabled/

# Check which server block is catching requests
sudo nginx -T | grep "server_name"
```

### Step 5: Verify Server Name Matches

```bash
# Check server_name in config
sudo grep "server_name" /etc/nginx/sites-available/urbanesta-admin-panel

# Should show:
# server_name admin.urbanesta.in 52.66.17.130 _;
```

### Step 6: Reload Nginx

```bash
# Reload nginx (preferred - doesn't drop connections)
sudo systemctl reload nginx

# Or restart if reload doesn't work
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

### Step 7: Check Nginx Logs

```bash
# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check access logs
sudo tail -f /var/log/nginx/access.log

# Check custom logs
sudo tail -f /var/log/nginx/urbanesta-admin-error.log
```

### Step 8: Verify Upstream Services

```bash
# Check if frontend is running on port 3000
curl http://localhost:3000

# Check if backend is running on port 3002
curl http://localhost:3002/api/health

# Check PM2 status
pm2 status
```

### Step 9: Test from Server

```bash
# Test nginx locally
curl -H "Host: admin.urbanesta.in" http://localhost

# Test with IP
curl -H "Host: 52.66.17.130" http://localhost

# Test API endpoint
curl http://localhost/api/health
```

## Complete Reset (If Nothing Works)

```bash
# 1. Stop nginx
sudo systemctl stop nginx

# 2. Remove all enabled sites
sudo rm /etc/nginx/sites-enabled/*

# 3. Copy fresh config
cd ~/admin-pl
git pull origin main
sudo cp nginx-admin-panel.conf /etc/nginx/sites-available/urbanesta-admin-panel

# 4. Create symlink
sudo ln -s /etc/nginx/sites-available/urbanesta-admin-panel /etc/nginx/sites-enabled/

# 5. Test config
sudo nginx -t

# 6. Start nginx
sudo systemctl start nginx

# 7. Check status
sudo systemctl status nginx
```

## Verify Everything is Working

```bash
# 1. Check nginx is running
sudo systemctl status nginx

# 2. Check PM2 processes
pm2 status

# 3. Test local endpoints
curl http://localhost:3000
curl http://localhost:3002/api/health

# 4. Test through nginx
curl http://localhost
curl http://localhost/api/health

# 5. Test from external (if firewall allows)
curl http://52.66.17.130
```

## Common Issues

### Issue: Default nginx site is active
**Solution:**
```bash
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl reload nginx
```

### Issue: Port already in use
**Solution:**
```bash
# Check what's using port 80
sudo lsof -i :80

# Kill the process if needed
sudo kill -9 <PID>

# Restart nginx
sudo systemctl restart nginx
```

### Issue: Config syntax error
**Solution:**
```bash
# Test config
sudo nginx -t

# Fix errors shown in output
# Then reload
sudo systemctl reload nginx
```

### Issue: Permission denied
**Solution:**
```bash
# Check nginx user
sudo grep "user" /etc/nginx/nginx.conf

# Fix permissions if needed
sudo chown -R www-data:www-data /var/log/nginx
```

## Expected Behavior After Fix

- ✅ `http://52.66.17.130` → Shows admin panel (frontend)
- ✅ `http://admin.urbanesta.in` → Shows admin panel (frontend)
- ✅ `http://52.66.17.130/api/health` → Returns JSON health status
- ✅ `http://admin.urbanesta.in/api/health` → Returns JSON health status
- ✅ No 404 errors
- ✅ PM2 processes running (frontend and backend)

