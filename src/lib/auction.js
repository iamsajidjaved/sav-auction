'use strict';

const { TABLE_TIMEOUT_MS } = require('../../config');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Selectors (SAV.com v2 — update here if UI changes) ──────────────────────
const SEL = {
  filtersBtn:   '[class*="DomainSearch_filtersDiv"]',
  tldInput:     '#tld',
  applyBtn:     'button[class*="BuyerAuctionSearchComp_filter-footer-button"]',
  clearBtn:     'button[class*="BuyerAuctionSearchComp_filter-footer-bu"]',
  domainLink:   'a[class*="Actives_domain-text"]',
  // Pagination "Next" span
  nextSpan:     'span[class*="PaginationServerSide_pagination-item"]:not([class*="active"])',
  rowsPerPage:  '[class*="PaginationServerSide_select-box-div"]',
};

// ─── Filter ───────────────────────────────────────────────────────────────────

async function openFilterPanel(page) {
  const isOpen = await page.$('#tld');
  if (isOpen) return; // already open
  await page.click(SEL.filtersBtn);
  await page.waitForSelector('#tld', { timeout: 8000 });
  await delay(300);
}

async function applyTldFilter(page, tld) {
  console.log(`\n[filter] Applying TLD filter: ${tld}`);

  await openFilterPanel(page);

  // SAV.com v2 filter expects a leading dot: ".sa.com" not "sa.com"
  const filterValue = tld.startsWith('.') ? tld : '.' + tld;
  const tldInput = await page.$('#tld');
  await tldInput.click({ clickCount: 3 });
  await tldInput.type(filterValue, { delay: 50 });
  await delay(300);

  // Click "Apply Filters" button
  await page.click(SEL.applyBtn);
  await waitForTableReload(page);
  console.log(`[filter] Filter applied: ${tld}`);
}

async function clearFilters(page) {
  await openFilterPanel(page);
  const clearBtn = await page.$(SEL.clearBtn);
  if (clearBtn) {
    await clearBtn.click();
    await waitForTableReload(page);
  }
}

// ─── Rows per page ────────────────────────────────────────────────────────────

async function ensureRowsPerPage(page) {
  // SAV.com v2 defaults to 100 rows already — verify and set if needed
  const current = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim() : null;
  }, SEL.rowsPerPage);

  // null = no pagination rendered (0 results) or already 100
  if (current === null || current === '100') return;

  // Click the rows-per-page control to open dropdown
  await page.click(SEL.rowsPerPage);
  await delay(400);

  // Click the "100" option
  const set = await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('[class*="PaginationServerSide"] li, [class*="dropdown"] li, [class*="menu"] li'));
    for (const opt of options) {
      if (opt.textContent.trim() === '100') {
        opt.click();
        return true;
      }
    }
    return false;
  });

  if (set) await waitForTableReload(page);
}

// ─── Domain extraction ────────────────────────────────────────────────────────

async function extractDomainsFromPage(page) {
  return page.evaluate((sel) => {
    const anchors = document.querySelectorAll(sel);
    const domains = [];
    for (const a of anchors) {
      const text = (a.textContent || a.innerText || '').trim().split(/\s+/)[0];
      if (text && text.includes('.')) domains.push(text);
    }
    return [...new Set(domains)];
  }, SEL.domainLink);
}

// ─── Pagination ───────────────────────────────────────────────────────────────

async function hasNextPage(page) {
  return page.evaluate((nextSel) => {
    const spans = Array.from(document.querySelectorAll(nextSel));
    const nextSpan = spans.find((s) => s.textContent.trim() === 'Next');
    return !!nextSpan;
  }, SEL.nextSpan);
}

async function goToNextPage(page) {
  await page.evaluate((nextSel) => {
    const spans = Array.from(document.querySelectorAll(nextSel));
    const nextSpan = spans.find((s) => s.textContent.trim() === 'Next');
    if (nextSpan) nextSpan.click();
  }, SEL.nextSpan);
  await waitForTableReload(page);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function waitForTableReload(page) {
  // SAV.com v2 has continuous background activity — networkidle never settles.
  // Instead, poll until the domain link count is stable for 1 second.
  const DOMAIN_LINK = 'a[class*="Actives_domain-text"]';
  const deadline = Date.now() + TABLE_TIMEOUT_MS;
  let prev = -1;
  let stableFor = 0;

  while (Date.now() < deadline) {
    const count = await page.evaluate(
      (sel) => document.querySelectorAll(sel).length, DOMAIN_LINK
    );
    if (count === prev) {
      stableFor += 400;
      if (stableFor >= 1000) return;
    } else {
      stableFor = 0;
      prev = count;
    }
    await delay(400);
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
