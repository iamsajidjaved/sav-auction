'use strict';

const { TABLE_TIMEOUT_MS } = require('../../config');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Selectors (SAV.com v2 — update here if UI changes) ──────────────────────
const SEL = {
  filtersBtn:  'div[class*="DomainSearch_filtersDiv"]',
  tldInput:    'input[id="tld"]',
  domainLink:  'a[class*="Actives_domain-text"]',
  rowsPerPage: '[class*="PaginationServerSide_select-box-div"]',
  nextSpan:    'span[class*="PaginationServerSide_pagination-item"]:not([class*="active"])',
  activePage:  '[class*="PaginationServerSide_active-item"]',
};

// SAV.com v2 sends update_filters before loading filtered results
const UPDATE_FILTERS_API = 'bidder/update_filters';
const LIST_API = 'bidder/list/';

// ─── Filter panel helpers ─────────────────────────────────────────────────────

async function openFilterPanel(page) {
  const isOpen = await page.$(SEL.tldInput);
  if (isOpen) return;
  await page.click(SEL.filtersBtn);
  await page.waitForSelector(SEL.tldInput, { timeout: 8000 });
  await delay(300);
}

async function clickButtonByText(page, text) {
  await page.evaluate((btnText) => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find((b) => b.textContent.trim() === btnText);
    if (btn) btn.click();
  }, text);
}

// ─── Filter application ───────────────────────────────────────────────────────

async function applyTldFilter(page, tld) {
  console.log(`\n[filter] Applying TLD filter: ${tld}`);

  await openFilterPanel(page);

  // SAV.com v2 filter expects a leading dot: ".sa.com" not "sa.com"
  const filterSuffix = tld.startsWith('.') ? tld : '.' + tld;
  await page.click(SEL.tldInput, { clickCount: 3 });
  await page.type(SEL.tldInput, filterSuffix, { delay: 50 });
  await delay(300);

  // Step 1: wait for the server to acknowledge the filter change
  const filterAckPromise = page.waitForResponse(
    (res) => res.url().includes(UPDATE_FILTERS_API),
    { timeout: 10000 }
  );

  await clickButtonByText(page, 'Apply Filters');

  // Wait for the server acknowledgement (unique to filter changes, not background polls)
  await filterAckPromise.catch(() => null);

  // Step 2: wait for the filtered results to appear in the DOM
  await waitForFilteredContent(page, filterSuffix);

  console.log(`[filter] Filter applied: ${tld}`);
}

async function clearFilters(page) {
  await openFilterPanel(page);

  const currentVal = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.value.trim() : '';
  }, SEL.tldInput);

  if (!currentVal) return; // nothing to clear

  const filterAckPromise = page.waitForResponse(
    (res) => res.url().includes(UPDATE_FILTERS_API),
    { timeout: 10000 }
  );

  await clickButtonByText(page, 'Clear Filters');

  await filterAckPromise.catch(() => null);

  // After clearing, wait for any filtered state to be gone
  await delay(2000);
}

// ─── DOM-based content wait ───────────────────────────────────────────────────

// After a filter is applied, poll until EVERY visible domain link matches the
// expected TLD suffix. This is the only reliable signal that the filter has
// fully settled — a single mismatched domain means the table is still in
// transition. Give up after 25 s (genuinely 0 results or extremely slow load).
async function waitForFilteredContent(page, suffix) {
  const deadline = Date.now() + 25000;

  while (Date.now() < deadline) {
    const status = await page.evaluate((sel, expectedSuffix) => {
      const links = Array.from(document.querySelectorAll(sel));
      if (links.length === 0) return { count: 0, allMatch: false };
      const domains = links.map((a) => a.textContent.trim().split(/\s+/)[0]);
      const allMatch = domains.every((d) => d.endsWith(expectedSuffix));
      return { count: links.length, allMatch };
    }, SEL.domainLink, suffix);

    // Only proceed when every visible link belongs to the filtered TLD
    if (status.count > 0 && status.allMatch) return;
    await delay(500);
  }
  // Timeout: either 0 results for this TLD or load exceeded 25 s
}

// ─── Rows per page ────────────────────────────────────────────────────────────

async function ensureRowsPerPage(page) {
  const current = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim() : null;
  }, SEL.rowsPerPage);

  if (current === null || current === '100') return;

  await page.click(SEL.rowsPerPage);
  await delay(400);
  const set = await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll(
      '[class*="PaginationServerSide"] li, [class*="dropdown"] li, [class*="menu"] li'
    ));
    for (const opt of options) {
      if (opt.textContent.trim() === '100') { opt.click(); return true; }
    }
    return false;
  });
  if (set) {
    await page.waitForResponse(
      (res) => res.url().includes(LIST_API), { timeout: 10000 }
    ).catch(() => delay(3000));
    await delay(600);
  }
}

// ─── Domain extraction ────────────────────────────────────────────────────────

// tldSuffix (e.g. ".sa.com") is required — only domains ending with it are returned.
// This is the second layer of protection against wrong-TLD domains leaking through.
async function extractDomainsFromPage(page, tldSuffix) {
  return page.evaluate((sel, suffix) => {
    const anchors = document.querySelectorAll(sel);
    const domains = [];
    for (const a of anchors) {
      const text = (a.textContent || a.innerText || '').trim().split(/\s+/)[0];
      if (text && text.endsWith(suffix)) domains.push(text);
    }
    return [...new Set(domains)];
  }, SEL.domainLink, tldSuffix);
}

// ─── Pagination ───────────────────────────────────────────────────────────────

async function getCurrentPageNum(page) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? parseInt(el.textContent.trim(), 10) : 1;
  }, SEL.activePage);
}

async function hasNextPage(page) {
  return page.evaluate((sel) => {
    const spans = Array.from(document.querySelectorAll(sel));
    return spans.some((s) => s.textContent.trim() === 'Next');
  }, SEL.nextSpan);
}

async function goToNextPage(page) {
  // Capture the first domain on the current page so we can detect when it changes
  const currentFirstDomain = await page.evaluate((sel) => {
    const a = document.querySelector(sel);
    return a ? a.textContent.trim().split(/\s+/)[0] : '';
  }, SEL.domainLink);

  // Click the first "Next" span found
  await page.evaluate((sel) => {
    const spans = Array.from(document.querySelectorAll(sel));
    const next = spans.find((s) => s.textContent.trim() === 'Next');
    if (next) next.click();
  }, SEL.nextSpan);

  // Wait until the first visible domain changes (confirms new page data has rendered)
  // The active-page indicator updates before data arrives, so we watch the actual content.
  const deadline = Date.now() + TABLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const info = await page.evaluate((sel, prevFirst) => {
      const links = document.querySelectorAll(sel);
      if (links.length === 0) return { ready: false };
      const first = links[0].textContent.trim().split(/\s+/)[0];
      return { ready: first !== prevFirst, first };
    }, SEL.domainLink, currentFirstDomain);

    if (info.ready) {
      await delay(400); // small buffer for any remaining links to render
      return;
    }
    await delay(300);
  }
}

module.exports = {
  applyTldFilter,
  clearFilters,
  ensureRowsPerPage,
  extractDomainsFromPage,
  hasNextPage,
  goToNextPage,
};
