# Ubuntu Server Setup Guide for AWS Lightsail
## IP: 3.111.171.206

### Step 1: System Update and Upgrade

```bash
# Update package list
sudo apt update

# Upgrade all packages
sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential curl wget git ufw software-properties-common
```

### Step 2: Install Node.js (v18 or v20 LTS)

```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 globally for process management
sudo npm install -g pm2
```

### Step 3: Install MongoDB

```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package list
sudo apt update

# Install MongoDB
sudo apt install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

### Step 4: Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check Nginx status
sudo systemctl status nginx
```

### Step 5: Configure Firewall (UFW)

```bash
# Allow SSH (important - do this first!)
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'
# Or separately:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow your Node.js app port (if different from 80/443)
sudo ufw allow 3002/tcp

# Enable firewall
sudo ufw enable

# Check firewall status
sudo ufw status
```

### Step 6: Create Application Directory Structure

```bash
# Create directory for your application
sudo mkdir -p /var/www/urbanesta
sudo chown -R $USER:$USER /var/www/urbanesta

# Or if you prefer home directory
mkdir -p ~/urbanesta-admin
cd ~/urbanesta-admin
```

### Step 7: Upload Your Application Code

```bash
# Option 1: Using Git (if your code is in a repository)
cd /var/www/urbanesta
git clone <your-repo-url> .

# Option 2: Using SCP from your local machine (run on your local machine)
# scp -r /path/to/your/project/* ubuntu@3.111.171.206:/var/www/urbanesta/

# Option 3: Using rsync (run on your local machine)
# rsync -avz --exclude 'node_modules' --exclude '.git' /path/to/your/project/ ubuntu@3.111.171.206:/var/www/urbanesta/
```

### Step 8: Install Application Dependencies

```bash
# Navigate to server directory
cd /var/www/urbanesta/server
# or
cd ~/urbanesta-admin/server

# Install dependencies
npm install

# Navigate to admin directory
cd ../admin
npm install
```

### Step 9: Configure Environment Variables

```bash
# Create .env file for server
cd /var/www/urbanesta/server
nano .env
# or
cd ~/urbanesta-admin/server
nano .env

# Add your environment variables:
# MONGODB_URL=mongodb://localhost:27017/urbanesta
# JWT_SECRET=your-secret-key
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret
# AWS_REGION=your-region
# AWS_S3_BUCKET=your-bucket
# CLOUDFRONT_DOMAIN=your-cloudfront-domain
# TWO_FACTOR_API_KEY=your-api-key
# API_KEY=your-api-key
# SESSION_SECRET=your-session-secret
# NEXT_PUBLIC_API_URL=http://3.111.171.206:3002
# NODE_ENV=production
```

### Step 10: Build Next.js Admin Panel

```bash
# Navigate to admin directory
cd /var/www/urbanesta/admin
# or
cd ~/urbanesta-admin/admin

# Build for production
npm run build
```

### Step 11: Configure Nginx for Your Application

```bash
# Create Nginx configuration file
sudo nano /etc/nginx/sites-available/urbanesta
```

Add this configuration:

```nginx
# API Server (Backend) - Port 3002
server {
    listen 80;
    server_name 3.111.171.206 api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for file uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Increase client body size for file uploads
    client_max_body_size 50M;
}

# Admin Panel (Frontend) - Port 3000
server {
    listen 3000;
    server_name 3.111.171.206 admin.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit (Ctrl+X, then Y, then Enter)

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/urbanesta /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 12: Start Application with PM2

```bash
# Navigate to server directory
cd /var/www/urbanesta/server
# or
cd ~/urbanesta-admin/server

# Start server with PM2
pm2 start index.js --name "urbanesta-api"

# Navigate to admin directory
cd ../admin

# Start Next.js admin panel with PM2
pm2 start npm --name "urbanesta-admin" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Run the command that PM2 outputs (it will be something like: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu)
```

### Step 13: Configure MongoDB (Optional - if you need authentication)

```bash
# Access MongoDB shell
mongosh

# Create admin user (inside MongoDB shell)
use admin
db.createUser({
  user: "admin",
  pwd: "your-secure-password",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})

# Exit MongoDB shell
exit

# Edit MongoDB config to enable authentication
sudo nano /etc/mongod.conf

# Add these lines under security:
# security:
#   authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

### Step 14: Setup SSL Certificate with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com -d admin.yourdomain.com

# Certbot will automatically configure Nginx for HTTPS
# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 15: Verify Everything is Running

```bash
# Check PM2 processes
pm2 status

# Check PM2 logs
pm2 logs

# Check Nginx status
sudo systemctl status nginx

# Check MongoDB status
sudo systemctl status mongod

# Check if ports are listening
sudo netstat -tlnp | grep -E ':(80|443|3000|3002|27017)'
```

### Step 16: Useful Maintenance Commands

```bash
# View PM2 logs
pm2 logs urbanesta-api
pm2 logs urbanesta-admin

# Restart applications
pm2 restart urbanesta-api
pm2 restart urbanesta-admin

# Stop applications
pm2 stop urbanesta-api
pm2 stop urbanesta-admin

# Reload Nginx after config changes
sudo nginx -t && sudo systemctl reload nginx

# Restart MongoDB
sudo systemctl restart mongod

# View system resources
htop
# or
top

# Check disk space
df -h

# Check memory usage
free -h
```

### Step 17: Update DNS Records (If you have a domain)

Point your domain's A record to: `3.111.171.206`

For subdomains:
- `api.yourdomain.com` → `3.111.171.206`
- `admin.yourdomain.com` → `3.111.171.206`

### Step 18: Security Hardening (Recommended)

```bash
# Disable root login (edit SSH config)
sudo nano /etc/ssh/sshd_config

# Set: PermitRootLogin no
# Set: PasswordAuthentication no (if using SSH keys)

# Restart SSH
sudo systemctl restart sshd

# Install fail2ban for brute force protection
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Troubleshooting

```bash
# If Nginx fails to start, check logs
sudo tail -f /var/log/nginx/error.log

# If PM2 process crashes, check logs
pm2 logs --err

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Check system logs
sudo journalctl -xe
```

---

## Quick Reference: Your Server Details

- **IP Address**: 3.111.171.206
- **Location**: Mumbai, Zone
- **Server Type**: Ubuntu on AWS Lightsail
- **API URL**: http://3.111.171.206:3002 (or via Nginx on port 80)
- **Admin Panel**: http://3.111.171.206:3000 (or via Nginx)

---

**Note**: Replace `yourdomain.com` with your actual domain name in all configurations. If you don't have a domain, you can access the services directly via IP address.

