#!/bin/bash
# dev-start.sh -- Kill stale dev processes and start fresh
# Usage: ./scripts/dev-start.sh [api|worker|web|all]

set -e

COMPONENT="${1:-all}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

kill_port() {
  local port=$1
  local pids=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "[cleanup] Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

kill_pattern() {
  local pattern=$1
  local pids=$(ps aux | grep "$pattern" | grep -v grep | awk '{print $2}')
  if [ -n "$pids" ]; then
    echo "[cleanup] Killing processes matching '$pattern': $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}

cleanup_all() {
  echo "[cleanup] Stopping all stale Astra dev processes..."
  kill_port 3000  # web
  kill_port 4000  # api
  kill_pattern "dev:worker"
  kill_pattern "dev:api"
  kill_pattern "dev:web"
  kill_pattern "tsx apps/worker"
  kill_pattern "tsx apps/api"
  sleep 1
  echo "[cleanup] All clean."
}

start_api() {
  echo "[start] API server on port 4000..."
  cd "$ROOT_DIR" && npm run dev:api &
}

start_worker() {
  echo "[start] Worker..."
  cd "$ROOT_DIR" && npm run dev:worker &
}

start_web() {
  echo "[start] Web on port 3000..."
  cd "$ROOT_DIR" && npm run dev:web &
}

case "$COMPONENT" in
  api)
    kill_port 4000
    kill_pattern "dev:api"
    kill_pattern "tsx apps/api"
    sleep 1
    start_api
    ;;
  worker)
    kill_pattern "dev:worker"
    kill_pattern "tsx apps/worker"
    sleep 1
    start_worker
    ;;
  web)
    kill_port 3000
    kill_pattern "dev:web"
    sleep 1
    start_web
    ;;
  all)
    cleanup_all
    start_web
    start_api
    start_worker
    echo ""
    echo "[ready] All services starting. Check output above for errors."
    echo "  Web:    http://localhost:3000"
    echo "  API:    http://localhost:4000"
    echo "  Worker: background"
    ;;
  *)
    echo "Usage: $0 [api|worker|web|all]"
    exit 1
    ;;
esac

wait
