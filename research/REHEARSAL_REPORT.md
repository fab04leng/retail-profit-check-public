# Objection rehearsal: synthetic simulation (Phase 7)

> [!WARNING]
> **THESE ARE SYNTHETIC PERSONAS. THIS IS NOT MARKET RESEARCH.**
>
> - All 200 "owners" were **made up** by a rule-based script (`research/rehearsal.mjs`) written by the founders' assistant. No real shop owner was asked anything.
> - Every score, objection and question below comes from **assumptions typed into that script** (weights, probabilities, if-then rules). Change the assumptions and the "results" change.
> - The output is **NOT evidence of demand, interest, or willingness to pay** (RM300 or any other price), and it is not evidence about any segment.
> - **Only legitimate use:** rehearse objections, prepare honest answers, and plan what to test in the 10 real owner interviews.
> - Every finding below should be read as "**in this simulation**". Do not quote these numbers to investors, partners or customers.

> [!NOTE]
> **Update after the app was built:** this simulation was run assuming the demo would be in English and Chinese only. The app now also has a **Bahasa Melayu** interface, so the "language barrier" objections from Malay-preferring personas below are overstated. Tamil is still not available. The script was left unchanged so the output stays reproducible; rerun it with the two Malay language rules removed (`research/rehearsal.mjs`, LANGUAGE objection) if you want the updated mix.

---

## 1. Method

### 1.1 What the script does

1. Draws 200 personas (`P001`–`P200`) from hand-set distributions using a seeded PRNG (mulberry32, seed `20261104`). The personas have no names, only IDs and generic descriptors such as *"KL/Selangor hotel gift / souvenir shop, 1 outlet, < RM300k/yr, 3 staff, owner in 20s, prefers Malay, high digital comfort, shoebox of receipts + yearly accountant"*.
2. Scores each persona against three pitches with additive if-then rules:
   - **A** "See your real profit by product"
   - **B** "Free up cash stuck in stock"
   - **C** "Catch costly supplier invoice mistakes"
3. For each persona × pitch (600 reactions) it picks a **top objection** from a fixed catalogue of 14, plus a runner-up, and a **likely question** linked to that objection.
4. Writes `personas.json` (every persona with all its reactions, including which rules fired) and `rehearsal-summary.json` (aggregates plus the full rule tables).

The script uses no external packages, no AI and no network. A second, separate PRNG stream drives the reaction noise, so changing the reaction rules does not change the personas. Two runs give byte-identical output (checked).

### 1.2 Persona attributes and assumed distributions

All weights are the assistant's judgement. They are **not** measured statistics, and they are meant to resemble the founders' likely outreach pool (heavy on Penang, independent retailers), not Malaysia as a whole.

