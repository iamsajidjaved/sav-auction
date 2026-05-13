# Architecture — SAV Auction Scraper

## Technology Choices

### Puppeteer (not Playwright)
- Explicit user requirement
- Bundles its own Chromium — no separate browser install
- Mature API for headful automation

### whoiser (not whois npm / raw sockets)
- Supports CentralNIC TLDs (sa.com, za.com, ru.com) out of the box
- Auto-routes queries to the correct WHOIS server per TLD
- Returns structured JSON alongside raw text
- No API key, no rate limit by the package itself

### Two separate commands (not one pipeline)
- Scraping can take a long time; availability checking is separate concern
- Allows re-running just the checker after fixing WHOIS logic
- Makes partial runs recoverable

## Data Flow

```
SAV.com v2 Auctions page
        │
        │ Puppeteer
        ▼
  [Filter by TLD]
  [Set 100 rows/page]
  [Paginate all pages]
        │
        │ extractDomainsFromPage()
        ▼
  raw-domains.txt  ←── appendLines() (real-time, per page)
        │
        │ readline stream
        ▼
  [WHOIS query per domain]
        │
        │ checkAvailability()
        ▼
  available-domains.txt  ←── appendLines() (real-time, per hit)
```

## Selector Strategy
All CSS selectors are isolated in `config.js → SELECTORS`. `auction.js` uses a
multi-strategy fallback:
1. Semantic attributes (`data-testid`, `aria-label`, checkbox `value`)
2. Text content matching (label text = TLD name)
3. Structural CSS (`.filter-sidebar input[type=checkbox]`)
4. URL parameter fallback (`?extension=sa.com`)

This ensures the scraper degrades gracefully when SAV.com updates its markup.

## CentralNIC WHOIS
Domains like `example.sa.com`, `example.za.com`, `example.ru.com` are second-level
domains managed by CentralNIC. Their WHOIS server is `whois.centralnic.com`.
`whoiser` detects this automatically from the TLD tree.

`in.net` domains are under the standard .net WHOIS infrastructure.

## Rate Limiting
WHOIS providers block IPs that query too frequently. The 1500ms delay is conservative.
For large domain lists (10k+) consider raising to 2000ms or running in batches overnight.
