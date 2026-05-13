'use strict';

const { AUCTION_URL, TARGET_TLDS, RAW_FILE } = require('../config');
const { launchBrowser, waitForTableReady } = require('./lib/browser');
const {
  applyTldFilter,
  clearFilters,
  ensureRowsPerPage,
  extractDomainsFromPage,
  hasNextPage,
  goToNextPage,
} = require('./lib/auction');
const { appendLines, loadSet } = require('./lib/writer');

async function run() {
  console.log('=== SAV.com Auction Scraper ===');
  console.log(`Target TLDs: ${TARGET_TLDS.join(', ')}`);
  console.log(`Output: ${RAW_FILE}\n`);

  // Load existing domains so we never write duplicates
  const existingDomains = loadSet(RAW_FILE);
  console.log(`Existing domains in file: ${existingDomains.size}`);

  const { browser, page } = await launchBrowser();

  try {
    console.log(`\nNavigating to ${AUCTION_URL} ...`);
    await page.goto(AUCTION_URL, { waitUntil: 'networkidle0', timeout: 45000 });
    await waitForTableReady(page);
    console.log('Page loaded and table ready.\n');

    let newTotal = 0;

    for (const tld of TARGET_TLDS) {
      console.log(`\n${'─'.repeat(50)}`);
      console.log(`Processing TLD: ${tld}`);
      console.log('─'.repeat(50));

      await clearFilters(page);
      await applyTldFilter(page, tld);
      await ensureRowsPerPage(page);

      const tldSuffix = '.' + tld; // e.g. ".sa.com"
      let pageNum = 1;
      let tldNew = 0;

      while (true) {
        // extractDomainsFromPage already filters by tldSuffix (layer 2).
        const domains = await extractDomainsFromPage(page, tldSuffix);

        if (domains.length === 0) {
          console.log(`  [${tld}] Page ${pageNum}: no domains — stopping`);
          break;
        }

        // Layer 3: final TLD guard + dedup against existing file
        const newDomains = domains.filter(
          (d) => d.endsWith(tldSuffix) && !existingDomains.has(d)
        );

        if (newDomains.length > 0) {
          appendLines(RAW_FILE, newDomains);
          newDomains.forEach((d) => existingDomains.add(d));
        }

        tldNew += newDomains.length;
        newTotal += newDomains.length;
        console.log(
          `  [${tld}] Page ${pageNum}: ${domains.length} scraped, ${newDomains.length} new (TLD new total: ${tldNew})`
        );

        const more = await hasNextPage(page);
        if (!more) {
          console.log(`  [${tld}] No more pages.`);
          break;
        }

        await goToNextPage(page);
        pageNum++;
      }

      console.log(`  [${tld}] Complete — ${tldNew} new domains added.`);
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Done. New domains added: ${newTotal}`);
    console.log(`Total unique domains in file: ${existingDomains.size}`);
    console.log(`File: ${RAW_FILE}`);

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Scraper error:', err.message);
  process.exit(1);
});
