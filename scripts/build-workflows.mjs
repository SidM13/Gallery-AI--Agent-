import fs from "node:fs";
import path from "node:path";

const out = path.resolve(import.meta.dirname, "..", "workflows");
fs.mkdirSync(out, { recursive: true });

let id = 0;
const node = (name, type, position, parameters = {}, typeVersion = 1) => ({
  parameters,
  id: `gallery-${++id}`,
  name,
  type,
  typeVersion,
  position,
});
const edge = (from, to, fromIndex = 0, toIndex = 0) => ({
  [from]: { main: Array.from({ length: fromIndex + 1 }, (_, i) =>
    i === fromIndex ? [{ node: to, type: "main", index: toIndex }] : []) },
});
const connect = (...edges) => {
  const result = {};
  for (const item of edges) {
    for (const [source, value] of Object.entries(item)) {
      if (!result[source]) result[source] = value;
      else {
        for (const [kind, branches] of Object.entries(value)) {
          result[source][kind] ??= [];
          branches.forEach((branch, index) => {
            result[source][kind][index] ??= [];
            result[source][kind][index].push(...branch);
          });
        }
      }
    }
  }
  return result;
};
const config = (x, y) => node("Configuration", "n8n-nodes-base.set", [x, y], {
  assignments: { assignments: [
    { id: "spreadsheet", name: "spreadsheetId", value: "REPLACE_WITH_GOOGLE_SHEET_ID", type: "string" },
    { id: "owner", name: "ownerEmail", value: "owner@example.com", type: "string" },
    { id: "report-recipient", name: "reportRecipientEmail", value: "victormascot@gmail.com", type: "string" },
    { id: "model", name: "model", value: "={{ $env.OLLAMA_MODEL || 'qwen3:8b' }}", type: "string" },
    { id: "ollama", name: "ollamaUrl", value: "={{ ($env.OLLAMA_BASE_URL || 'http://ollama:11434') + '/api/generate' }}", type: "string" },
  ]},
  options: {},
}, 3.4);
const ollama = (name, x, y, prompt) => node(name, "n8n-nodes-base.httpRequest", [x, y], {
  method: "POST",
  url: "={{ $('Configuration').item.json.ollamaUrl }}",
  sendBody: true,
  specifyBody: "json",
  jsonBody: `={{ { model: $('Configuration').item.json.model, stream: false, think: false, format: 'json', prompt: ${prompt} } }}`,
  options: { timeout: 120000 },
}, 4.2);
const parseResponse = (name, x, y, extra = "") => node(name, "n8n-nodes-base.code", [x, y], {
  jsCode: `const raw = $json.response ?? $json.data?.response;\nif (!raw) throw new Error('Ollama returned no response');\nlet parsed;\ntry { parsed = JSON.parse(raw); } catch { throw new Error('Ollama response was not valid JSON: ' + raw.slice(0, 200)); }\n${extra}\nreturn [{ json: parsed }];`,
}, 2);
const sheet = (name, x, y, sheetName, operation = "appendOrUpdate", columns = {}) =>
  node(name, "n8n-nodes-base.googleSheets", [x, y], {
    operation,
    documentId: { __rl: true, value: "={{ $('Configuration').item.json.spreadsheetId }}", mode: "id" },
    sheetName: { __rl: true, value: sheetName, mode: "name" },
    columns: {
      mappingMode: "defineBelow",
      value: columns,
      matchingColumns: operation === "appendOrUpdate" ? [Object.keys(columns)[0] ?? "Name"] : [],
      schema: [],
      attemptToConvertTypes: false,
      convertFieldsToString: false,
    },
    options: {},
  }, 4.6);
const gmailDraft = (name, x, y, to, subject, message) =>
  node(name, "n8n-nodes-base.gmail", [x, y], {
    resource: "draft",
    operation: "create",
    subject,
    message,
    options: { sendTo: to },
  }, 2.1);
const notify = (name, x, y, subject, message) =>
  node(name, "n8n-nodes-base.gmail", [x, y], {
    sendTo: "={{ $('Configuration').item.json.ownerEmail }}",
    subject,
    message,
    options: {},
  }, 2.1);
