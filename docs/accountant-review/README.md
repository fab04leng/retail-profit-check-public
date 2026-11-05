# Accountant rule-review pack / 会计师规则审阅资料

A printable pack for the partner accountant to review **every rule** in [`src/rules/rules.config.ts`](../../src/rules/rules.config.ts) before the first paid pilot.
给合作会计师在第一个付费试用之前审阅 [`src/rules/rules.config.ts`](../../src/rules/rules.config.ts) 中**每一条规则**的可打印资料。

| File / 文件 | What / 内容 |
|---|---|
| [`rule-review-pack.en.pdf`](rule-review-pack.en.pdf) | Print-ready PDF, English (A4) |
| [`rule-review-pack.zh.pdf`](rule-review-pack.zh.pdf) | 可直接打印的 PDF，简体中文（A4） |
| `rule-review-pack.{en,zh}.md` | The same content, readable on GitHub / 相同内容，可在 GitHub 阅读 |
| `rule-review-pack.{en,zh}.html` | Printable page (the PDF is printed from it) / 可打印网页（PDF 由此打印） |
| [`evidence/`](evidence/) | Every source row behind a worked example that has more rows than fit on the page / 实例中放不下的所有原始资料行 |

**Each rule has:** a plain-language description, the threshold (default and allowed range), a worked example from the demo data with the exact rows (row numbers match `demo/data/*.csv`, header = row 1), known false positives, what it can miss, a question for the accountant, and an **Agree / Change to ___ / Remove** box with space for notes. Page 1 is a cover explaining what the tool does and does not do, with a sign-off line; the last page collects all decisions.

**Rules version.** The cover and every page footer show a short hash of `rules.config.ts` (for example `c81bf888`). A signed pack applies to that version only. After changing any rule, regenerate the pack and give the accountant the new version.

**Regenerate** (after changing a rule, a threshold, the demo data or the notes in `src/review/packNotes.ts`):

```bash
npm run accountant:pdf
```

`npm run accountant:pack` writes only the Markdown, HTML and evidence files (no browser needed). `tests/unit/accountant-pack.test.ts` fails if the committed Markdown or HTML is out of date, if a rule has no notes or example, or if a printed row does not match the demo file.

Code: [`src/review/`](../../src/review/) (notes, worked examples, rendering) and [`scripts/accountant-pack.ts`](../../scripts/accountant-pack.ts) (file writing and PDF).
