# Engineer runbook

## 1. Prerequisites

- Docker Engine with Compose
- A Google account or Workspace account with Gmail, Sheets, and Calendar
- A Google Cloud project with Gmail API, Sheets API, and Calendar API enabled
- OAuth consent screen and OAuth client configured for n8n's callback URL
- Recommended: 12 GB RAM for the stack; adjust the model for the host

Do not expose port 5678 directly to the public internet. For remote access, use
TLS behind a reverse proxy or a private network/VPN.

## 2. Start the local services

```bash
cp .env.example .env
# Edit .env and replace all defaults.
docker compose up -d
docker compose ps
docker compose logs -f ollama-init
```

Confirm Ollama from inside its container:

```bash
docker compose exec ollama ollama list
```

## 3. Create the data hub

Create one spreadsheet named `Gallery AI Database`. Add these exact tabs:

- `Artists`
- `Collectors`
- `Artworks`
- `Opportunities`
- `Sales`

Copy the columns for each tab from `config/sheets-schema.csv` exactly. Freeze
row 1, add dropdown validation for statuses, and restrict spreadsheet access to
the owner and service operators.

Recommended status values:

- Artworks: `Available`, `Reserved`, `Sold`
- Opportunities: `New`, `Reviewed`, `Shared`, `Applied`, `Closed`

Seed at least three test artworks. Use fictional contacts during testing.

## 4. Configure Google OAuth in n8n

Create credentials in n8n for:

- Google Sheets OAuth2
- Gmail OAuth2
- Google Calendar OAuth2

Use the least privilege that still supports the nodes. The installed workflows
reference the connected `Google Sheets account`, `Gmail account`, and
`Google Calendar account` credentials.

## 5. Import and configure workflows

Import each JSON file. The configuration already contains the live Sheet ID,
owner email, `qwen3:4b`, and local Ollama URL. Keep each workflow unpublished
until its test checklist passes.

Agent-specific configuration:

### Agent 1 — Artist Onboarding

- Test the n8n form URL with a fictional artist.
- If using Google Forms, follow `config/google-form-fields.md`.
- Confirm one row is written to `Artists`.
- Confirm the artist email appears in Drafts and was **not** sent.
- Confirm only the owner notification was sent.
- Confirm the draft does not imply acceptance.

### Agent 2 — Opportunity Finder

- Execute each configured feed manually; remove feeds that later redirect to
  HTML or reject the request.
- Confirm links and deadlines against source pages.
- Confirm `Matched_Artist` exactly matches an artist name in the Sheet.
- Confirm rerunning does not create duplicate links. `Link` is the matching key.
- Only then activate the Monday schedule.

### Agent 3 — Collector Assistant

- Create the Gmail label `Collector Inquiry`.
- In the Gmail Trigger, select the label in the UI; do not type its display name
  into the label-ID field.
- Send a fictional inquiry from a test address and apply the label.
- Confirm only `Available` inventory appears in the draft.
- Confirm artwork title, artist, and price exactly match the Sheet.
- Confirm the response stays in Drafts.
- Decide operationally whether processed messages should be marked read or moved
  to a `Collector Inquiry/Processed` label. Add that step before production to
  avoid reprocessing if the trigger configuration changes.

### Agent 4 — Weekly Gallery Report

- Select the intended Google Calendar, or leave `primary` if correct.
- Populate test dates spanning past and future records.
- Confirm the report distinguishes weekly changes from all-time totals.
- Confirm there are exactly three recommended actions.
- Confirm the report remains a draft.

## 6. Activate safely

Activate in this order, leaving at least one business day between agents:

1. Artist Onboarding
2. Weekly Gallery Report
3. Collector Assistant
4. Opportunity Finder

For the first two weeks, review n8n Executions daily. Keep execution data long
enough to debug, but define a retention policy because inquiry text may contain
personal data.

## 7. Recovery and rollback

- To stop one agent, deactivate only that workflow.
- To stop everything: `docker compose stop n8n`.
- Do not run `docker compose down -v` unless permanent deletion of n8n and
  Ollama volumes is explicitly intended.
- Export workflows after every production change.
- Back up the n8n volume, `.env` (securely), and the Google Sheet according to
  the gallery's retention policy.

## 8. Validation

Regenerate and validate workflow definitions:

```bash
node scripts/build-workflows.mjs
node scripts/validate-workflows.mjs
```

The validator checks JSON parsing, node existence, connection targets, and the
presence of exactly four workflow files. Final node-level validation happens
inside the deployed n8n version after credentials are selected.