const workflow = (name, nodes, connections) => ({
  name,
  nodes,
  pinData: {},
  connections,
  active: false,
  settings: { executionOrder: "v1", timezone: "America/Vancouver", saveManualExecutions: true },
  versionId: `gallery-workflow-${String(id).padStart(3, "0")}`,
  meta: { templateCredsSetupCompleted: false },
  tags: [],
});
const save = (filename, value) =>
  fs.writeFileSync(path.join(out, filename), JSON.stringify(value, null, 2) + "\n");

// Agent 1
{
  const nodes = [
    node("Artist Application Form", "n8n-nodes-base.formTrigger", [-900, 0], {
      formTitle: "Artist Application",
      formDescription: "Apply for gallery representation.",
      formFields: { values: [
        { fieldLabel: "Name", requiredField: true },
        { fieldLabel: "Email", fieldType: "email", requiredField: true },
        { fieldLabel: "Style" },
        { fieldLabel: "Location" },
        { fieldLabel: "Portfolio", fieldType: "url" },
        { fieldLabel: "Bio", fieldType: "textarea" },
        { fieldLabel: "Artist Statement", fieldType: "textarea" },
      ]},
      options: {},
    }, 2.2),
    config(-680, 0),
    node("Normalize Application", "n8n-nodes-base.set", [-460, 0], {
      assignments: { assignments: [
        { id: "a1", name: "name", value: "={{ $('Artist Application Form').item.json.Name }}", type: "string" },
        { id: "a2", name: "email", value: "={{ $('Artist Application Form').item.json.Email }}", type: "string" },
        { id: "a3", name: "style", value: "={{ $('Artist Application Form').item.json.Style || '' }}", type: "string" },
        { id: "a4", name: "location", value: "={{ $('Artist Application Form').item.json.Location || '' }}", type: "string" },
        { id: "a5", name: "portfolio", value: "={{ $('Artist Application Form').item.json.Portfolio || '' }}", type: "string" },
        { id: "a6", name: "bio", value: "={{ $('Artist Application Form').item.json.Bio || '' }}", type: "string" },
        { id: "a7", name: "statement", value: "={{ $('Artist Application Form').item.json['Artist Statement'] || '' }}", type: "string" },
      ]}, options: {},
    }, 3.4),
    ollama("Summarize Artist", -220, 0,
      "`You are a gallery intake assistant. Return JSON only: {\"summary\":\"exactly three concise sentences\"}. Do not invent facts. Application: ${JSON.stringify($('Normalize Application').item.json)}`"),
    parseResponse("Parse Summary", 20, 0, "if (typeof parsed.summary !== 'string') throw new Error('Missing summary');"),
    sheet("Save Artist", 260, 0, "Artists", "appendOrUpdate", {
      Name: "={{ $('Normalize Application').item.json.name }}",
      Email: "={{ $('Normalize Application').item.json.email }}",
      Style: "={{ $('Normalize Application').item.json.style }}",
      Location: "={{ $('Normalize Application').item.json.location }}",
      Portfolio: "={{ $('Normalize Application').item.json.portfolio }}",
      AI_Summary: "={{ $('Parse Summary').item.json.summary }}",
      Date_Added: "={{ $now.toISO() }}",
    }),
    ollama("Write Welcome Draft", 500, 0,
      "`Write a warm, professional gallery application acknowledgement. It must not imply acceptance or representation. State that the team will review the portfolio and follow up. Return JSON only: {\"subject\":\"...\",\"body\":\"plain text...\"}. Artist: ${JSON.stringify($('Normalize Application').item.json)} Summary: ${$('Parse Summary').item.json.summary}`"),
    parseResponse("Parse Welcome Draft", 740, 0,
      "if (!parsed.subject || !parsed.body) throw new Error('Draft requires subject and body');"),
    gmailDraft("Create Welcome Draft", 980, 0,
      "={{ $('Normalize Application').item.json.email }}", "={{ $json.subject }}", "={{ $json.body }}"),
    notify("Notify Owner", 1220, 0, "New artist application received",
      "={{ `A draft reply for ${$('Normalize Application').item.json.name} is in Gmail Drafts. Review, edit, and send it manually.` }}"),
  ];
  save("01-artist-onboarding.json", workflow("Gallery AI - Agent 1 - Artist Onboarding", nodes,
    connect(...nodes.slice(0, -1).map((n, i) => edge(n.name, nodes[i + 1].name)))));
}

