# Run all Gallery AI agents locally

This setup runs n8n and Qwen/Ollama locally with Docker. Google Sheets,
Calendar, and Gmail still require your own Google OAuth credentials in n8n.

## Requirements

- Docker Desktop
- Node.js 18 or newer (only for workflow validation)
- A Google Cloud project with Sheets, Calendar, and Gmail APIs enabled

## One-time setup

```bash
git clone https://github.com/SidM13/Gallery-AI--Agent-.git
cd Gallery-AI--Agent-
cp .env.example .env
```

Replace the example encryption key, username, and password in `.env`. Then run:

```bash
make validate
make up
make import
make doctor
```

The first startup downloads `qwen3:4b`, so it can take several minutes.

Open [http://localhost:5678](http://localhost:5678), create the n8n owner
account, and add Google Sheets, Gmail, and Calendar OAuth credentials. Open
each workflow and select those credentials in its Google nodes.

## Agents

1. **Artist Onboarding** — accepts an artist application, summarizes it with
   local Qwen, updates Sheets, and creates email drafts.
2. **Opportunity Finder** — reads opportunity feeds, uses Qwen to match them
   to artists, and records suitable opportunities.
3. **Collector Assistant** — reads collector inquiries and available artwork,
   then creates a recommendation draft.
4. **Weekly Gallery Report** — combines Sheets and Calendar data, uses Qwen,
   and creates a weekly Gmail report draft.

## Test before activation

Keep every workflow inactive while connecting credentials. Run each workflow
manually with clearly labeled demo data and verify its Sheets and Gmail output.
Only activate schedules and triggers after the manual run succeeds.

## Daily commands

```bash
make up       # start local services
make doctor   # verify n8n, Ollama, and Qwen
make logs     # follow service logs
make down     # stop services without deleting data
```

Persistent Docker volumes retain n8n settings and the downloaded model.
