# SAV Auction Domain Scraper

Puppeteer-based tool that scrapes expiring domains from the [SAV.com v2 auction platform](https://v2.sav.com/domains/auctions) filtered by specific TLD extensions, then checks each domain's WHOIS availability in real time.

## Commands

```bash
npm run scrape   # Scrape domains → data/raw-domains.txt
npm run check    # Check availability → data/available-domains.txt
```

## Setup

```bash
npm install
```

No API keys or accounts required. The auction page is publicly accessible.

## How it works

### Scraping (`npm run scrape`)

1. Opens a browser and navigates to the SAV.com v2 auction page
2. Applies each TLD filter one by one: `sa.com`, `za.com`, `ru.com`, `in.net`
3. Paginates through all result pages (100 rows per page)
4. Extracts domain names from the Domain column
5. Appends each page's domains to `data/raw-domains.txt` in real time

### Availability check (`npm run check`)

1. Reads `data/raw-domains.txt` line by line
2. Runs a WHOIS query for each domain via `whois.centralnic.com` (the registry for all four TLD extensions)
3. Appends available domains to `data/available-domains.txt` immediately when found
4. Applies a 1500ms delay between queries to avoid rate limiting

## Output files

| File | Description |
|------|-------------|
| `data/raw-domains.txt` | All scraped domains, one per line |
| `data/available-domains.txt` | Domains confirmed available for registration |

Both files are written in real time — you don't need to wait for the full run to finish.

## Configuration

All settings are in `config.js`:

| Setting | Default | Description |
|---------|---------|-------------|
| `AUCTION_URL` | `https://v2.sav.com/domains/auctions` | Auction page URL |
| `TARGET_TLDS` | `['sa.com', 'za.com', 'ru.com', 'in.net']` | TLD filters to apply |
| `ROWS_PER_PAGE` | `100` | Rows per page (SAV.com default) |
| `WHOIS_DELAY_MS` | `1500` | Delay between WHOIS queries |
| `HEADLESS` | `false` | Set `HEADLESS=true` to hide the browser |

Override any setting via environment variable:

```bash
HEADLESS=true npm run scrape
WHOIS_DELAY_MS=2000 npm run check
```

## Adding TLDs

Add any extension to `TARGET_TLDS` in `config.js`:

```js
TARGET_TLDS: ['sa.com', 'za.com', 'ru.com', 'in.net', 'uk.com'],
```

## Project structure

```
src/
  scraper.js        ← scraping entry point
  checker.js        ← availability check entry point
  lib/
    browser.js      ← Puppeteer launch
    auction.js      ← SAV.com UI interaction (filter, paginate, extract)
    whois.js        ← CentralNIC WHOIS availability detection
    writer.js       ← real-time file append
config.js           ← all settings and selectors
data/               ← output files (git-ignored)
docs/               ← specification and architecture docs
```

## Notes

- The browser window is visible by default so you can monitor progress
- WHOIS checks for all four TLDs route to `whois.centralnic.com` (their registry)
- A domain marked "available" means it is not currently registered — cross-check at a registrar before purchasing
- Checking 1,000+ domains takes ~30 minutes at the default delay
