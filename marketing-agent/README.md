# Marketing agent (n8n)

An n8n agent that markets Retail Profit Check to Malaysian retail shop owners, **with a human approving every post and every reply** in one Google Sheet.

```
Fri 10:00  ┌──────────────────────┐   drafts (needs approval)   ┌──────────────┐
──────────▶│ 1 Content generator  │────────────────────────────▶│              │
           │ LLM, EN + 中文,      │                             │ Google Sheet │
           │ 3 rotating pitches   │                             │  posts       │
           └──────────────────────┘     you set "approved"      │  leads       │
hourly     ┌──────────────────────┐◀────────────────────────────│  config      │
──────────▶│ 2 Publisher          │──▶ Facebook Page + Instagram │              │
           └──────────────────────┘    post IDs logged ────────▶│              │
message in ┌──────────────────────┐   intent + draft reply      │              │
──────────▶│ 3 Lead inbox         │────────────────────────────▶│              │
(WA / FB)  └──────────────────────┘     you set "approved"      │              │
every 20m  ┌──────────────────────┐◀────────────────────────────│              │
──────────▶│ 3b Reply sender      │──▶ reply to that person,     │              │
           └──────────────────────┘    within 24 h only         │              │
Mon 08:00  ┌──────────────────────┐◀────────────────────────────│              │
──────────▶│ 4 Weekly report      │──▶ email / Telegram to you   └──────────────┘
           └──────────────────────┘
```

**Start here:** [SETUP.md](SETUP.md) (beginner guide) → [TEST-PLAN.md](TEST-PLAN.md) → [brand-rules.md](brand-rules.md).

## Safety model

- **Nothing goes out without "approved"** in the sheet, typed by you. Imported workflows start with `DRY_RUN = TRUE` and `USE_FAKE_LLM = TRUE`, so a fresh install posts and sends nothing.
- **Brand rules are enforced in code** at draft time *and* again at send time on the text as it is in the sheet: no "fraud", no "replaces your accountant", no tax advice, no guarantees, no "AI-powered", no audit claims, no emails or other phone numbers, no leftover placeholders. Breaking one makes the row `blocked`, even if approved. RM figures without a demo-data label are flagged for you.
- **Inbound only.** The lead inbox starts only when someone messages you. Replies go only to that person, on the same channel, within 24 hours of their last message. No cold outreach, no bulk or broadcast messages, no templates (Malaysia PDPA; WhatsApp Business and Meta policies). STOP is honoured and the contact's details are deleted after the acknowledgement.
- **No secrets in files.** All credentials in the JSON are `PLACEHOLDER` references; you choose real ones in n8n. The repo contains only fictional test data (`6010000000x`, `@example.com`).
- **Sheet writes are RAW**, so a message such as `=IMPORTXML(...)` is stored as text, never run as a formula.

## Files

| Path | What |
|---|---|
| `workflows/*.json` | **Import these into n8n.** Generated; do not edit by hand |
| `brand-rules.md`, `content-brief.md` | Tone, banned claims and the weekly brief, fed to the LLM (host them as raw links, SETUP step 3) |
| `sheet-template/*.csv` | The three tabs of the Google Sheet: `posts`, `leads`, `config` |
| `fake-data/` | Fictional rows and webhook payloads for testing |
| `SETUP.md`, `TEST-PLAN.md` | Setup guide and test plan |
| `VALIDATION.md` | Latest validator report (generated) |
| `src/lib/*.cjs` | The logic that runs inside the n8n Code nodes (compliance, dates, pitches, posts, leads, replies, report) |
| `src/workflows/*.mjs`, `src/n8n.mjs`, `src/build.mjs` | Workflow definitions and the build that writes `workflows/*.json` |
| `scripts/validate.mjs` | Checks the JSON against n8n's own node descriptions (2.46.6 and 1.123.92) |
| `scripts/runtime-test.mjs` | Runs every workflow in a real n8n with stubbed external services |
| `tests/` | Unit tests (`node --test`) |

## Commands (repo root)

```bash
npm run agent:build      # regenerate workflows/, sheet-template/, fake-data/
```

```bash
npm run agent:test       # unit tests
```

```bash
npm run agent:schema     # once: download n8n node descriptions for the validator
```

```bash
npm run agent:validate   # validate workflows, write VALIDATION.md
```

```bash
N8N_BIN=/path/to/node_modules/.bin/n8n npm run agent:runtime   # run in a real n8n (Node 24+)
```

To change behaviour, edit `src/` (and the tests), run `npm run agent:check`, then re-import the changed workflow JSON in n8n. Re-importing creates a new workflow; copy the sheet ID and credentials over, then delete or deactivate the old one.

Decisions taken while building this are logged in [`../docs/DECISIONS.md`](../docs/DECISIONS.md) (section "Marketing agent").
