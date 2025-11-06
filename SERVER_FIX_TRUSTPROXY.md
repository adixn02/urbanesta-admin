# Fix: express-rate-limit trustProxy Error

## Problem
The server is crashing with:
```
ValidationError: Unexpected configuration option: trustProxy
at file:///home/ubuntu/admin-pl/server/middleware/security.js:84:11
```

This happens because an old version of the code was passing `trustProxy` to `express-rate-limit`, which doesn't support this option. `trustProxy` should only be set on the Express app (which is already done in `index.js`).

## Solution

### Step 1: Ensure Latest Code is on Server
```bash
cd ~/admin-pl
git stash  # Save any local changes
git pull origin main
```

### Step 2: Verify the Fix is in Place
```bash
# Check that security.js doesn't have trustProxy in rateLimit config
grep -n "trustProxy" server/middleware/security.js
# Should return nothing or only show comments
```

### Step 3: Restart PM2 Processes
```bash
# Stop all processes
pm2 stop all

# Delete and restart
pm2 delete all
cd ~/admin-pl/server
npm install  # Ensure dependencies are up to date
pm2 start ecosystem.config.cjs

# Or restart individual processes
pm2 restart urbanesta-admin-api
pm2 restart urbanesta-admin-frontend
```

### Step 4: Verify Server is Running
```bash
# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs urbanesta-admin-api --lines 50

# Test health endpoint
curl http://localhost:3002/health
```

### Step 5: If Still Not Working - Clear Cache and Reinstall
```bash
cd ~/admin-pl/server
rm -rf node_modules package-lock.json
npm install
pm2 restart urbanesta-admin-api
```

## Expected Result
After restarting, you should see in the logs:
```
[INFO] MongoDB connected successfully
[INFO] Server running on port 3002 in production mode
```

And no more `trustProxy` errors.

## Verification
```bash
# Check if server is responding
curl http://localhost:3002/health

# Check PM2 logs
pm2 logs urbanesta-admin-api --lines 20
```

## Notes
- The `trust proxy` setting is configured in `server/index.js` line 46: `app.set('trust proxy', 1);`
- Using `1` instead of `true` means "trust only the first proxy" (nginx), which is more secure
- This prevents the `ERR_ERL_PERMISSIVE_TRUST_PROXY` error from express-rate-limit v8+
- The rate limiter will automatically use the trusted proxy IP when `trust proxy` is set on the Express app

