#!/bin/bash
# ============================================================
# Glodac Pharma OMS — VPS Production Setup Script
# Run once on VPS as root or with sudo
# Usage: bash setup-vps.sh
# ============================================================

set -e

APP_DIR="/var/www/pharma-portal"
SERVER_DIR="$APP_DIR/server"
BACKUP_DIR="/var/backups/pharmaops"
NGINX_CONF="/etc/nginx/sites-available/pharma"
DB_NAME="pharmaops"
DB_USER="postgres"
API_PORT="3002"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Glodac Pharma OMS — Production Setup               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Create .env if it doesn't exist ────────────────────────────────────────
if [ ! -f "$SERVER_DIR/.env" ]; then
  echo "📝 Creating $SERVER_DIR/.env ..."
  cat > "$SERVER_DIR/.env" << 'ENVEOF'
# ── Database ──────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pharmaops
DB_USER=postgres
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# ── Server ────────────────────────────────────────────────
PORT=3002
NODE_ENV=production

# ── JWT ───────────────────────────────────────────────────
JWT_SECRET=CHANGE_ME_RANDOM_64_CHAR_STRING
JWT_EXPIRES_IN=7d

# ── Frontend URL (for CORS) ───────────────────────────────
FRONTEND_URL=https://pulss.co.in

# ── Gmail (for quote emails) ──────────────────────────────
GMAIL_USER=your@gmail.com
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
ENVEOF
  echo "⚠️  IMPORTANT: Edit $SERVER_DIR/.env and set DB_PASSWORD and JWT_SECRET before continuing!"
  echo "   nano $SERVER_DIR/.env"
  echo ""
  read -rp "Press ENTER after editing .env to continue, or Ctrl+C to abort..."
fi

# ── 2. Create PostgreSQL database ────────────────────────────────────────────
echo "🗄️  Setting up PostgreSQL database..."
DB_EXISTS=$(sudo -u "$DB_USER" psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")
if [ "$DB_EXISTS" = "1" ]; then
  echo "   Database '$DB_NAME' already exists — skipping creation."
else
  echo "   Creating database '$DB_NAME'..."
  sudo -u "$DB_USER" psql -c "CREATE DATABASE $DB_NAME;"
  echo "   ✅ Database created."
fi

# ── 3. Run schema (idempotent — uses IF NOT EXISTS / ON CONFLICT) ─────────────
echo "📋 Running schema.sql..."
# Strip the CREATE DATABASE and \c lines (already connected)
grep -v "^CREATE DATABASE\|^\\\\c " "$APP_DIR/server/database/schema.sql" | \
  sudo -u "$DB_USER" psql -d "$DB_NAME" 2>&1 | grep -v "^NOTICE\|already exists" || true
echo "   ✅ Schema applied."

# ── 4. Update nginx to proxy /api/ to backend ────────────────────────────────
echo "🌐 Updating nginx config..."
NGINX_FILE=$(find /etc/nginx/sites-available/ -name "*.conf" -o -name "default" -o -name "pharma" 2>/dev/null | head -1)
[ -z "$NGINX_FILE" ] && NGINX_FILE="/etc/nginx/sites-available/default"

# Check if /api/ proxy already configured
if grep -q "proxy_pass.*$API_PORT" "$NGINX_FILE" 2>/dev/null; then
  echo "   nginx /api/ proxy already configured — skipping."
else
  echo "   Adding /api/ proxy block to $NGINX_FILE ..."
  # Find the server block for pulss.co.in or the first server block
  # We'll add the location block before the closing }
  # Create a patch file
  cat > /tmp/nginx_api_patch.conf << NGINXEOF

    # Glodac Pharma OMS — API proxy
    location /api/ {
        proxy_pass         http://127.0.0.1:$API_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }
NGINXEOF

  # Insert before the last } in the file
  python3 - << 'PYEOF'
import sys
with open('/tmp/nginx_api_patch.conf') as f:
    patch = f.read()

nginx_file = None
import subprocess
result = subprocess.run(['find', '/etc/nginx/sites-available/', '-type', 'f'], capture_output=True, text=True)
files = result.stdout.strip().split('\n')
if files:
    nginx_file = files[0]

if not nginx_file:
    print("Could not find nginx config file")
    sys.exit(0)

with open(nginx_file, 'r') as f:
    content = f.read()

if f'proxy_pass.*3002' in content or '3002' in content:
    print("API proxy already in config")
    sys.exit(0)

# Insert patch before last closing brace
last_brace = content.rfind('}')
if last_brace == -1:
    print("Could not find closing brace in nginx config")
    sys.exit(0)

new_content = content[:last_brace] + patch + '\n' + content[last_brace:]
with open(nginx_file + '.bak', 'w') as f:
    f.write(content)
with open(nginx_file, 'w') as f:
    f.write(new_content)
print(f"✅ Patched {nginx_file}")
PYEOF

  nginx -t && nginx -s reload && echo "   ✅ nginx reloaded." || echo "   ⚠️  nginx config test failed — check $NGINX_FILE manually."
fi

# ── 5. Install node_modules for server if needed ─────────────────────────────
if [ ! -d "$SERVER_DIR/node_modules" ]; then
  echo "📦 Installing server npm packages..."
  cd "$SERVER_DIR" && npm install --production
  echo "   ✅ npm install done."
fi

# ── 6. Restart PM2 ───────────────────────────────────────────────────────────
echo "🔄 Restarting API via PM2..."
if pm2 list | grep -q "pharma-api"; then
  pm2 restart pharma-api
else
  cd "$SERVER_DIR" && pm2 start server.js --name pharma-api
fi
pm2 save
echo "   ✅ API restarted."

# ── 7. Create backup directory & cron ────────────────────────────────────────
echo "💾 Setting up daily PostgreSQL backups..."
mkdir -p "$BACKUP_DIR"
chmod 750 "$BACKUP_DIR"

# Create backup script
cat > /usr/local/bin/pharma-backup.sh << BKEOF
#!/bin/bash
BACKUP_DIR="$BACKUP_DIR"
DB_NAME="$DB_NAME"
DATE=\$(date +%Y%m%d_%H%M)
FILE="\$BACKUP_DIR/pharmaops_\$DATE.sql.gz"

pg_dump -U $DB_USER \$DB_NAME | gzip > "\$FILE"
echo "Backup saved: \$FILE (\$(du -sh \$FILE | cut -f1))"

# Keep only last 30 backups
ls -t "\$BACKUP_DIR"/pharmaops_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm
BKEOF
chmod +x /usr/local/bin/pharma-backup.sh

# Add cron job if not already present
CRON_LINE="0 2 * * * /usr/local/bin/pharma-backup.sh >> /var/log/pharma-backup.log 2>&1"
if crontab -l 2>/dev/null | grep -q "pharma-backup"; then
  echo "   Daily backup cron already set — skipping."
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "   ✅ Daily backup scheduled at 2:00 AM"
fi

# ── 8. Add VITE_API_URL to frontend .env if needed ───────────────────────────
FRONTEND_ENV="$APP_DIR/.env.production"
if [ ! -f "$FRONTEND_ENV" ]; then
  echo "VITE_API_URL=/api" > "$FRONTEND_ENV"
  echo "   ✅ Created $FRONTEND_ENV with VITE_API_URL=/api"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  Setup complete!                                 ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  API health:  curl https://pulss.co.in/api/health   ║"
echo "║  PM2 status:  pm2 status                            ║"
echo "║  DB backup:   pharma-backup.sh                      ║"
echo "║  Deploy:      run update.bat on Windows             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
