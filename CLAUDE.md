# SAV Auction Scraper — Claude AI Guide

## What this project does
Scrapes expiring domains from https://v2.sav.com/domains/auctions filtered by specific TLD extensions,
then checks each domain's availability via WHOIS. Two separate CLI commands.

## Commands
```bash
npm run scrape   # Scrape domains → data/raw-domains.txt
npm run check    # Check availability → data/available-domains.txt
```

## File layout
```
config.js           ← All tunable settings (URL, TLDs, delays, selectors)
src/scraper.js      ← Scraping entry point
src/checker.js      ← Availability check entry point
src/lib/browser.js  ← Puppeteer launch (headful by default)
src/lib/auction.js  ← SAV.com UI interaction (filter, paginate, extract)
src/lib/whois.js    ← WHOIS availability detection
src/lib/writer.js   ← Real-time file append
data/               ← Generated output files (git-ignored)
docs/               ← Specification and architecture docs
```

## Updating selectors
If SAV.com redesigns their UI, update `SELECTORS` in `config.js` — no other file needs to change.

## Target TLDs
`sa.com`, `za.com`, `ru.com`, `in.net` — all CentralNIC-managed second-level domains.

## Key behaviors
- Browser runs **headful** (visible) by default. Set `HEADLESS=true` in env to suppress.
- Domains are written to `raw-domains.txt` **in real time** as each page is scraped.
- Available domains are appended to `available-domains.txt` **immediately** when found.
- WHOIS queries are rate-limited (default 1500ms delay) to avoid blocks.

## Common tasks
- Add a new TLD: add it to `TARGET_TLDS` array in `config.js`
- Speed up WHOIS: lower `WHOIS_DELAY_MS` (risk: rate limiting)
- Debug WHOIS responses: `DEBUG=1 npm run check`