| Attribute | How it is generated | Realised counts (n=200) |
|---|---|---|
| Shop type (14) | Fixed weights: minimart/kedai runcit highest (18), then fashion boutique in a mall and phone accessories (9 each), pharmacy, bakery/café and hardware (8 each), cosmetics (7), bookstore/stationery and electrical (6 each), sports and kids/toys (5 each), pet supplies and optical (4 each), hotel gift shop (3). Each type also carries probabilities for being stock-heavy, having thin margins, being cash-heavy and using a POS, plus a range for supplier count | minimart 34, hardware 18, phone accessories 18, pharmacy 18, fashion (mall) 16, electrical 14, kids/toys 13, bakery/café 13, books/stationery 12, cosmetics 11, sports 11, hotel gift 8, optical 7, pet supplies 7 |
| Annual revenue band | Loosely follows the SME Corp Malaysia bands, with "small" split in two. Weights 28/34/22/12/4, and the micro weight is scaled by shop type (e.g. mall boutiques are rarely micro) | < RM300k 48; RM300k–1M 74; RM1M–3M 51; RM3M–10M 19; RM10M–20M 8 |
| Staff | Random within the band range, plus 2 for each extra outlet | 1–75+ |
| Outlets (1–6) | Depends on revenue band (micro shops are 92% single-outlet; the RM10M+ band has 2–6) | 1: 122; 2: 37; 3: 24; 4: 14; 5: 1; 6: 2 |
| State | Penang 30, KL/Selangor 24, Johor 11, Perak 8, Sarawak 6, Kedah 5, Sabah 5, Melaka 4, N. Sembilan 4, Pahang 3 | KL/Sel 61, Penang 58, Johor 18, Sarawak 18, Perak 14, Melaka 9, Sabah 7, Pahang 6, N. Sembilan 5, Kedah 4 |
| Main business language | Depends on state (e.g. Penang: Mandarin/Hokkien 44, Malay 24, English 16, Tamil 9, Cantonese 7). This is the owner's preferred business language, **not** ethnicity | Malay 72, Mandarin/Hokkien 57, English 36, Cantonese 18, Tamil 17 |
| Age band | 20s 8, 30s 25, 40s 30, 50s 24, 60+ 13 | 20s 11, 30s 52, 40s 68, 50s 43, 60+ 26 |
| Digital comfort | Hidden score = age effect + shop-type effect + 0.2 per revenue band + Gaussian noise (sd 0.6). Thresholds split it into low, medium and high | low 39, medium 88, high 73 |
| Accounting setup | Weights depend on revenue band (micro shops mostly use a shoebox and a yearly accountant; larger shops have an in-house clerk or a monthly firm). Digital comfort scales the weights | shoebox + yearly accountant 48, in-house clerk 34, POS + spreadsheet 33, monthly accountant firm 32, part-time bookkeeper 30, cloud accounting app 23 |
| POS usage | Base rate by shop type, adjusted for digital comfort and revenue. A POS linked to accounting is more likely if the shop uses cloud accounting | POS with reports 114, POS linked to accounting 34, cash register only 31, none 21 |
| Decision maker | Sole owner, family or partners. More family businesses among minimart, hardware, bakery and electrical; more partnerships among phone, fashion and cosmetics | sole 98, family 75, partners 27 |
| Pain flags | stock-heavy and thin margins drawn from shop-type probabilities. Supplier count = type range × (1 + 0.25 per extra outlet). Past cash crunch: p = 0.2, plus 0.2 if stock-heavy, plus 0.15 if thin margins, plus 0.1 if revenue < RM1M. Past invoice mistake noticed: p = 0.12 + 0.012 × suppliers (+0.08 for shoebox), capped at 0.65 | stock-heavy 131, thin margins 107, cash crunch 90, invoice mistake noticed 69, cash-heavy 99, median 13 suppliers |
| Data readiness (derived) | `paper` = no POS, or cash register plus shoebox. `partial` = cash register, or shoebox. Otherwise `digital` | digital 117, partial 55, paper 28 |

### 1.3 Interest scoring model (1–5)

```
raw      = 2.6 + Σ(pitch rules that apply) + Σ(common rules that apply) + 0.5 × N(0,1)
interest = clamp(round(raw), 1, 5)
```

| Pitch | Rule (weight) |
|---|---|
| A, profit by product | thin margins +0.9; SKU-heavy shop type +0.5; 2+ outlets +0.3; past cash crunch +0.2; POS linked to accounting −0.6; cloud accounting −0.3 |
| B, cash in stock | stock-heavy +1.1; past cash crunch +0.7; 3+ outlets +0.3; seasonal/model-cycle stock +0.3; perishable (bakery/café) −0.9; micro band −0.2 |
| C, supplier invoices | invoice mistake noticed before +1.0; 15+ suppliers +0.6; 8–14 suppliers +0.3; < 6 suppliers −0.5; thin margins +0.3; in-house clerk −0.3; revenue RM1M+ +0.3 |
| Common (all pitches) | high digital comfort +0.35; low −0.45; owner 60+ −0.3; micro band −0.3; monthly accountant firm −0.25; cloud accounting +0.15; paper records −0.4 |

Averaged over the 200 personas, the pitch-specific rules add **+0.88 (A), +1.10 (B), +0.88 (C)**, and the common rules add −0.15. **The ranking of pitches below follows directly from these weights and from how often each pain flag was set to occur.** B comes out ahead mainly because the script makes 131 of 200 personas stock-heavy and gives that flag the largest weight.

### 1.4 Objection model

For each reaction, every objection gets a score: the sum of its rules that apply, plus noise U(0, 0.3). The highest score is the **top objection**; the second highest is recorded as the runner-up.

