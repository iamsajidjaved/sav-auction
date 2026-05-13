'use strict';

const fs = require('fs');
const readline = require('readline');
const { RAW_FILE, AVAILABLE_FILE, CHECKED_FILE, WHOIS_DELAY_MS } = require('../config');
const { checkAvailability } = require('./lib/whois');
const { appendLines, loadSet } = require('./lib/writer');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('=== Domain Availability Checker ===');
  console.log(`Input:   ${RAW_FILE}`);
  console.log(`Checked: ${CHECKED_FILE}`);
  console.log(`Output:  ${AVAILABLE_FILE}\n`);

  if (!fs.existsSync(RAW_FILE)) {
    console.error(`Error: ${RAW_FILE} not found. Run "npm run scrape" first.`);
    process.exit(1);
  }

  // Load tracking sets
  const checkedDomains = loadSet(CHECKED_FILE);
  const availableDomains = loadSet(AVAILABLE_FILE);

  const allDomains = fs.readFileSync(RAW_FILE, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  const pending = allDomains.filter((d) => !checkedDomains.has(d));

  console.log(`Total domains in file : ${allDomains.length}`);
  console.log(`Already checked       : ${checkedDomains.size}`);
  console.log(`Pending this run      : ${pending.length}`);

  if (pending.length === 0) {
    console.log('\nAll domains have already been checked. Nothing to do.');
    console.log('Run "npm run scrape" first to discover new domains.');
    return;
  }

  console.log(`\nChecking ${pending.length} domains (${WHOIS_DELAY_MS}ms delay between queries)...\n`);

  let checked = 0;
  let newAvailable = 0;

  for (const domain of pending) {
    checked++;
    const pct = ((checked / pending.length) * 100).toFixed(1);
    process.stdout.write(`[${checked}/${pending.length} ${pct}%] Checking ${domain} ... `);

    const isAvailable = await checkAvailability(domain);

    // Record as checked regardless of result
    appendLines(CHECKED_FILE, [domain]);
    checkedDomains.add(domain);

    if (isAvailable) {
      console.log('AVAILABLE');
      if (!availableDomains.has(domain)) {
        appendLines(AVAILABLE_FILE, [domain]);
        availableDomains.add(domain);
        newAvailable++;
      }
    } else {
      console.log('taken');
    }

    if (checked < pending.length) await delay(WHOIS_DELAY_MS);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Done. Checked this run : ${checked}`);
  console.log(`New available found    : ${newAvailable}`);
  console.log(`Total available        : ${availableDomains.size}`);
  console.log(`Available domains      : ${AVAILABLE_FILE}`);
}

run().catch((err) => {
  console.error('Checker error:', err.message);
  process.exit(1);
});
