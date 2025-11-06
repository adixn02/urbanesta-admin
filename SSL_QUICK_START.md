# SSL Quick Start - Commands Only

Run these commands on your server in order:

```bash
# 1. Open port 443 in AWS Lightsail Console (do this first!)

# 2. Install Certbot
sudo apt update && sudo apt upgrade -y
sudo apt install -y certbot python3-certbot-nginx

# 3. Update nginx config
cd ~/admin-pl
git pull origin main
sudo cp nginx-admin-panel.conf /etc/nginx/sites-available/urbanesta-admin-panel
sudo nginx -t
sudo systemctl reload nginx

# 4. Get SSL certificate (follow prompts)
sudo certbot --nginx -d admin.urbanesta.in

# 5. Update backend CORS
cd ~/admin-pl/server
nano .env
# Update: ALLOWED_ORIGINS=https://admin.urbanesta.in,http://admin.urbanesta.in,http://52.66.17.130,http://localhost:3000,http://localhost
pm2 restart urbanesta-admin-api

# 6. Update frontend and rebuild
cd ~/admin-pl/admin
nano .env
# Update: NEXT_PUBLIC_API_URL=https://admin.urbanesta.in
npm run build:prod
pm2 restart urbanesta-admin-frontend

# 7. Verify
curl https://admin.urbanesta.in
pm2 status
```

Done! 🎉

