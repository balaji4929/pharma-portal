#!/bin/bash
# ============================================================
#  PharmaOps Portal — Pulss VPS Deploy Script
#  Run this in hPanel terminal: bash deploy.sh
#  VPS: 187.127.169.23  |  URL: pulss.co.in/operations
# ============================================================
set -e

APP_DIR="/var/www/pharma-portal"
REPO="https://github.com/balaji4929/pharma-portal.git"
PORT=3002   # backend port (frontend is served as static files)

echo "=== [1/6] Clone / pull repo ==="
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull origin main
else
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "=== [2/6] Install frontend deps & build ==="
npm install
npm run build   # outputs to dist/ with base=/operations/

echo "=== [3/6] Install backend deps ==="
cd "$APP_DIR/server"
npm install

echo "=== [4/6] Create .env if missing ==="
if [ ! -f "$APP_DIR/server/.env" ]; then
cat > "$APP_DIR/server/.env" <<'EOF'
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pharmaops
DB_USER=pharmaops_user
DB_PASSWORD=CHANGE_ME
JWT_SECRET=pharmaops_jwt_secret_change_me
FRONTEND_URL=https://pulss.co.in
EOF
echo ">>> IMPORTANT: edit /var/www/pharma-portal/server/.env with real DB credentials"
fi

echo "=== [5/6] Start backend with PM2 ==="
cd "$APP_DIR/server"
pm2 delete pharma-api 2>/dev/null || true
pm2 start server.js --name pharma-api --env production
pm2 save

echo "=== [6/6] Add nginx location block ==="
NGINX_CONF="/etc/nginx/sites-available/pulss"
# Check if /operations is already configured
if grep -q "operations" "$NGINX_CONF" 2>/dev/null; then
  echo ">>> nginx /operations already configured, skipping"
else
  # Find the closing brace of the server block and insert before it
  BLOCK='
    # ---- PharmaOps Portal (/operations) ----
    location /operations/api/ {
        proxy_pass http://127.0.0.1:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /operations/ {
        alias /var/www/pharma-portal/dist/;
        try_files $uri $uri/ /operations/index.html;
        add_header Cache-Control "no-cache";
    }
    # ---- end PharmaOps Portal ----'

  # Append to existing nginx site config
  if [ -f "$NGINX_CONF" ]; then
    sed -i "s|^}$|$BLOCK\n}|" "$NGINX_CONF"
  else
    # Try default location
    for f in /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf; do
      if [ -f "$f" ]; then
        sed -i "s|^}$|$BLOCK\n}|" "$f"
        break
      fi
    done
  fi
fi

nginx -t && systemctl reload nginx

echo ""
echo "✅ Deployed! Visit: https://pulss.co.in/operations"
echo ""
echo "If you see DB errors, update: /var/www/pharma-portal/server/.env"
echo "Then run: pm2 restart pharma-api"