| Objection | Rules (weight) |
|---|---|
| Price / no budget ("RM300 is a lot") | base +0.4; micro +0.9; RM300k–1M +0.4; thin margins +0.3; past cash crunch +0.2; revenue RM3M+ −0.6; interest 4–5 +0.3 |
| "My accountant already does this" | monthly firm +1.5; part-time bookkeeper +0.9; in-house clerk +0.8; shoebox/yearly accountant +0.4; pitch C + in-house clerk +0.3; interest 1–2 +0.3 |
| Data privacy / sharing files | base +0.3; revenue RM1M+ +0.4; medium/high digital +0.2; pitch C +0.3; pharmacy +0.3; interest 4–5 +0.3 |
| Distrust of software/"AI" | low digital +0.8; owner 50+ +0.4; shoebox +0.3 |
| No time | base +0.4; ≤3 staff +0.5; 3+ outlets +0.4; low digital +0.3; bakery/café +0.3 |
| "My POS already shows reports" | POS with reports +1.0; POS linked +1.3; pitch A + POS +0.4; pitch C −0.9; interest 1–2 +0.2 |
| Data is messy / not digital | no POS +1.3; register only +0.6; shoebox +0.6; low digital +0.4; pitch C + shoebox +0.3 |
| "Too small to need it" | micro +1.0; single outlet +0.3; pitch C + < 6 suppliers +0.6; interest 1–2 +0.4; revenue RM1M+ −0.8 |
| Prefers to see results first | base +0.8; high digital +0.3; interest 3–4 +0.4 |
| Language barrier | Tamil +1.4; Malay +0.4; Malay + low digital +0.4; Cantonese + 60+ +0.3; non-English + 60+ +0.2. *Assumes the UI is English + Chinese, with BM planned and Tamil not planned* |
| Fear of tax/authorities seeing data | shoebox +0.6; cash-heavy +0.5; revenue < RM1M +0.2; pitch A +0.3 |
| Partner/family decision | family +0.9; partners +1.0; revenue RM1M+ +0.2; interest 3+ +0.2 |
| "I already know my shop by feel" | owner 50+ +0.5; single outlet +0.3; ≤3 staff +0.3; pitch B +0.3; interest 1–2 +0.3 |
| "My suppliers are long-time, they won't overcharge" | pitch C +0.8; C + owner 50+ +0.4; C + family +0.3; C + invoice mistake noticed −0.8 |

**Likely question.** Each objection maps to one question. A few rules switch the question: price + interest 4–5 becomes "What is the monthly price after the pilot?"; results-first + interest 4–5 becomes "How much will I save?"; accountant + pitch C + in-house clerk becomes "My clerk already checks"; privacy + pitch C becomes "supplier prices confidential"; already-know + pitch B + interest 3+ becomes "What do I do with dead stock?".

**Tuning note.** After the first run, *Price* won 40% of all reactions, only because its many small rules stack. Four objection weights were adjusted once, and each change is marked "first draft" in the script: the price base went from 0.6 to 0.4, the price cash-crunch rule from 0.3 to 0.2, the Tamil language rule from 1.2 to 1.4, and the supplier-trust pitch-C rule from 0.6 to 0.8. The interest rules were not tuned. This shows how easily the objection mix can be steered, which is one more reason it says nothing about real owners.

### 1.5 Limitations (read before using any table)

- **The output is circular.** The script returns the assumptions it was given. A segment "prefers" pitch B because a rule says stock-heavy shops like pitch B.
- **The model is additive and linear.** Real objections are conversational, can be stacked or hidden, and often stand in for something else (for example, "no time" can mean "I don't trust you yet").
- **Some objections cannot appear by construction.** *No time* is never the top objection in this run, because its rules are always outscored. Real owners very likely say it often. The model has blind spots like this that only real interviews can show.
- **Stated interest is not behaviour.** Even a real "4/5" is weak evidence. A simulated one is no evidence at all.
- **Small cells.** Segments with n < 10 are marked `*`, and even n = 30 differences of 0.2–0.3 points are mostly noise plus assumptions.
- **No price sensitivity was modelled.** The price objection is a rule, not a demand curve. Nothing here says whether RM300 or any monthly price is acceptable.
- **The pool is not representative.** It is skewed towards Penang and KL, has no e-commerce-only sellers, and simplifies language (Hakka/Foochow are folded into Mandarin/Hokkien; local Sabah/Sarawak languages are folded into Malay).

---

## 2. Interest by pitch (in this simulation)

| Pitch | Mean | 1 | 2 | 3 | 4 | 5 | Share 4–5 |
|---|---|---|---|---|---|---|---|
| A. See your real profit by product | 3.31 | 5 | 31 | 80 | 66 | 18 | 42% |
| B. Free up cash stuck in stock | 3.58 | 5 | 19 | 65 | 77 | 34 | 56% |
| C. Catch costly supplier invoice mistakes | 3.40 | 6 | 28 | 69 | 75 | 22 | 49% |

