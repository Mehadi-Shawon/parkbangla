# Deployment Guide — Hostinger VPS

## Prerequisites
- Hostinger VPS (Ubuntu 22.04 LTS recommended)
- Domain name pointed to your VPS IP
- SSH access to your server

---

## Step 1: Server Setup

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 2: MySQL Setup

```bash
sudo mysql -u root -p

CREATE DATABASE parkeasy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'parkeasy_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON parkeasy.* TO 'parkeasy_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema and seed
mysql -u parkeasy_user -p parkeasy < /var/www/parkeasy/database/schema.sql
mysql -u parkeasy_user -p parkeasy < /var/www/parkeasy/database/seed.sql
```

---

## Step 3: Deploy Application

```bash
# Create app directory
sudo mkdir -p /var/www/parkeasy
sudo chown $USER:$USER /var/www/parkeasy

# Upload your project files (from your local machine):
scp -r ./ParkEasy/* user@YOUR_VPS_IP:/var/www/parkeasy/

# On VPS — configure backend
cd /var/www/parkeasy/server
cp .env.example .env
nano .env
# Fill in DB_PASSWORD, JWT_SECRET, CLIENT_URL=https://yourdomain.com

npm install --production

# Build frontend
cd /var/www/parkeasy/client
cp .env.example .env
nano .env
# Set VITE_API_URL=https://yourdomain.com/api
# Set VITE_GOOGLE_MAPS_API_KEY=your_key

npm install
npm run build
# Built files are in /var/www/parkeasy/client/dist
```

---

## Step 4: Configure PM2

```bash
cd /var/www/parkeasy/server

# Start backend
pm2 start server.js --name parkeasy-api --env production

# Save PM2 process list
pm2 save

# Auto-start on reboot
pm2 startup
# Run the command PM2 outputs
```

---

## Step 5: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/parkeasy
```

Paste the following config (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (static build)
    root /var/www/parkeasy/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/parkeasy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 6: SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Follow prompts; Certbot auto-renews via cron
```

---

## Step 7: Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Maintenance Commands

```bash
# View app logs
pm2 logs parkeasy-api

# Restart app
pm2 restart parkeasy-api

# Deploy updates
cd /var/www/parkeasy/server && git pull && npm install && pm2 restart parkeasy-api
cd /var/www/parkeasy/client && git pull && npm install && npm run build

# MySQL backup
mysqldump -u parkeasy_user -p parkeasy > backup_$(date +%Y%m%d).sql
```
