# Sub-Agent Definitions — SAV Auction Scraper

## scrape-agent
**Role:** Runs `npm run scrape` and monitors `data/raw-domains.txt` for growth.
**Trigger:** Manual or scheduled (e.g., daily cron via pm2-cron).
**Success condition:** Script exits 0 and `raw-domains.txt` is non-empty.
**Failure action:** Capture stderr, report selector mismatch, alert operator.

## check-agent
**Role:** Runs `npm run check` after scrape-agent completes.
**Trigger:** Completion of scrape-agent or manual invocation.
**Input:** `data/raw-domains.txt`
**Output:** `data/available-domains.txt`
**Success condition:** Script exits 0; at least one domain checked.

## selector-update-agent (future)
**Role:** When SAV.com v2 redesigns, this agent visits the page, inspects the DOM,
and proposes updated selectors for `config.js → SELECTORS`.
**Tools needed:** Puppeteer screenshot + DOM dump, diff against old selectors.

## report-agent (future)
**Role:** After check-agent finishes, formats `available-domains.txt` into a
structured report (CSV / email / Slack message) with domain age, auction price, etc.