Highest-scoring pitch per persona: B 54, C 39, A 24, tie 83. In this simulation the three pitches are close and mostly tie, so the main thing it suggests is that **the persona attributes, not the pitch wording, drive the score**. That is a statement about the model, and it is worth testing for real.

---

## 3. Top objections (in this simulation)

### 3.1 Overall: top objection across 600 reactions (200 personas × 3 pitches)

| # | Objection | Count | Share | Pitch A | Pitch B | Pitch C |
|---|---|---|---|---|---|---|
| 1 | Price / no budget ("RM300 is a lot") | 144 | 24% | 47 | 57 | 40 |
| 2 | Prefers to see results first | 97 | 16% | 26 | 36 | 35 |
| 3 | "My POS already shows reports" | 80 | 13% | 75 | 5 | 0 |
| 4 | "My accountant already does this" | 64 | 11% | 15 | 25 | 24 |
| 5 | Data is messy / not digital | 54 | 9% | 17 | 17 | 20 |
| 6 | Data privacy / sharing files | 48 | 8% | 0 | 11 | 37 |
| 7 | Partner/family decision | 23 | 4% | 7 | 13 | 3 |
| 8 | "Too small to need it" | 23 | 4% | 3 | 6 | 14 |
| 9 | Language barrier | 18 | 3% | 2 | 9 | 7 |
| 10 | Distrust of software/"AI" getting numbers right | 13 | 2% | 0 | 9 | 4 |
| 11 | Fear of tax/authorities seeing data | 12 | 2% | 6 | 3 | 3 |
| 12 | "My suppliers are long-time, they won't overcharge" | 12 | 2% | 0 | 0 | 12 |
| 13 | "I already know my shop by feel" | 12 | 2% | 2 | 9 | 1 |
| 14 | No time | 0 | 0% | 0 | 0 | 0 |

### 3.2 Objection appears as top **or** runner-up

This is less sensitive to one rule narrowly beating another, and closer to "what should we be ready for".

| Objection | Count | Share of 600 reactions |
|---|---|---|
| Prefers to see results first | 240 | 40% |
| Price / no budget | 233 | 39% |
| "My POS already shows reports" | 152 | 25% |
| "My accountant already does this" | 101 | 17% |
| Data privacy / sharing files | 101 | 17% |
| Partner/family decision | 77 | 13% |
| Data is messy / not digital | 68 | 11% |
| "Too small to need it" | 51 | 9% |
| Fear of tax/authorities seeing data | 39 | 7% |
| Distrust of software/"AI" | 37 | 6% |
| Language barrier | 34 | 6% |
| "I already know my shop by feel" | 29 | 5% |
| "My suppliers won't overcharge" | 26 | 4% |
| No time | 12 | 2% |

### 3.3 Per pitch (top 6 each, share of 200 personas)

| Rank | Pitch A, profit by product | Pitch B, cash in stock | Pitch C, supplier invoices |
|---|---|---|---|
| 1 | "My POS already shows reports" 75 (38%) | Price 57 (29%) | Price 40 (20%) |
| 2 | Price 47 (24%) | Results first 36 (18%) | Data privacy 37 (19%) |
| 3 | Results first 26 (13%) | "Accountant does this" 25 (13%) | Results first 35 (18%) |
| 4 | Messy data 17 (9%) | Messy data 17 (9%) | "Accountant does this" 24 (12%) |
| 5 | "Accountant does this" 15 (8%) | Partner/family 13 (7%) | Messy data 20 (10%) |
| 6 | Partner/family 7 (4%) | Data privacy 11 (6%) | "Too small" 14 (7%) |

### 3.4 Among the more interested reactions (interest 4–5, n = 292)

| Objection | Count | Share |
|---|---|---|
| Price / no budget | 108 | 37% |
| Data privacy / sharing files | 47 | 16% |
| Prefers to see results first | 40 | 14% |
| "My POS already shows reports" | 30 | 10% |
| "My accountant already does this" | 21 | 7% |
| Data is messy / not digital | 16 | 5% |
| Partner/family decision | 13 | 4% |
| Others (language, tax, already know, AI distrust) | 17 | 6% |

How to read this (in this simulation): pitch A collides with the POS reports owners already have, pitch C triggers privacy concerns about supplier prices, and owners who are interested move on to price and "show me first". All of these come straight from the rules in §1.4. Treat them as **objections to rehearse**, not as a forecast of frequency.

---

## 4. Which pitch resonates with which segment (in this simulation)

