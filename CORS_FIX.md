# CORS Fix for admin.urbanesta.in

## Problem
CORS error: Requests from `http://admin.urbanesta.in` are being blocked by the backend because the domain is not in the `ALLOWED_ORIGINS` list.

## Solution

### On Your Server - Update Backend Environment File

```bash
cd ~/admin-pl/server
nano .env
```

**Update the `ALLOWED_ORIGINS` line to include your domain:**

```env
ALLOWED_ORIGINS=http://admin.urbanesta.in,http://52.66.17.130,http://localhost:3000,http://localhost
```

**Or if you want to support both HTTP and HTTPS:**

```env
ALLOWED_ORIGINS=http://admin.urbanesta.in,https://admin.urbanesta.in,http://52.66.17.130,http://localhost:3000,http://localhost
```

### Restart Backend

```bash
pm2 restart urbanesta-admin-api
```

### Update Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/urbanesta-admin-panel
```

**Update line 27 to include domain:**

```nginx
server_name admin.urbanesta.in 52.66.17.130 _;
```

**Test and reload:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Update Frontend Environment (if needed)

If your frontend is still using the IP, update it to use the domain:

```bash
cd ~/admin-pl/admin
nano .env
```

```env
NEXT_PUBLIC_API_URL=http://admin.urbanesta.in
```

**Then rebuild frontend:**

```bash
npm run build:prod
pm2 restart urbanesta-admin-frontend
```

## Verify CORS is Fixed

After making these changes:

1. Clear browser cache
2. Try logging in again
3. Check browser console - CORS errors should be gone

## Important Notes

- The backend CORS configuration checks the `Origin` header from the browser
- The origin must match exactly what's in `ALLOWED_ORIGINS`
- Make sure there are no trailing slashes in the CORS configuration
- After updating `.env`, always restart the backend with PM2

