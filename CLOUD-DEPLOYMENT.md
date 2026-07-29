# Gallery AI cloud deployment

The production architecture runs entirely on Railway:

- `gallery-ai-n8n` — public HTTPS n8n editor and webhook service
- `Postgres` — persistent n8n database
- `gallery-ai-ollama` — private Ollama/Qwen service
- Ollama volume — persistent `qwen3:4b` model storage

The cloud n8n image imports the four workflows on the first launch and rewrites
their Ollama URL to Railway's private service network. The agents remain
inactive until credentials are connected and manual tests succeed.

## After deployment

1. Open the public n8n URL and create the owner account.
2. Add Google Sheets, Gmail, and Calendar OAuth credentials.
3. Select those credentials in the relevant Google nodes.
4. Confirm the spreadsheet ID and owner email in each Configuration node.
5. Run every workflow manually using labeled demo data.
6. Activate triggers and schedules only after the manual tests pass.

## Security

- Ollama has no public domain and is reachable only from the Railway project.
- The n8n encryption key is stored as a Railway service variable.
- Google OAuth secrets stay in n8n's encrypted credential store.
- Workflows create Gmail drafts for human review.
- Never commit `.env`, OAuth secrets, database URLs, or Railway tokens.

## Cost note

Cloud Qwen needs substantially more memory than n8n. Check Railway usage and
spending limits before leaving the Ollama service running continuously.