Columns: average interest (1–5) per pitch, the share of personas scoring 4–5, the highest pitch ("X≈Y" when the gap is under 0.15), and the most common top objection in that segment across all three pitches. `*` = n < 10, do not read.

### 4.1 By shop type

| Shop type | n | Avg A | Avg B | Avg C | 4–5 A | 4–5 B | 4–5 C | Highest | Most common objection |
|---|---|---|---|---|---|---|---|---|---|
| Minimart / kedai runcit | 34 | 3.68 | 3.44 | 3.82 | 56% | 56% | 68% | C≈A | Price |
| Hardware | 18 | 3.06 | 3.44 | 3.17 | 22% | 44% | 33% | B | "Accountant does this" |
| Phone accessories | 18 | 3.78 | 3.56 | 3.39 | 67% | 50% | 56% | A | Results first |
| Pharmacy | 18 | 3.67 | 3.78 | 3.94 | 67% | 67% | 78% | C | Price |
| Fashion boutique (mall) | 16 | 2.94 | 3.94 | 3.13 | 25% | 69% | 25% | B | "POS shows reports" |
| Electrical | 14 | 2.86 | 3.79 | 3.79 | 7% | 57% | 71% | B≈C | Results first |
| Kids / toys | 13 | 3.54 | 3.77 | 3.00 | 62% | 54% | 38% | B | Price |
| Bakery / café retail | 13 | 3.08 | 2.15 | 3.15 | 31% | 0% | 46% | C≈A | "POS shows reports" |
| Bookstore / stationery | 12 | 3.58 | 4.17 | 3.17 | 50% | 75% | 25% | B | Messy data |
| Cosmetics | 11 | 3.36 | 3.82 | 3.09 | 45% | 64% | 36% | B | Results first |
| Sports | 11 | 2.91 | 4.00 | 2.91 | 27% | 82% | 18% | B | Results first |
| Hotel gift shop * | 8 | 2.63 | 3.50 | 3.25 | 38% | 63% | 38% | B | Price |
| Optical * | 7 | 2.57 | 3.71 | 2.57 | 14% | 71% | 14% | B | Price |
| Pet supplies * | 7 | 3.29 | 3.14 | 4.14 | 29% | 29% | 86% | C | Price |

### 4.2 By size (annual revenue band)

| Revenue band | n | Avg A | Avg B | Avg C | 4–5 A | 4–5 B | 4–5 C | Highest | Most common objection |
|---|---|---|---|---|---|---|---|---|---|
| < RM300k | 48 | 3.19 | 3.27 | 3.19 | 40% | 44% | 48% | B≈A | Price |
| RM300k–1M | 74 | 3.28 | 3.73 | 3.20 | 41% | 62% | 35% | B | Price |
| RM1M–3M | 51 | 3.35 | 3.59 | 3.73 | 43% | 53% | 65% | C≈B | Results first |
| RM3M–10M | 19 | 3.47 | 3.84 | 3.74 | 47% | 74% | 53% | B≈C | Results first |
| RM10M–20M * | 8 | 3.50 | 3.38 | 3.50 | 50% | 38% | 63% | A≈C | "POS shows reports" |

### 4.3 By number of outlets

| Outlets | n | Avg A | Avg B | Avg C | 4–5 A | 4–5 B | 4–5 C | Highest | Most common objection |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 122 | 3.16 | 3.46 | 3.25 | 38% | 51% | 43% | B | Price |
| 2–3 | 61 | 3.52 | 3.77 | 3.48 | 49% | 64% | 52% | B | Price |
| 4–6 | 17 | 3.53 | 3.76 | 4.12 | 47% | 59% | 76% | C | Results first |

### 4.4 By digital comfort

| Digital comfort | n | Avg A | Avg B | Avg C | 4–5 A | 4–5 B | 4–5 C | Highest | Most common objection |
|---|---|---|---|---|---|---|---|---|---|
| Low | 39 | 2.62 | 2.87 | 2.64 | 10% | 23% | 15% | B | Price |
| Medium | 88 | 3.35 | 3.72 | 3.44 | 45% | 61% | 49% | B | Price |
| High | 73 | 3.62 | 3.79 | 3.74 | 55% | 66% | 66% | B≈C | Results first |

### 4.5 By current accounting setup

