# Diagnostic Commands for Nginx Setup

## Run these commands on your server to diagnose the issue:

### 1. Test nginx locally (from server)
```bash
curl http://localhost
curl http://localhost/health
curl http://localhost/api/health
```

### 2. Check nginx error logs
```bash
sudo tail -50 /var/log/nginx/error.log
sudo tail -50 /var/log/nginx/urbanesta-admin-error.log
```

### 3. Check nginx access logs
```bash
sudo tail -20 /var/log/nginx/urbanesta-admin-access.log
```

### 4. Verify nginx configuration
```bash
sudo nginx -t
sudo nginx -T | grep -A 5 "server_name"
```

### 5. Check if nginx is actually serving the config
```bash
sudo cat /etc/nginx/sites-available/urbanesta-admin-panel | grep server_name
```

### 6. Test if ports are accessible
```bash
# Check if backend is accessible
curl http://localhost:3002/health

# Check if frontend is accessible  
curl http://localhost:3000
```

### 7. Check AWS Lightsail Networking
**IMPORTANT**: In AWS Lightsail console:
1. Go to your instance
2. Click on "Networking" tab
3. Make sure port 80 (HTTP) is open in Firewall rules
4. Check if there's a Static IP attached

### 8. Test from outside (from your local machine)
```bash
# Replace with your actual public IP
curl -v http://13.233.58.166
curl -v http://13.233.58.166/health
```

### 9. Check if server_name needs to be changed
```bash
# Option 1: Use _ (catch-all) or remove server_name
sudo nano /etc/nginx/sites-available/urbanesta-admin-panel

# Change:
# server_name 13.233.58.166;
# To:
# server_name _;  # This accepts all requests
```

### 10. Restart nginx after changes
```bash
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl status nginx
```

## Most Common Issues:

### Issue 1: AWS Lightsail Firewall
- Go to AWS Lightsail → Your Instance → Networking
- Add firewall rule: HTTP (port 80) from anywhere

### Issue 2: server_name mismatch
- Try changing `server_name 13.233.58.166;` to `server_name _;`
- This makes nginx accept requests to any domain/IP

### Issue 3: Nginx not reading the config
- Verify symlink exists: `ls -la /etc/nginx/sites-enabled/`
- Check if config is loaded: `sudo nginx -T | grep urbanesta`

### Issue 4: Static IP not attached
- In Lightsail, check if instance has a static IP
- If not, attach one from Networking tab

## Quick Fix - Try This First:

```bash
# Edit nginx config
sudo nano /etc/nginx/sites-available/urbanesta-admin-panel

# Change line 27 from:
server_name 13.233.58.166;

# To:
server_name _;

# Save and exit (Ctrl+X, Y, Enter)

# Test and reload
sudo nginx -t
sudo systemctl reload nginx

# Test again
curl http://localhost
```

