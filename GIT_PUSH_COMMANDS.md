# Git Push Commands - Run These on Your Server

## Step 1: Navigate to your project directory
```bash
cd /var/www/urbanesta
# or
cd ~/urbanesta-admin
```

## Step 2: Check git status
```bash
git status
```

## Step 3: Add all changes
```bash
git add .
```

## Step 4: Check what will be committed
```bash
git status
```

## Step 5: Commit changes
```bash
git commit -m "Production updates: ErrorPopup component, MultipleFilePreview improvements, connectivityPoints fix, controlled inputs fix, server setup guide"
```

## Step 6: Push to GitHub
```bash
# If your branch is 'main'
git push origin main

# OR if your branch is 'master'
git push origin master

# OR if you need to set upstream
git push -u origin main
# or
git push -u origin master
```

## If you need to check/configure remote:
```bash
# Check current remote
git remote -v

# If remote is not set, add it:
git remote add origin https://github.com/yourusername/your-repo.git

# Or if using SSH:
git remote add origin git@github.com:yourusername/your-repo.git
```

## If you get authentication errors:
```bash
# For HTTPS, you'll need a Personal Access Token
# Generate one at: https://github.com/settings/tokens

# For SSH, set up SSH keys:
ssh-keygen -t ed25519 -C "your_email@example.com"
# Then add the public key to GitHub: https://github.com/settings/keys
cat ~/.ssh/id_ed25519.pub
```

## Quick one-liner (if everything is set up):
```bash
git add . && git commit -m "Production updates" && git push origin main
```

