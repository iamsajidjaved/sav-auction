# Functional Specification — SAV Auction Scraper

## Overview
A Node.js CLI tool that automates domain discovery from the SAV.com v2 auction platform
and checks the availability of discovered domains for registration.

## Target Platform
- URL: https://v2.sav.com/domains/auctions
- Authentication: Not required
- Browser: Headful Chromium via Puppeteer

## TLD Filters
The scraper processes the following extensions **sequentially**, one at a time:
1. `sa.com`
2. `za.com`
3. `ru.com`
4. `in.net`

## Scraping Behavior
| Setting            | Value            |
|--------------------|------------------|
| Rows per page      | 100              |
| Pagination         | Automatic (all pages) |
| Domain column      | "Domain" column in auction table |
| Real-time output   | Yes — appended as each page is scraped |

## Output Files
| File                       | Contents                                         |
|----------------------------|--------------------------------------------------|
| `data/raw-domains.txt`     | All scraped domain names, one per line           |
| `data/available-domains.txt` | Subset: domains where WHOIS shows unregistered |

## Availability Checking
- Tool: `whoiser` npm package (free, no API key)
- WHOIS servers targeted: `whois.centralnic.com` (sa.com, za.com, ru.com), standard (.in.net)
- Rate limiting: 1500ms delay between queries (configurable)
- Availability signals:
  - Response contains "NOT FOUND", "No match for", "No entries found"
  - No registrar field present in WHOIS data
  - `status: FREE` in structured response

## Commands
```bash
npm run scrape   # Phase 1: scrape domains
npm run check    # Phase 2: check availability
```

## Error Handling
- WHOIS timeout/error → domain marked as unknown (not appended to available list)
- Table yields 0 domains on a page → pagination stops for that TLD
- Navigation timeout → script exits with error message

## Configuration
All tunables live in `config.js`. No code changes needed for common adjustments.
