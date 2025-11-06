# SSL/HTTPS Setup Guide for AWS Lightsail
## Domain: admin.urbanesta.in | IP: 52.66.17.130

## Prerequisites Checklist

- [ ] Domain `admin.urbanesta.in` DNS A record points to `52.66.17.130`
- [ ] Port 80 (HTTP) is open in Lightsail firewall
- [ ] Port 443 (HTTPS) is open in Lightsail firewall
- [ ] Nginx is installed and running
- [ ] PM2 apps are running (frontend and backend)

---

## Step 1: Open Port 443 in AWS Lightsail

1. Go to **AWS Lightsail Console**
2. Click on your instance: **urbanesta-admin-pannel**
3. Go to **Networking** tab
4. Under **Firewall**, click **Add rule**:
   - **Application**: Custom
   - **Protocol**: TCP
   - **Port**: 443
   - **Source**: Anywhere (0.0.0.0/0)
5. Click **Create**

---

## Step 2: Verify Domain DNS

```bash
# On your local machine or server
nslookup admin.urbanesta.in
# or
dig admin.urbanesta.in

# Should return: 52.66.17.130
```

---

## Step 3: Install Certbot

```bash
# SSH into your server
ssh ubuntu@52.66.17.130

# Update system
sudo apt update && sudo apt upgrade -y

# Install Certbot for nginx
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

---

## Step 4: Update Nginx Configuration

```bash
# Navigate to project
cd ~/admin-pl

# Pull latest changes
git pull origin main

# Copy nginx config
sudo cp nginx-admin-panel.conf /etc/nginx/sites-available/urbanesta-admin-panel

# Verify domain is set
sudo grep "server_name" /etc/nginx/sites-available/urbanesta-admin-panel

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

---

## Step 5: Obtain SSL Certificate

```bash
# Run Certbot - it will automatically configure everything
sudo certbot --nginx -d admin.urbanesta.in

# Follow the prompts:
# 1. Email address: Enter your email (for renewal reminders)
#    Press Enter to continue
# 2. Terms of service: Type 'Y' and press Enter
# 3. Share email with EFF?: Type 'Y' or 'N' (your choice)
#    Press Enter
# 4. Certbot will automatically:
#    - Obtain SSL certificate
#    - Update nginx configuration
#    - Set up HTTP → HTTPS redirect
#    - Configure auto-renewal
```

**Certbot Output Example:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/admin.urbanesta.in/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/admin.urbanesta.in/privkey.pem
This certificate expires on [date].
These files will be updated when the certificate renews.
Certbot has set up a scheduled task to automatically renew this certificate in the background.
```

---

## Step 6: Verify SSL Certificate

```bash
# Check certificate status
sudo certbot certificates

# Test HTTPS from server
curl -I https://admin.urbanesta.in

# Check nginx configuration (Certbot modified it)
sudo nginx -t

# View updated nginx config
sudo cat /etc/nginx/sites-available/urbanesta-admin-panel | grep -A 5 "ssl_certificate"
```

---

## Step 7: Update Backend CORS Configuration

```bash
# Edit backend environment file
cd ~/admin-pl/server
nano .env

# Find the ALLOWED_ORIGINS line and update it to:
ALLOWED_ORIGINS=https://admin.urbanesta.in,http://admin.urbanesta.in,http://52.66.17.130,http://localhost:3000,http://localhost

# Save: Ctrl+X, then Y, then Enter
```

**Important:** The `server/env.production` file in the repository shows the correct format. Copy that to your `.env` file.

---

## Step 8: Update Frontend Environment

```bash
# Edit frontend environment file
cd ~/admin-pl/admin
nano .env

# Update to HTTPS:
NEXT_PUBLIC_API_URL=https://admin.urbanesta.in

# Save: Ctrl+X, then Y, then Enter
```

---

## Step 9: Rebuild Frontend (CRITICAL)

```bash
# You're already in admin directory
npm run build:prod

# This will take 2-5 minutes - wait for completion
# You should see: "✓ Compiled successfully"
```

**Why rebuild?** Next.js bakes environment variables into the build at build time, not runtime.

---

## Step 10: Restart All Services

```bash
# Restart frontend
pm2 restart urbanesta-admin-frontend

# Restart backend
cd ../server
pm2 restart urbanesta-admin-api

# Check status
pm2 status

# Verify both are online
pm2 logs --lines 20
```

---

## Step 11: Verify Auto-Renewal

```bash
# Test renewal process (dry run)
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer

# Enable auto-renewal (if not already enabled)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Step 12: Final Verification

```bash
# Test HTTPS endpoints
curl https://admin.urbanesta.in
curl https://admin.urbanesta.in/health
curl https://admin.urbanesta.in/api/health

# Test HTTP redirect (should redirect to HTTPS)
curl -I http://admin.urbanesta.in
# Should show: HTTP/1.1 301 Moved Permanently
```

---

## Step 13: Test in Browser

1. Open browser
2. Visit: `https://admin.urbanesta.in`
3. Check for green lock icon (Secure)
4. Try logging in
5. Verify dashboard loads correctly

---

## Troubleshooting

### Certificate Not Issued

**Check DNS:**
```bash
dig admin.urbanesta.in
# Should return: 52.66.17.130
```

**Check Firewall:**
- AWS Lightsail → Instance → Networking → Firewall
- Ensure ports 80 and 443 are open

**Check Nginx:**
```bash
sudo systemctl status nginx
sudo nginx -t
```

**Check Domain Access:**
```bash
curl http://admin.urbanesta.in
# Should return HTML (not error)
```

### CORS Errors After SSL

1. **Update backend CORS** (Step 7)
2. **Restart backend**: `pm2 restart urbanesta-admin-api`
3. **Clear browser cache**
4. **Try again**

### Mixed Content Warnings

- Update all API URLs to use `https://`
- Rebuild frontend after changing `NEXT_PUBLIC_API_URL`
- Check browser console for any HTTP URLs

### Certificate Renewal Issues

```bash
# Check renewal logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Manually renew
sudo certbot renew

# Restart nginx after renewal
sudo systemctl restart nginx
```

---

## Post-SSL Checklist

- [ ] SSL certificate installed successfully
- [ ] HTTPS working: `https://admin.urbanesta.in`
- [ ] HTTP redirects to HTTPS automatically
- [ ] Backend CORS updated with HTTPS origin
- [ ] Frontend rebuilt with HTTPS API URL
- [ ] All services restarted
- [ ] Auto-renewal configured and tested
- [ ] Browser shows "Secure" (green lock)
- [ ] Login works correctly
- [ ] Dashboard loads without errors
- [ ] API calls work (no CORS errors)

---

## Quick Reference Commands

```bash
# Check certificate
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# View Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Check nginx SSL config
sudo nginx -T | grep -A 10 "ssl_certificate"

# Test HTTPS
curl -I https://admin.urbanesta.in

# Check renewal timer
sudo systemctl status certbot.timer
```

---

## Security Notes

1. **HSTS**: Certbot automatically adds HSTS header
2. **Strong Ciphers**: Certbot uses modern, secure cipher suites
3. **Auto-Renewal**: Certificates renew automatically every 90 days
4. **Mixed Content**: Always use HTTPS URLs in production

---

## After SSL Setup

Your admin panel will be accessible at:
- **HTTPS**: `https://admin.urbanesta.in` ✅ (Primary)
- **HTTP**: `http://admin.urbanesta.in` → Redirects to HTTPS

All API calls will use HTTPS, ensuring secure communication.

---

**Last Updated**: 2024
**Domain**: admin.urbanesta.in
**IP**: 52.66.17.130

