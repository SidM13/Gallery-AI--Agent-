#!/usr/bin/env sh
set -eu

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

failed=0

check() {
  label=$1
  shift
  if "$@" >/dev/null 2>&1; then
    printf 'OK   %s\n' "$label"
  else
    printf 'FAIL %s\n' "$label"
    failed=1
  fi
}

check "Docker" docker info
check "Compose configuration" docker compose config
check "n8n container" docker compose ps --status running n8n
check "Ollama container" docker compose ps --status running ollama
check "n8n health endpoint" curl -fsS "http://localhost:${N8N_PORT:-5678}/healthz"
check "Qwen model" docker compose exec -T ollama ollama show "${OLLAMA_MODEL:-qwen3:4b}"

if [ "$failed" -ne 0 ]; then
  echo
  echo "One or more checks failed. Run 'make up', wait for the model download, then retry."
  exit 1
fi

echo
echo "Local Gallery AI services are ready."
