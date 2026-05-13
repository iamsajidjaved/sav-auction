'use strict';

const puppeteer = require('puppeteer');
const { HEADLESS, NAV_TIMEOUT_MS } = require('../../config');

async function launchBrowser() {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    defaultViewport: { width: 1280, height: 900 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(NAV_TIMEOUT_MS);

  // Mask automation signals
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  return { browser, page };
}

// Wait for the domain table to have rendered its first rows
async function waitForTableReady(page) {
  await page.waitForSelector('a[class*="Actives_domain-text"]', { timeout: 25000 });
}

module.exports = { launchBrowser, waitForTableReady };