// Agent 2
{
  const nodes = [
    node("Every Monday 9 AM", "n8n-nodes-base.scheduleTrigger", [-1100, 0], {
      rule: { interval: [{ field: "weeks", weeksInterval: 1, triggerAtDay: [1], triggerAtHour: 9 }] },
    }, 1.2),
    config(-900, 0),
    node("Opportunity Feed URLs", "n8n-nodes-base.set", [-700, 0], {
      assignments: { assignments: [
        { id: "f1", name: "urls", type: "array",
          value: "={{ ['REPLACE_WITH_CALLFORENTRY_RSS','REPLACE_WITH_OPENARTFORMS_RSS','REPLACE_WITH_GRANTS_RSS'] }}" },
      ]}, options: {},
    }, 3.4),
    node("One Item Per Feed", "n8n-nodes-base.splitOut", [-500, 0], { fieldToSplitOut: "urls", options: { destinationFieldName: "url" } }, 1),
    node("Read RSS Feed", "n8n-nodes-base.rssFeedRead", [-300, 0], { url: "={{ $json.url }}" }, 1.2),
    node("Limit and Normalize", "n8n-nodes-base.code", [-100, 0], {
      jsCode: "return $input.all().slice(0, 150).map(({json}) => ({json:{title:json.title ?? '',link:json.link ?? '',published:json.isoDate ?? json.pubDate ?? '',summary:(json.contentSnippet ?? json.content ?? '').slice(0,1200)}}));",
    }, 2),
    sheet("Read Artists", 120, 0, "Artists", "read", {}),
    node("Bundle Context", "n8n-nodes-base.code", [340, 0], {
      jsCode: "const opportunities = $('Limit and Normalize').all().map(x => x.json); const artists = $input.all().map(x => x.json); return [{json:{opportunities,artists}}];",
    }, 2),
    ollama("Match Opportunities", 560, 0,
      "`Match only relevant, future-dated opportunities to represented artists. Respect stated geography and medium. Never invent a deadline. Return JSON only: {\"matches\":[{\"title\":\"\",\"link\":\"\",\"deadline\":\"\",\"matchedArtist\":\"\",\"reason\":\"\"}]}. Data: ${JSON.stringify($json)}`"),
    parseResponse("Parse Matches", 780, 0,
      "if (!Array.isArray(parsed.matches)) throw new Error('Missing matches array');"),
    node("One Item Per Match", "n8n-nodes-base.splitOut", [1000, -80], { fieldToSplitOut: "matches", options: {} }, 1),
    sheet("Save Opportunity", 1220, -80, "Opportunities", "appendOrUpdate", {
      Link: "={{ $json.link }}", Title: "={{ $json.title }}", Deadline: "={{ $json.deadline }}",
      Matched_Artist: "={{ $json.matchedArtist }}", Status: "New",
    }),
    node("Prepare Digest", "n8n-nodes-base.code", [1000, 120], {
      jsCode: "const matches = $('Parse Matches').item.json.matches; const lines = matches.length ? matches.map(m => `• ${m.title}\\n  Artist: ${m.matchedArtist}\\n  Deadline: ${m.deadline || 'Not stated'}\\n  ${m.link}\\n  Why: ${m.reason}`).join('\\n\\n') : 'No strong matches this week.'; return [{json:{subject:'Monday Morning Opportunity Digest',body:`Opportunity matches for review\\n\\n${lines}\\n\\nVerify eligibility and deadlines at the original links before forwarding.`}}];",
    }, 2),
    gmailDraft("Create Digest Draft", 1220, 120,
      "={{ $('Configuration').item.json.ownerEmail }}", "={{ $json.subject }}", "={{ $json.body }}"),
    notify("Notify Owner", 1440, 120, "Monday opportunity digest ready",
      "The Monday Morning Opportunity Digest is in Gmail Drafts. Review source links and deadlines before forwarding."),
  ];
  save("02-opportunity-finder.json", workflow("Gallery AI - Agent 2 - Opportunity Finder", nodes,
    connect(
      edge(nodes[0].name, nodes[1].name), edge(nodes[1].name, nodes[2].name),
      edge(nodes[2].name, nodes[3].name), edge(nodes[3].name, nodes[4].name),
      edge(nodes[4].name, nodes[5].name), edge(nodes[5].name, nodes[6].name),
      edge(nodes[6].name, nodes[7].name), edge(nodes[7].name, nodes[8].name),
      edge(nodes[8].name, nodes[9].name), edge(nodes[9].name, nodes[10].name),
      edge(nodes[9].name, nodes[12].name), edge(nodes[10].name, nodes[11].name),
      edge(nodes[12].name, nodes[13].name), edge(nodes[13].name, nodes[14].name)
    )));
}

