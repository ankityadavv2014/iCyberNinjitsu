#!/bin/sh
# Run from repo root: ./scripts/start-web.sh
# Starts Next.js dev server on port 3000 (must have run npm install in apps/web)
cd "$(dirname "$0")/../apps/web" && npm run dev
