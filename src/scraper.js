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
const { clearFile, appendLines } = require('./lib/writer');

async function run() {
  console.log('=== SAV.com Auction Scraper ===');
  console.log(`Target TLDs: ${TARGET_TLDS.join(', ')}`);
  console.log(`Output: ${RAW_FILE}\n`);

  clearFile(RAW_FILE);

  const { browser, page } = await launchBrowser();

  try {
    console.log(`Navigating to ${AUCTION_URL} ...`);
    await page.goto(AUCTION_URL, { waitUntil: 'networkidle0', timeout: 45000 });
    await waitForTableReady(page);
    console.log('Page loaded and table ready.\n');

    let grandTotal = 0;

    for (const tld of TARGET_TLDS) {
      console.log(`\n${'─'.repeat(50)}`);
      console.log(`Processing TLD: ${tld}`);
      console.log('─'.repeat(50));

      await clearFilters(page);
      await applyTldFilter(page, tld);
      await ensureRowsPerPage(page);

      let pageNum = 1;
      let tldTotal = 0;

      while (true) {
        const domains = await extractDomainsFromPage(page);

        if (domains.length === 0) {
          console.log(`  [${tld}] Page ${pageNum}: no domains — stopping`);
          break;
        }

        appendLines(RAW_FILE, domains);
        tldTotal += domains.length;
        grandTotal += domains.length;
        console.log(`  [${tld}] Page ${pageNum}: ${domains.length} domains (TLD total: ${tldTotal})`);

        const more = await hasNextPage(page);
        if (!more) {
          console.log(`  [${tld}] No more pages.`);
          break;
        }

        await goToNextPage(page);
        pageNum++;
      }

      console.log(`  [${tld}] Complete — ${tldTotal} domains.`);
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Scraping complete. Total domains: ${grandTotal}`);
    console.log(`Saved to: ${RAW_FILE}`);

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Scraper error:', err.message);
  process.exit(1);
});