// Agent 3
{
  const nodes = [
    node("Collector Inquiry Label", "n8n-nodes-base.gmailTrigger", [-1000, 0], {
      pollTimes: { item: [{ mode: "everyMinute" }] },
      simple: false,
      filters: { labelIds: ["REPLACE_WITH_COLLECTOR_INQUIRY_LABEL_ID"], readStatus: "unread" },
      options: {},
    }, 1.2),
    config(-780, 0),
    node("Normalize Inquiry", "n8n-nodes-base.set", [-560, 0], {
      assignments: { assignments: [
        { id: "i1", name: "sender", value: "={{ $('Collector Inquiry Label').item.json.from?.value?.[0]?.address || $('Collector Inquiry Label').item.json.From || '' }}", type: "string" },
        { id: "i2", name: "subject", value: "={{ $('Collector Inquiry Label').item.json.subject || $('Collector Inquiry Label').item.json.Subject || '' }}", type: "string" },
        { id: "i3", name: "body", value: "={{ $('Collector Inquiry Label').item.json.textPlain || $('Collector Inquiry Label').item.json.snippet || '' }}", type: "string" },
      ]}, options: {},
    }, 3.4),
    ollama("Extract Collector Profile", -340, 0,
      "`Extract only facts explicitly present in this inquiry. Return JSON only: {\"name\":\"\",\"budget\":\"\",\"preferredStyle\":\"\",\"interests\":\"\"}. Use empty strings for unknowns. Inquiry: ${JSON.stringify($('Normalize Inquiry').item.json)}`"),
    parseResponse("Parse Collector Profile", -120, 0),
    sheet("Save Collector", 100, 0, "Collectors", "appendOrUpdate", {
      Email: "={{ $('Normalize Inquiry').item.json.sender }}",
      Name: "={{ $('Parse Collector Profile').item.json.name }}",
      Style_Interest: "={{ $('Parse Collector Profile').item.json.preferredStyle }}",
      Budget: "={{ $('Parse Collector Profile').item.json.budget }}",
      Date_Added: "={{ $now.toISO() }}",
    }),
    sheet("Read Artworks", 320, 0, "Artworks", "read", {}),
    node("Available Inventory Only", "n8n-nodes-base.code", [540, 0], {
      jsCode: "const inventory = $input.all().map(x=>x.json).filter(x => String(x.Status).toLowerCase() === 'available'); return [{json:{profile:$('Parse Collector Profile').item.json,inquiry:$('Normalize Inquiry').item.json,inventory}}];",
    }, 2),
    ollama("Recommend and Draft", 760, 0,
      "`Recommend at most 3 artworks from inventory only. Do not alter titles, artists, prices, or availability. Do not claim fit when budget is unknown. Write a warm reply and invite a viewing. Return JSON only: {\"subject\":\"\",\"body\":\"\",\"artworkTitles\":[]}. Context: ${JSON.stringify($json)}`"),
    parseResponse("Parse Collector Draft", 980, 0,
      "if (!parsed.subject || !parsed.body || !Array.isArray(parsed.artworkTitles)) throw new Error('Invalid collector draft');"),
    gmailDraft("Create Collector Draft", 1200, 0,
      "={{ $('Normalize Inquiry').item.json.sender }}", "={{ `Re: ${$('Normalize Inquiry').item.json.subject}` }}", "={{ $json.body }}"),
    notify("Notify Owner", 1420, 0, "Collector draft reply ready",
      "={{ `A draft reply to ${$('Normalize Inquiry').item.json.sender} is in Gmail Drafts. Confirm prices and availability before sending.` }}"),
  ];
  save("03-collector-assistant.json", workflow("Gallery AI - Agent 3 - Collector Assistant", nodes,
    connect(...nodes.slice(0, -1).map((n, i) => edge(n.name, nodes[i + 1].name)))));
}

