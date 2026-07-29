#!/usr/bin/env sh
set -eu

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

if ! docker compose ps --status running --services | grep -qx n8n; then
  echo "n8n is not running. Start it with: make up" >&2
  exit 1
fi

for workflow in workflows/*.json; do
  name=$(basename "$workflow")
  echo "Importing $name"
  docker compose exec -T n8n n8n import:workflow --input="/workflows/$name"
done

echo
echo "All four Gallery AI workflows are imported."
echo "Open http://localhost:${N8N_PORT:-5678} to connect Google credentials and test them."