| Accounting setup | n | Avg A | Avg B | Avg C | 4–5 A | 4–5 B | 4–5 C | Highest | Most common objection |
|---|---|---|---|---|---|---|---|---|---|
| Shoebox + yearly accountant | 48 | 3.02 | 3.33 | 3.23 | 35% | 44% | 46% | B≈C | Price |
| In-house accounts clerk | 34 | 3.24 | 3.59 | 3.18 | 35% | 53% | 44% | B | "POS shows reports" |
| POS + own spreadsheet | 33 | 3.45 | 3.61 | 3.27 | 48% | 58% | 42% | B | Price |
| Accountant firm, monthly | 32 | 3.34 | 3.47 | 3.47 | 38% | 53% | 41% | B≈C | "Accountant does this" (61% of its reactions) |
| Part-time bookkeeper | 30 | 3.70 | 3.87 | 3.57 | 57% | 70% | 57% | B | Price |
| Cloud accounting app | 23 | 3.22 | 3.83 | 3.91 | 43% | 65% | 70% | C≈B | Results first |

### 4.6 By main language

| Language | n | Avg A | Avg B | Avg C | 4–5 A | 4–5 B | 4–5 C | Highest | Most common objection |
|---|---|---|---|---|---|---|---|---|---|
| Malay | 72 | 3.15 | 3.58 | 3.35 | 35% | 54% | 46% | B | Price |
| Mandarin/Hokkien | 57 | 3.42 | 3.56 | 3.32 | 47% | 56% | 47% | B≈A | Price |
| English | 36 | 3.44 | 3.53 | 3.61 | 50% | 61% | 53% | C≈B | Price |
| Cantonese | 18 | 3.22 | 3.61 | 3.39 | 33% | 50% | 56% | B | Price |
| Tamil | 17 | 3.35 | 3.71 | 3.41 | 47% | 53% | 47% | B | Language barrier (top objection for at least one pitch for 12 of the 17) |

Language has no rule in the interest model, so differences between languages in interest are noise plus correlation with other attributes (state, shop type). Language does change the **objections**.

### 4.7 Patterns in this simulation (all mechanical consequences of the rules)

- **Pitch B** scores highest in stock-heavy, seasonal categories: books/stationery 4.17, sports 4.00, fashion 3.94. It scores lowest in bakery/café (2.15) because of the perishable rule. Stock-heavy personas with a past cash crunch average 4.25 on B; personas without stock-heavy average 2.74.
- **Pitch C** scores highest with many suppliers, several outlets and larger revenue: 4–6 outlets 4.12, pharmacy 3.94, minimart 3.82, cloud-accounting users 3.91. Personas who had noticed an invoice mistake average 4.06 on C, against 3.05 for those who had not.
- **Pitch A** does best in SKU-heavy, thin-margin categories (phone accessories 3.78, minimart 3.68, pharmacy 3.67). It is weakest where the POS already looks like it gives "profit by product": about half of POS users raise "my POS already shows reports" against pitch A.
- **Low digital comfort and owners aged 60+** score lowest on every pitch: only 16 of 39 low-digital personas score 4 or more on any pitch.

---

## 5. Questions to prepare for (top 15 in this simulation, with suggested honest answers)

Ranked by how often the simulation produced each question. Frequency here says nothing about real owners; prepare all of them.

