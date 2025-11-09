# Production Issues Fixed - Deployment Guide

## Issues Fixed

### 1. ✅ POST /api/admin/users 500 Error
**Problem:** Missing `logger` import in `server/routes/adminRoutes.js` caused undefined reference error  
**Fix:** Added `import logger from '../utils/logger.js'` and replaced all `console.error` with `logger.error`

### 2. ⚠️ /logs Page 404 Error
**Problem:** Frontend route not accessible (likely build issue)  
**Fix:** Rebuild frontend with production environment

---

## Deployment Steps

### Step 1: Pull Latest Code

```bash
cd ~/ur-admin

# Pull latest changes from GitHub
git pull origin main
```

### Step 2: Update Backend

```bash
cd ~/ur-admin/server

# Install dependencies (if needed)
npm install

# Restart server
pm2 restart server

# Check logs
pm2 logs server --lines 50
```

### Step 3: Rebuild and Restart Frontend

```bash
cd ~/ur-admin/admin

# Build with production environment
npm run build:prod

# Restart admin panel
pm2 restart admin

# Check logs
pm2 logs admin --lines 50
```

### Step 4: Verify Everything Works

```bash
# Check PM2 status
pm2 status

# Check server logs for any errors
pm2 logs --lines 100

# Test the endpoints
curl -I https://admin.urbanesta.in
curl -I https://admin.urbanesta.in/logs
```

---

## Test Checklist

After deployment, test these features:

- [ ] Login to admin panel (https://admin.urbanesta.in)
- [ ] Navigate to "Sub Administrator" page
- [ ] Try creating a new subadmin
- [ ] Try updating an existing subadmin
- [ ] Navigate to "Logs" page (/logs)
- [ ] Verify logs are displayed
- [ ] Check dashboard stats load correctly

---

## Troubleshooting

### If you still get 500 errors:

```bash
# Check detailed server logs
pm2 logs server --lines 200

# Check MongoDB connection
pm2 logs server | grep -i mongo

# Restart with fresh logs
pm2 restart all
pm2 flush
pm2 logs
```

### If /logs page still shows 404:

```bash
cd ~/ur-admin/admin

# Check if .next directory exists and has content
ls -la .next/

# If not, rebuild
npm run build:prod

# Restart
pm2 restart admin
```

### If MongoDB connection issues:

```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB if needed
sudo systemctl restart mongod

# Check server env.production has correct MONGODB_URL
cat ~/ur-admin/server/env.production | grep MONGODB_URL
```

---

## Changes Made

### Files Modified:
1. `server/routes/adminRoutes.js`
   - Added `import logger from '../utils/logger.js'`
   - Replaced 6 instances of `console.error` with `logger.error`
   - This fixes the 500 error when creating/updating subadmins

### Root Cause:
The `logger` utility was being used in error handlers but wasn't imported, causing a `ReferenceError: logger is not defined` which resulted in 500 errors.

---

## Post-Deployment Verification

```bash
# 1. Check all services are running
pm2 status

# 2. Check there are no errors in logs
pm2 logs --lines 50 --nostream

# 3. Test API endpoints
curl -X GET https://admin.urbanesta.in/api/health

# 4. Check frontend is accessible
curl -I https://admin.urbanesta.in
curl -I https://admin.urbanesta.in/logs
```

---

## If Issues Persist

Share the output of these commands:

```bash
# Server logs
pm2 logs server --lines 100 --nostream

# Admin panel logs
pm2 logs admin --lines 100 --nostream

# Nginx error logs
sudo tail -100 /var/log/nginx/urbanesta-admin-error.log

# Check environment
cat ~/ur-admin/server/env.production
```

