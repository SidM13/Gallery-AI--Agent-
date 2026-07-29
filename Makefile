.PHONY: validate up model import doctor logs down

validate:
	node scripts/validate-workflows.mjs

up:
	docker compose up -d --wait --wait-timeout 300 n8n ollama ollama-init

model:
	docker compose run --rm ollama-init

import:
	./scripts/import-all.sh

doctor:
	./scripts/local-doctor.sh

logs:
	docker compose logs -f n8n ollama

down:
	docker compose down
