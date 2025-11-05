# Nginx Setup Instructions for Admin Panel

## Quick Setup

1. **Copy the configuration file to nginx sites-available:**
   ```bash
   sudo cp nginx-admin-panel.conf /etc/nginx/sites-available/urbanesta-admin-panel
   ```

2. **Remove default nginx site (if exists):**
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```

3. **Create symlink to enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/urbanesta-admin-panel /etc/nginx/sites-enabled/
   ```

4. **Test nginx configuration:**
   ```bash
   sudo nginx -t
   ```

5. **If test passes, reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

6. **Check nginx status:**
   ```bash
   sudo systemctl status nginx
   ```

## Configuration Details

- **Frontend**: Proxies to `127.0.0.1:3000` (Next.js admin panel)
- **Backend API**: Proxies to `127.0.0.1:3002` (Express API)
- **Server IP**: `13.233.58.166` (Update if you have a domain)
- **Rate Limiting**: 
  - Frontend: 30 requests/second
  - API: 20 requests/second
  - Static files: 100 requests/second
- **File Upload**: Max 50MB
- **Security**: Headers, hidden nginx version, blocked sensitive files

## Update Server Name (if you have a domain)

Edit the configuration file:
```bash
sudo nano /etc/nginx/sites-available/urbanesta-admin-panel
```

Change:
```nginx
server_name 13.233.58.166;
```

To:
```nginx
server_name your-domain.com www.your-domain.com;
```

Then test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Setup (Optional but Recommended)

1. **Install Certbot:**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. **Get SSL certificate:**
   ```bash
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

3. **Certbot will automatically configure nginx for HTTPS**

## Verify Setup

1. **Check if frontend is accessible:**
   ```bash
   curl http://13.233.58.166
   ```

2. **Check if API is accessible:**
   ```bash
   curl http://13.233.58.166/api/health
   ```

3. **Check backend health:**
   ```bash
   curl http://13.233.58.166/health
   ```

## Troubleshooting

### View nginx logs:
```bash
sudo tail -f /var/log/nginx/urbanesta-admin-error.log
sudo tail -f /var/log/nginx/urbanesta-admin-access.log
```

### Check if ports are listening:
```bash
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :3002
```

### Restart nginx:
```bash
sudo systemctl restart nginx
```

### Check nginx configuration syntax:
```bash
sudo nginx -t
```

