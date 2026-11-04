# Marketing kit: Retail Profit Check

Everything needed to market the **RM300 accountant-checked pilot** to retail shop owners in Penang without customer interviews, run by an AI marketing agent plus a human who replies on WhatsApp.

**Success = booked demos and paid RM300 pilots.** Nothing else counts.

> **Start with [`BRIEF.md`](BRIEF.md).** It lists the facts, the demo figures you may quote (always labelled "demo data"), the claims we never make, and channel rules. Run `npm run marketing:check` after editing any copy.

| Folder | What | Status |
|---|---|---|
| [`landing/`](landing/) | Static landing page, EN + 中文, three hero variants (`?v=a/b/c`), WhatsApp + Google Form lead capture, no trackers | Part 1 |
| [`scripts/`](scripts/) | Re-capture screenshots, record the demo videos, check copy | Parts 1–2 |

## Landing page (`landing/`)

Open `marketing/landing/index.html` in a browser (no build, no server). Not deployed.

| URL parameter | Values | Effect |
|---|---|---|
| `v` | `a` (default), `b`, `c` | Hero for pitch **A** real profit by product, **B** cash stuck in stock, **C** supplier invoice mistakes |
| `lang` | `en`, `zh` | Language (default: the browser's language; the EN/中文 toggle switches it) |
| `src` | `fbad`, `igad`, `fb`, `ig`, `xhs`, `wa`, … (letters, digits, `-`, `_`; max 20) | Goes into the WhatsApp message as the ref code, e.g. `ref B-fbad`. Default `web`. |

Example ad links: `…/index.html?v=b&lang=zh&src=fbad`, `…/index.html?v=c&lang=en&src=igad`.

How it works: both languages and all three heroes are in the HTML; `main.js` only shows the right one, swaps screenshots to the chosen language, and builds the `wa.me` links. Without JavaScript the page shows pitch A in English. The Content-Security-Policy allows nothing outside the folder, so no tracker can load by accident. Screenshots are real captures of the app on the **fictional demo shop** and are labelled as demo data on the page.

### Before publishing (checklist)

1. **WhatsApp number:** in `landing/main.js`, set `CONFIG.whatsappNumber` (digits only, country code first, e.g. `6012…`). Also replace `60000000000` in the `href`s of `index.html` (used only if JavaScript is off). `60000000000` is a deliberate dummy.
2. **Google Form:** create a form and set `CONFIG.formUrl` and the `data-form` `href`s. Suggested fields: name, shop type, number of outlets, area, WhatsApp number, preferred language (EN / 中文), "how did you hear about us" and a short-answer "ref code". Add a one-line PDPA notice: *"We use these details only to contact you about Retail Profit Check. We don't share or sell them. Ask us any time to delete them."* Optional: use a pre-filled link (`…/viewform?usp=pp_url&entry.<id>=A-fbad`) per ad so the ref code fills in by itself.
3. **Accountant:** replace `[ACCOUNTANT NAME]` in `index.html` (and the `ACCA` avatar with a photo, e.g. `assets/accountant.webp`) **only with their written consent**.
4. Deploy the `landing/` folder as-is to any static host (Netlify, Cloudflare Pages, GitHub Pages). Don't add analytics scripts; the CSP will block them anyway. If you want counts, use the host's server-side request stats, which need no script in the page.
5. Run `npx playwright test e2e/landing.spec.ts` and `npm run marketing:check`.

### Re-capturing the screenshots

```bash
npm run build
```

```bash
npx vite preview --port 4173 --strictPort
```

In another terminal:

```bash
OUT=/tmp/rpc-raw node marketing/scripts/capture-assets.mjs && marketing/scripts/convert-assets.sh /tmp/rpc-raw
```
