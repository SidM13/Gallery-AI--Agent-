#!/bin/sh
set -eu

export_file=$(mktemp)
if [ "${FORCE_GALLERY_IMPORT:-false}" = "true" ] \
  || { n8n export:workflow --all --output="$export_file" >/dev/null 2>&1 \
    && grep -Eq '^[[:space:]]*\[[[:space:]]*\][[:space:]]*$' "$export_file"; }; then
  echo "Importing Gallery AI cloud workflows"
  for workflow in /opt/gallery-ai/cloud-workflows/*.json; do
    n8n import:workflow --input="$workflow"
  done
fi
rm -f "$export_file"

if [ -n "${GALLERY_CREDENTIALS_B64:-}" ]; then
  credentials_file=$(mktemp)
  printf '%s' "$GALLERY_CREDENTIALS_B64" | base64 -d > "$credentials_file"
  echo "Importing encrypted Gallery AI credentials"
  n8n import:credentials --input="$credentials_file"
  rm -f "$credentials_file"
fi

exec n8n start
