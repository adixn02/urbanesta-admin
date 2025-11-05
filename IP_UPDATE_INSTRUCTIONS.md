# IP Address Update Instructions

## Your Static IP: 52.66.17.130

### Files Updated in Repository:
✅ `admin/env.production` - Updated to `http://52.66.17.130`
✅ `nginx-admin-panel.conf` - Updated server_name to `52.66.17.130`

### Files You Need to Update Manually on Server:

#### 1. Backend Environment File (`server/.env` or `server/env.production`)
```bash
# On your server, edit:
nano ~/admin-panel/urbanesta-admin/server/.env

# Update this line:
ALLOWED_ORIGINS=http://52.66.17.130,http://localhost:3000,http://localhost
```

#### 2. Frontend Environment File (`admin/.env`)
```bash
# On your server, edit:
nano ~/admin-panel/urbanesta-admin/admin/.env

# Should have:
NEXT_PUBLIC_API_URL=http://52.66.17.130
```

#### 3. Nginx Configuration
```bash
# On your server:
sudo nano /etc/nginx/sites-available/urbanesta-admin-panel

# Update line 27:
server_name 52.66.17.130 _;

# Test and reload:
sudo nginx -t
sudo systemctl reload nginx
```

### After Updating:

1. **Rebuild Frontend** (required because env vars are baked in):
   ```bash
   cd ~/admin-panel/urbanesta-admin/admin
   npm run build:prod
   pm2 restart urbanesta-admin-frontend
   ```

2. **Restart Backend**:
   ```bash
   cd ~/admin-panel/urbanesta-admin/server
   pm2 restart urbanesta-admin-api
   ```

3. **Verify**:
   ```bash
   curl http://52.66.17.130
   curl http://52.66.17.130/health
   curl http://52.66.17.130/api/health
   ```

### Important Notes:
- The static IP `52.66.17.130` is attached to your Lightsail instance
- Make sure port 80 (HTTP) is open in Lightsail firewall rules
- Private IP is `172.26.12.237` (internal use only)