// Agent 4
{
  const nodes = [
    node("Every Friday 4 PM", "n8n-nodes-base.scheduleTrigger", [-1200, 0], {
      rule: { interval: [{ field: "weeks", weeksInterval: 1, triggerAtDay: [5], triggerAtHour: 16 }] },
    }, 1.2),
    config(-1000, 0),
    ...["Artists", "Collectors", "Artworks", "Sales", "Opportunities"].map((name, index) =>
      sheet(`Read ${name}`, -780 + index * 210, -160, name, "read", {})),
    node("Upcoming Calendar Events", "n8n-nodes-base.googleCalendar", [-360, 120], {
      operation: "getAll",
      calendar: { __rl: true, value: "primary", mode: "list", cachedResultName: "Primary" },
      timeMin: "={{ $now.toISO() }}",
      timeMax: "={{ $now.plus({days: 30}).toISO() }}",
      options: { singleEvents: true, orderBy: "startTime" },
    }, 1.3),
    node("Bundle Weekly Data", "n8n-nodes-base.code", [-120, 120], {
      jsCode: "const rows = n => $(n).all().map(x=>x.json); return [{json:{periodEnding:$now.toISODate(),artists:rows('Read Artists'),collectors:rows('Read Collectors'),artworks:rows('Read Artworks'),sales:rows('Read Sales'),opportunities:rows('Read Opportunities'),calendar:$input.all().map(x=>x.json)}}];",
    }, 2),
    ollama("Write Weekly Report", 120, 120,
      "`Act as a careful gallery director. Summarize only the supplied data. Distinguish totals from this-week activity when dates allow it. Highlight new additions, sales, upcoming deadlines/events, inventory risks, and exactly 3 practical actions. Return JSON only: {\"subject\":\"\",\"body\":\"plain text\"}. Data: ${JSON.stringify($json)}`"),
    parseResponse("Parse Weekly Report", 360, 120,
      "if (!parsed.subject || !parsed.body) throw new Error('Invalid weekly report');"),
    gmailDraft("Create Weekly Report Draft", 600, 120,
      "={{ [$('Configuration').item.json.ownerEmail, $('Configuration').item.json.reportRecipientEmail].filter(Boolean).join(',') }}",
      "={{ `Weekly Gallery Report - ${$now.toISODate()} - Ready for Review` }}",
      "={{ $json.body }}"),
  ];
  const connections = connect(
    edge(nodes[0].name, nodes[1].name),
    edge(nodes[1].name, "Read Artists"),
    edge("Read Artists", "Read Collectors"),
    edge("Read Collectors", "Read Artworks"),
    edge("Read Artworks", "Read Sales"),
    edge("Read Sales", "Read Opportunities"),
    edge("Read Opportunities", "Upcoming Calendar Events"),
    edge("Upcoming Calendar Events", "Bundle Weekly Data"),
    edge("Bundle Weekly Data", "Write Weekly Report"),
    edge("Write Weekly Report", "Parse Weekly Report"),
    edge("Parse Weekly Report", "Create Weekly Report Draft")
  );
  save("04-weekly-gallery-report.json", workflow("Gallery AI - Agent 4 - Weekly Gallery Report", nodes, connections));
}

console.log(`Built four workflows in ${out}`);
