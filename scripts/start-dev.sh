#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "============================================================"
echo " 🛡️  Iniciando Entorno Completo CivicGuard PWA (UTM)"
echo "============================================================"
echo " -> Back-End Laravel API (MySQL): http://127.0.0.1:8000"
echo " -> Front-End Angular PWA:        http://localhost:4200"
echo "============================================================"

cleanup() {
  echo ""
  echo "Deteniendo servidores de CivicGuard PWA..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "$ROOT_DIR/backend"
php artisan serve --host=127.0.0.1 --port=8000 &
BACKEND_PID=$!

cd "$ROOT_DIR/frontend"
npm start -- --host 0.0.0.0 --port 4200 &
FRONTEND_PID=$!

wait