| # | Likely question | Count | Suggested honest answer |
|---|---|---|---|
| 1 | After the pilot, how much is it per month, and can I stop any time? | 108 | We have not fixed the monthly price yet; we are testing it with pilot shops. The pilot itself has no lock-in. Ask back: "What would it need to show you each month to be worth paying for?" Do not quote a number you have not decided. |
| 2 | My POS already gives me sales reports. What is extra? | 80 | A POS usually shows what sold. This combines sales with stock cost and supplier invoices to show margin after cost, cash tied up in ageing stock, and invoice problems the POS never sees. If your POS already shows margins by product with correct costs, the profit part may add little. Ask them to show you what their POS report contains. |
| 3 | My accountant already handles my accounts. What is different? | 60 | Most accountants prepare statutory accounts and tax from summaries. This looks at transaction rows: margin per product, stock age, duplicate or overpaid supplier invoices. It complements your accountant rather than replacing them, and you can share the findings with them. If your accountant already does product-level and invoice checks, this may add little; say so. |
| 4 | Can you show me what it found for a shop like mine first? | 57 | Show the demo on clearly labelled synthetic data (a made-up Penang minimart). Say plainly that there are **no real client results yet**; you are looking for the first pilot shops. Do not present demo findings as typical. |
| 5 | My records are mostly on paper / quite messy. Can it still work? | 54 | It needs at least a digital sales export and a stock list. If records are mostly paper, it is probably not a fit right now; say so rather than oversell. Partial use (e.g. only supplier invoices typed into a sheet) is possible but takes effort. |
| 6 | How much money will I save? | 40 | We cannot promise a figure, and we have no real pilot results yet. The report shows RM amounts calculated from your own rows (e.g. value of stock unsold for 90+ days); what you recover depends on what you do with it. |
| 7 | Will my supplier prices end up with other shops or my competitors? | 37 | No. Your files are not uploaded or pooled with other shops' data, and nothing is compared across clients. Put a confidentiality clause in the pilot agreement so this is in writing. |
| 8 | Why RM300? What exactly do I get for it? | 36 | One health check on your own files: profit by product, below-cost items, slow/dead stock value, possible duplicate or overpaid supplier invoices, price jumps and an 8-week cash outlook, with the findings reviewed by an ACCA accountant. We cannot promise it will find more than RM300 of issues; if it finds little, you will see that too. *(Founders: decide and state the refund / "no findings" policy before the interviews.)* |
| 9 | Can you give me something to show my partner / family? | 23 | Yes: a one-page summary of what the check covers, the price, how data is handled, and the demo report (labelled as demo). Offer a short session with the partner too. |
| 10 | Is this only for bigger shops? | 23 | Smaller shops have fewer rows, so issues may be smaller in ringgit and the RM300 may not pay back. Ask about their stock value and supplier count before deciding together whether it is worth it. |
| 11 | Can the report be in my language, or can someone explain it to me in it? | 18 | The tool is currently in English and Chinese; Bahasa Malaysia is planned; Tamil is not available. Say which languages the team can explain findings in, and do not promise translations you do not have. |
| 12 | How do I know the computer got my numbers right? | 13 | It is not AI. Each check is a written rule, and every finding shows which rule fired and the exact rows in your file, so you can check it yourself. Findings are worded as "possible" or "needs review", and an accountant reviews them before you act. It can still be wrong if the input files are wrong. |
| 13 | Will LHDN see this? Will it make my tax go up? | 12 | The tool does not send anything to anyone and it is not a tax filing. It is a management check for your own decisions. Your tax obligations are unchanged and remain between you and your tax agent. Do not imply it can help reduce or hide tax. |
| 14 | My suppliers are long-time partners. Why would they overcharge me? | 12 | Most issues are honest errors: re-sent invoices, old price lists, paying the same invoice twice. The checks catch errors without accusing anyone, and a finding becomes a polite question to raise with the supplier. |
| 15 | Where does my data go? Who can see it? | 11 | The tool runs in your web browser on your own computer; files are not uploaded and the page makes no network connections. The accountant only sees the findings you choose to show or share. *(Founders: describe the exact review hand-over and put it in the pilot agreement, in line with PDPA.)* |

**Also prepare these.** The simulation produced them rarely or never, but they are plausible:

- "I already know which items don't sell; what will you tell me?" Offer the 5-slowest-items guess-vs-data test.
- "What do I do with the dead stock you find?"
- "My clerk checks every invoice."
- **"How much of my time will this take?"** The model never produced this question (see §1.5), yet it is probably one of the most common in real life. Time the first pilot exports and answer with real numbers.

---

## 6. Implications for the 10 real interviews

Everything below is a **hypothesis generated by the simulation's assumptions**. The interviews exist to try to break these hypotheses, not to confirm them. Prefer behaviour over opinions: does the owner open their POS and show the export, name a real RM figure, ask to book the pilot, or introduce their partner? A "sounds good" is weak evidence.

### 6.1 Hypotheses to test, and what would falsify them

