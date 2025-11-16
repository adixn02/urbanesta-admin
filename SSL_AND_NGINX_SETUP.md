# Complete SSL and Nginx Setup Guide

## Important: Attach Static IP First!

**Before proceeding, attach your static IP (35.154.149.183) to your Lightsail instance:**
1. Go to AWS Lightsail Console
2. Networking → Static IPs
3. Click on `ur-static-ip` (35.154.149.183)
4. Click "Attach" and select your instance

---

sudo rm -rf /etc/nginx/sites-available/nginx-admin-panel.conf
 sudo rm -rf /etc/nginx/sites-enabled/nginx-admin-panel.conf
cd ur-admin

## Step 1: Install Certbot

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

## Step 2: Verify Domain Points to Static IP

```bash
# Should return: 35.154.149.183
dig admin.urbanesta.in +short

# If it doesn't, wait for DNS propagation or check your DNS settings
```

## Step 3: Upload and Configure Nginx File

```bash
# Copy the nginx-admin-panel.conf file to your server
# (Use SCP from your local machine or create it on server)

# On your server, create the config file:
sudo cp nginx-admin-panel.conf  /etc/nginx/sites-available/nginx-admin-panel.conf
```

**Paste the entire content from `nginx-admin-panel.conf`**

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/nginx-admin-panel.conf /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t
```

## Step 4: Start/Restart Nginx

```bash
# If Nginx is not running
sudo systemctl start nginx

# If Nginx is running, reload
sudo systemctl reload nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

## Step 5: Install SSL Certificate

```bash
# Get SSL certificate for admin.urbanesta.in
sudo certbot --nginx -d admin.urbanesta.in
```

**During Certbot setup:**
1. Enter your email address
2. Type `A` to agree to Terms of Service
3. Type `Y` or `N` for email sharing (optional)
4. Certbot will automatically configure SSL

## Step 6: Verify SSL Installation

```bash
# Check certificates
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run

# Test HTTPS
curl -I https://admin.urbanesta.in
```

## Step 7: Update Nginx Config After SSL

After Certbot runs, it will automatically update your config file. However, you may want to add the SSL settings manually. Edit the HTTPS server block:

```bash
sudo nano /etc/nginx/sites-available/urbanesta-admin-panel
```

**Uncomment and update the SSL certificate paths** (Certbot usually does this automatically):

```nginx
ssl_certificate /etc/letsencrypt/live/admin.urbanesta.in/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/admin.urbanesta.in/privkey.pem;
```

## Step 8: Test and Reload

```bash
# Test configuration
sudo nginx -t

# If successful, reload
sudo systemctl reload nginx
```

## Step 9: Verify Everything Works

```bash
# Check Nginx status
sudo systemctl status nginx

# Check SSL certificate
sudo certbot certificates

# Test HTTP redirect (should redirect to HTTPS)
curl -I http://admin.urbanesta.in

# Test HTTPS
curl -I https://admin.urbanesta.in

# Check if services are running
pm2 status
```

## Step 10: Setup Auto-Renewal

```bash
# Check if auto-renewal timer is active
sudo systemctl status certbot.timer

# Enable if needed
sudo systemctl enable certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

---

## Troubleshooting

### If Certbot fails: "Connection refused"
```bash
# Make sure Nginx is running
sudo systemctl status nginx

# Make sure port 80 is open
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### If domain doesn't resolve correctly
```bash
# Check DNS
dig admin.urbanesta.in

# Make sure static IP is attached to instance
# Wait for DNS propagation (can take up to 48 hours)
```

### If Nginx test fails
```bash
# Check for syntax errors
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### If SSL certificate is not working
```bash
# Check certificate files exist
sudo ls -la /etc/letsencrypt/live/admin.urbanesta.in/

# Verify certificate
sudo certbot certificates

# Try renewing
sudo certbot renew
```

---

## Quick Setup Commands (All in One)

```bash
# 1. Install Certbot
sudo apt update && sudo apt install -y certbot python3-certbot-nginx

# 2. Upload nginx-admin-panel.conf to /etc/nginx/sites-available/urbanesta-admin-panel
# (Use SCP or create manually)

# 3. Enable site
sudo ln -s /etc/nginx/sites-available/urbanesta-admin-panel /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 4. Get SSL
sudo certbot --nginx -d admin.urbanesta.in

# 5. Verify
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certificates
```

---

## After Setup

- **HTTPS URL**: https://admin.urbanesta.in
- **HTTP**: Will automatically redirect to HTTPS
- **IP Access**: http://35.154.149.183 (no SSL, for direct IP access)

Your configuration is ready! The file `nginx-admin-panel.conf` has been updated with:
- Correct static IP (35.154.149.183)
- Separate HTTP blocks for domain (redirects to HTTPS) and IP (serves directly)
- Complete HTTPS server block ready for SSL certificates
- All necessary location blocks for frontend and backend

