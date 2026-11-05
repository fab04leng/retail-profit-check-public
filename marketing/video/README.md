# Demo videos

Screen recordings of the real app on the **fictional demo shop** ("Pinangria Mart"). Every frame shows a **"Demo data · fictional shop" / "示范资料 · 虚构店铺"** badge, and the end card says the figures are from a fictional shop and that the tool is not audited accounts or tax advice and doesn't replace an accountant. Captions are burned in; the `.srt` files carry the same text for platforms that also accept caption files. A silent audio track is included so every platform accepts the upload; add music or a voice-over in the editor if you like.

| File | Length | Format | Use it for |
|---|---:|---|---|
| `demo-full-60s-en.mp4` / `-zh.mp4` | ~61 s | 1920×1080 (16:9) | Landing page, Facebook feed, YouTube, sending on WhatsApp before a demo call |
| `clip-a-profit-20s-en.mp4` / `-zh.mp4` | ~20 s | 1080×1920 (9:16) | Pitch **A** (real profit by product): Reels, Stories, XHS, ads |
| `clip-b-stock-20s-en.mp4` / `-zh.mp4` | ~21 s | 1080×1920 (9:16) | Pitch **B** (cash stuck in stock) |
| `clip-c-invoices-20s-en.mp4` / `-zh.mp4` | ~22 s | 1080×1920 (9:16) | Pitch **C** (supplier invoice mistakes) |

All are H.264 (High), 30 fps, AAC, `+faststart`, encoded with ffmpeg `-preset veryfast -crf 21`. The landing page uses smaller 1280×720 copies (`marketing/landing/assets/demo-60s-*.mp4`).

## What each video shows

**Full walkthrough (60 s):** title card → Start page → *Load demo data* → Health check (five RM headline numbers) → Stock (value by days since last sale; possible dead stock: leftover CNY hampers) → Suppliers (a possible duplicate invoice, then the exact source rows) → Cash flow (8-week **estimate**; the week of 16 Nov may dip below zero) → Report (accountant reviews every finding; not audited accounts or tax advice) → end card with the RM300 pilot and WhatsApp call to action.

**Clip A (profit):** "See your real profit, product by product." → *Sold below cost* card (10 products, demo shop) → findings with average selling price vs unit cost → products under the target margin → end card.

**Clip B (stock):** "How much of your cash is sitting on the shelf?" → stock value by days since last sale → RM 9,392.62 with no sale for 60+ days (demo shop) → biggest item: leftover CNY hampers, 251 days → "decide what to clear, return or stop reordering" → end card.

**Clip C (invoices):** "Catch costly supplier invoice mistakes." → a possible duplicate (same invoice number, entered twice) → the exact rows with row numbers → invoices that may have been paid twice → "an accountant checks every flag before you see it" → end card.

## Posting notes

- Keep the demo badge visible; don't crop the bottom of vertical clips (badge and captions sit there).
- In the post text, say it's demo data from a fictional shop (see `marketing/BRIEF.md` §5).
- On Xiaohongshu, upload the `-zh` clips. Don't add a phone number or link in the video or caption (see `marketing/BRIEF.md` §8).
- For ads, use the 9:16 clips for Reels/Stories placements and the 16:9 full video for feed.

## Re-recording

The videos are made by `marketing/scripts/record-videos.mjs`; the timelines and caption text are in `marketing/scripts/video-scripts.mjs`.

```bash
npm run build
```

```bash
npx vite preview --port 4173 --strictPort
```

In another terminal (about 5 minutes for all eight; pass a video id such as `clip-b-stock-20s-zh` to record just one):

```bash
node marketing/scripts/record-videos.mjs
```

After re-recording, make the landing-page copies again:

```bash
for l in en zh; do ffmpeg -y -i marketing/video/demo-full-60s-$l.mp4 -vf scale=1280:-2 -c:v libx264 -preset veryfast -crf 26 -c:a aac -b:a 48k -movflags +faststart marketing/landing/assets/demo-60s-$l.mp4; done
```