| # | Hypothesis (from the coded assumptions) | How to test it in the interview | Falsified / weakened if… |
|---|---|---|---|
| H1 | Stock-heavy owners with a past cash crunch respond most to **B, cash in stock** | Ask about the last time cash was tight and what caused it, *before* pitching. Then show all three pitches and ask them to rank | Of the ~4 stock-heavy owners interviewed, fewer than 2 rank B first, **or** none can estimate the value of their slow stock, **or** none will export a stock list |
| H2 | Owners with many suppliers (15+) and multiple outlets respond most to **C, supplier invoices**, especially if they remember an invoice error | Ask "When did a supplier invoice last go wrong? How did you find out? How much was it?" | Most cannot recall any invoice error, **or** they say their clerk/accountant reliably catches them, **or** the amounts they recall are trivial next to RM300 |
| H3 | **A, profit by product** is weakened by "my POS already shows reports" | Ask them to open their POS and show the report they use. Does it show margin after cost, or only sales? | POS users show they already see per-product margin with correct costs (then A is redundant for them), **or** owners without POS margin data still don't care about margin |
| H4 | "My accountant already does this" is the main blocker for owners with a **monthly accountant firm** | Ask what their accountant actually delivers each month and whether it includes product margins, stock age or invoice checks | Owners with monthly firms say the accountant covers none of this and they are open to it (blocker is weaker than assumed), **or** the accountant does already cover it (the segment is not a fit) |
| H5 | The **price** objection clusters in shops below RM1M revenue; above RM1M the objections move to "show me results first" and privacy | Ask about price only after they have seen the demo. Use open questions ("What would you expect to pay?") before mentioning RM300 | Owners above RM1M also baulk at RM300, **or** micro owners accept it readily (the price objection is not about size) |
| H6 | Owners with **low digital comfort / paper records** are a poor fit for the tool as built | Include 1–2 such owners on purpose. Ask how they would get their data out | They produce usable exports easily, or are very keen for an assisted version (then the "poor fit" assumption is wrong and there may be a service opportunity) |
| H7 | **Privacy of supplier prices** is a bigger worry than privacy of sales | When pitching C, watch for hesitation; ask "Is there anything you would not want us to see?" | Owners show no concern about supplier data, **or** their main concern is about sales/income (tax) data instead |
| H8 | **Language** (Tamil; BM until the BM UI exists) is a real barrier for some owners | Interview at least one owner who prefers Malay and one who prefers Tamil, in their language if possible | They are comfortable with an English report plus a spoken explanation (the barrier is about the conversation, not the UI) |
| H9 | Owners will want to **see results before paying** (40% of reactions in this simulation had it as top or runner-up) | Offer two options: pay RM300 up front, or a free mini-check on one file followed by the paid pilot. See which they pick | Owners readily agree to pay up front after the demo (results-first is weaker than assumed) |

### 6.2 Segments to prioritise for interviews (framed as hypotheses)

The simulation's "most responsive" profile is just a restatement of its own rules: RM1M–10M revenue, 2+ outlets, medium/high digital comfort, a POS or cloud accounting, and stock-heavy or supplier-heavy. The 48 such personas average A 3.63, B 3.83, C 3.79. That is a reasonable **place to start looking**, not a target market. A suggested mix for 10 interviews, chosen so that each hypothesis has someone who can confirm or break it:

| Slots | Profile (generic) | Mainly tests |
|---|---|---|
| 3 | Stock-heavy, seasonal shops with a POS, RM300k–3M (e.g. fashion, books/stationery, sports, toys, hardware) | H1, H3, H5 |
| 3 | Supplier-heavy shops, 15+ suppliers, ideally 2+ outlets (e.g. minimart, pharmacy, electrical) | H2, H7, H5 |
| 2 | Owners who already pay a monthly accountant firm or have an in-house clerk (any category) | H4, H2 |
| 1 | Micro shop (< RM300k) and/or low digital comfort with mostly paper records | H6, H5 |
| 1 | An owner who prefers Malay or Tamil (overlapping with one of the slots above if possible, freeing a slot) | H8 |

Across the 10, also try to include at least 2 owners outside Penang, at least 2 owners aged 50+, and at least 2 family businesses or partnerships so that the partner/family decision shows up if it is real.

### 6.3 What the simulation cannot tell you

- Whether anyone will pay RM300 or any monthly price.
- Which objection really comes first (the ranking above can be moved by editing a weight, as §1.4 shows).
- Whether owners' data exports are clean enough for the tool, which may be the biggest practical risk.
- How owners feel about an accountant they did not choose seeing their findings.
- Objections nobody thought to put in the catalogue. Write down every objection the real owners raise that is **not** in the catalogue; those are the most valuable output of the interviews.

After the interviews, compare the real objections with §3. Where they differ, trust the interviews and update or delete this simulation.

---

## 7. Reproduction

```bash
node research/rehearsal.mjs
```

- Requires Node.js 22+; no npm dependencies.
- Writes `research/personas.json` (200 personas, each with three reactions and the IDs of the interest rules that fired) and `research/rehearsal-summary.json` (distributions, aggregates, segment tables, the question catalogue and the full rule tables). It prints the markdown tables used in this report to stdout.
- The output is deterministic: seed `20261104` (constant `SEED` in the script). Changing the seed or any weight changes the "results", and that is the point to remember.
