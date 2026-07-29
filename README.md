# Gallery AI Automation

A self-hosted, human-in-the-loop starter system for a gallery. Google Sheets is
the shared data hub, four n8n workflows are the agents, Ollama/Qwen 3 is the
local language model, and Gmail Drafts is the owner's review interface.

Project site: https://sidm13.github.io/Gallery-AI--Agent-/

The workflows are deliberately **inactive on import**. Configure and test each
one before activating it.

## Included

- `docker-compose.yml` — n8n, Ollama, persistent volumes, and model bootstrap
- `workflows/01-artist-onboarding.json`
- `workflows/02-opportunity-finder.json`
- `workflows/03-collector-assistant.json`
- `workflows/04-weekly-gallery-report.json`
- `config/sheets-schema.csv` — exact spreadsheet tabs and columns
- `config/google-form-fields.md` — form field contract and Google Forms option
- `OWNER-MANUAL.md` — non-technical operating guide
- `ENGINEER-RUNBOOK.md` — deployment, credential, testing, and rollback steps
- `scripts/build-workflows.mjs` — reproducibly generates workflow JSON
- `scripts/validate-workflows.mjs` — checks workflow structure and connections

## Quick start

1. Copy `.env.example` to `.env` and replace every secret/default.
2. Run `docker compose up -d`.
3. Open `http://localhost:5678` and create the n8n owner account.
4. Create the “Gallery AI Database” spreadsheet from `config/sheets-schema.csv`.
5. In n8n, create OAuth2 credentials for Google Sheets, Gmail, and Calendar.
6. Import all four JSON files from `workflows/`.
7. Follow `ENGINEER-RUNBOOK.md` to configure, test, and activate one agent at a
   time.

## Safety properties

- Artist, collector, digest, and report content is created as a Gmail draft.
- Only short owner notifications are sent automatically.
- All imported workflows start inactive.
- Qwen is prompted to return JSON and not invent missing facts.
- Collector recommendations are filtered to `Status = Available`.
- Opportunity digests tell the owner to verify eligibility and deadlines at the
  source.
- Credentials are never included in this package.

## Practical limitations

- RSS URLs change. Agent 2 is configured with three feeds that were reachable
  during setup; verify eligibility and deadlines at the original source.
- Agent 3 is configured for the Gmail label `Collector Inquiry`.
- Google Forms has no native n8n trigger in this template. Agent 1 uses an n8n
  Form Trigger. To keep Google Forms, link it to a response Sheet and replace
  only the trigger with a Google Sheets Trigger.
- Local Qwen output quality depends on model size and hardware. `qwen3:4b` is
  installed, configured, and passed a local JSON inference test on this Mac.
- The workflows were imported into a local n8n 2.32.6 instance and connected
  to the configured Google Sheet, Gmail, and Calendar credentials.
