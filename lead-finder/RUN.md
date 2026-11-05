# Run the lead finder on your own Windows laptop

This uses the free, open-source [gosom/google-maps-scraper](https://github.com/gosom/google-maps-scraper) inside Docker.
It runs **on your laptop only**. Read [RULES.md](RULES.md) before you use the list.

Time needed: about 15 minutes of setup, then 30–90 minutes of waiting while it scrapes (84 queries).

## 1. One-time setup

1. **Install Docker Desktop**: download it from <https://www.docker.com/products/docker-desktop/>, run the installer, keep the default "Use WSL 2" option ticked, and restart if asked.
2. **Open Docker Desktop** and wait until the bottom-left corner says *Engine running* (green).
3. **Install Node.js LTS** from <https://nodejs.org/> (needed for the cleaning step). Keep all defaults.
4. **Make a folder** `C:\leads` and copy these three files from this repo's `lead-finder/` folder into it:
   - `queries.txt`
   - `clean.mjs`
   - `RULES.md`

## 2. Run the scraper (one copy-paste command)

1. Open the `C:\leads` folder in File Explorer.
2. Click the address bar, type `powershell`, press **Enter**. A PowerShell window opens already inside `C:\leads`.
3. Paste this **whole line** and press **Enter**:

```powershell
docker run --rm -v gmaps-playwright-cache:/opt -v "${PWD}:/work" gosom/google-maps-scraper -input /work/queries.txt -results /work/results.csv -depth 1 -email -exit-on-inactivity 3m
```

What the parts mean:

| Part | Meaning |
|---|---|
| `-v gmaps-playwright-cache:/opt` | Keeps the scraper's browser between runs, so later runs start faster |
| `-v "${PWD}:/work"` | Lets the scraper read `queries.txt` and write `results.csv` in this folder |
| `-depth 1` | Only the first page of results per query (keeps it small and polite) |
| `-email` | Visits each shop's **own website** to find a public business email (slower; remove it to go faster) |
| `-exit-on-inactivity 3m` | Stops by itself 3 minutes after the last query finishes |

The first run downloads the scraper and a browser, so it is slow to start. Log lines scrolling past are normal.
When the prompt (`PS C:\leads>`) comes back, it is done and `results.csv` is in the folder.

**Try a small test first (optional):** make a copy of `queries.txt` with just 2–3 lines, call it `test.txt`, and run the same command with `/work/test.txt` instead of `/work/queries.txt`.

## 3. Clean it into `leads.csv`

In the same PowerShell window:

```powershell
node clean.mjs results.csv leads.csv
```

It prints something like `2140 scraped rows -> 812 leads in leads.csv { High: 120, Medium: 260, Low: 432 }`.
Open `leads.csv` in Excel or upload it to Google Sheets.

## 4. What is in `leads.csv`

| Column | Meaning |
|---|---|
| name, category, phone, website, rating, reviews | From the Google Maps listing |
| area | George Town, Gurney, Bayan Lepas, Bukit Jambul, Butterworth, Bukit Mertajam, Batu Kawan, Seberang Jaya, Batu Ferringhi, or Other |
| email | Public business email found on the shop's own website (may be blank) |
| segment | minimart, convenience, gift, lifestyle, pharmacy, hardware, bakery, hotel-gift, or other |
| priority | **High / Medium / Low**: more reviews + a website (+ email) = higher. The file is sorted best first |
| brother-knows | Blank. Write `yes` if your brother (or anyone you know) knows the owner, for a warm intro |
| status | Starts as `new`. Suggested values: `visited`, `intro-asked`, `emailed`, `meeting`, `not-interested`, `do-not-contact` |

Duplicates (same place, same phone, or same name in the same area) are merged, and permanently closed shops are removed.
Phone numbers are shown in local form (`04-...`) so Excel does not mistake them for formulas.

## Troubleshooting

| Problem | Fix |
|---|---|
| `docker` is not recognized / `error during connect` | Docker Desktop is not running. Open it and wait for *Engine running* |
| `results.csv` is empty or very short | Google may be slowing you down. Wait a few hours and try again with fewer queries. Do **not** add proxies to push harder (see RULES.md) |
| `node` is not recognized | Install Node.js LTS (step 1.3), then close and reopen PowerShell |
| Chinese names look garbled in Excel | Use **Data → From Text/CSV** and pick *UTF-8*, or open the file in Google Sheets |
| The command errors about a flag | The scraper is updated often. Check its README for the current `docker run` example |

Do **not** commit `results.csv` or `leads.csv` to Git. This repo's `lead-finder/.gitignore` already ignores them.
