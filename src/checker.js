'use strict';

const fs = require('fs');
const readline = require('readline');
const { RAW_FILE, AVAILABLE_FILE, WHOIS_DELAY_MS } = require('../config');
const { checkAvailability } = require('./lib/whois');
const { clearFile, appendLines } = require('./lib/writer');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('=== Domain Availability Checker ===');
  console.log(`Input:  ${RAW_FILE}`);
  console.log(`Output: ${AVAILABLE_FILE}\n`);

  if (!fs.existsSync(RAW_FILE)) {
    console.error(`Error: ${RAW_FILE} not found. Run "npm run scrape" first.`);
    process.exit(1);
  }

  const totalLines = fs.readFileSync(RAW_FILE, 'utf8').split('\n').filter(Boolean).length;
  console.log(`Checking ${totalLines} domains (${WHOIS_DELAY_MS}ms delay between queries)...\n`);

  clearFile(AVAILABLE_FILE);

  const rl = readline.createInterface({
    input: fs.createReadStream(RAW_FILE),
    crlfDelay: Infinity,
  });

  let checked = 0;
  let available = 0;

  for await (const line of rl) {
    const domain = line.trim();
    if (!domain) continue;

    checked++;
    const pct = ((checked / totalLines) * 100).toFixed(1);
    process.stdout.write(`[${checked}/${totalLines} ${pct}%] Checking ${domain} ... `);

    const isAvailable = await checkAvailability(domain);

    if (isAvailable) {
      available++;
      console.log('AVAILABLE');
      appendLines(AVAILABLE_FILE, [domain]);
    } else {
      console.log('taken');
    }

    await delay(WHOIS_DELAY_MS);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Done. Checked: ${checked} | Available: ${available}`);
  console.log(`Available domains saved to: ${AVAILABLE_FILE}`);
}

run().catch((err) => {
  console.error('Checker error:', err.message);
  process.exit(1);
});
