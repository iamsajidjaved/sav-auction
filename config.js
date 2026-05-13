'use strict';

module.exports = {
  AUCTION_URL: 'https://v2.sav.com/domains/auctions',

  TARGET_TLDS: ['sa.com', 'za.com', 'ru.com', 'in.net'],

  ROWS_PER_PAGE: 100,

  RAW_FILE: 'data/raw-domains.txt',
  AVAILABLE_FILE: 'data/available-domains.txt',

  // Delay between WHOIS queries to avoid rate limiting
  WHOIS_DELAY_MS: parseInt(process.env.WHOIS_DELAY_MS || '1500', 10),

  NAV_TIMEOUT_MS: 30000,
  TABLE_TIMEOUT_MS: 15000,

  // Set HEADLESS=true in env to run without a visible browser window
  HEADLESS: process.env.HEADLESS === 'true',

  // Selectors for SAV.com v2 — update here if the UI changes
  SELECTORS: {
    // TLD filter: the search/input within the extension filter panel
    tldFilterInput: 'input[placeholder*="extension" i], input[placeholder*="tld" i], input[placeholder*="filter" i]',
    tldFilterPanel: '[class*="filter" i][class*="extension" i], [data-testid*="extension"], [aria-label*="extension" i]',
    tldCheckboxLabel: (tld) => `label:has(input[value="${tld}"]), label[title="${tld}"]`,

    // Rows per page control
    rowsPerPageSelect: 'select[class*="pagesize" i], select[class*="per-page" i], select[name*="pagesize" i], [aria-label*="rows per page" i]',

    // Table rows
    domainTableRow: 'table tbody tr, [class*="domain-list" i] [class*="row" i]',
    domainCell: 'td:first-child a, td[class*="domain" i] a, [class*="domain-name" i]',

    // Pagination
    nextPageBtn: 'button[aria-label*="next" i], a[aria-label*="next" i], [class*="pagination" i] button:last-child, [class*="next" i]:not([disabled])',
    disabledNextBtn: 'button[aria-label*="next" i][disabled], [class*="next" i][disabled], [class*="next" i][class*="disabled" i]',
  },
};
