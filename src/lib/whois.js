'use strict';

const whoiser = require('whoiser');

// CentralNIC manages sa.com, za.com, ru.com, in.net registrations
const CENTRALNIC_EXTENSIONS = ['sa.com', 'za.com', 'ru.com', 'in.net'];

// Patterns that indicate a domain is NOT registered
const AVAILABLE_SIGNALS = [
  /not\s+found/i,
  /no\s+match/i,
  /no\s+entries\s+found/i,
  /object\s+does\s+not\s+exist/i,
  /domain\s+not\s+found/i,
  /is\s+available/i,
  /status:\s*free/i,
  /no\s+data\s+found/i,
  /whois\s+error.*no\s+match/i,
];

function isAvailableFromText(text) {
  if (!text || typeof text !== 'string') return false;
  return AVAILABLE_SIGNALS.some((re) => re.test(text));
}

function getCentralNicExtension(domain) {
  const lower = domain.toLowerCase();
  return CENTRALNIC_EXTENSIONS.find((ext) => lower.endsWith('.' + ext));
}

function extractText(data) {
  if (typeof data === 'string') return data;
  if (typeof data !== 'object' || data === null) return '';
  if (typeof data.text === 'string') return data.text;
  if (Array.isArray(data.text)) return data.text.join('\n');
  if (typeof data.raw === 'string') return data.raw;
  // Whois Error field (PublicDomainRegistry style)
  if (typeof data['Whois Error'] === 'string') return data['Whois Error'];
  return '';
}

function parseWhoiserResult(result) {
  for (const server of Object.keys(result)) {
    const data = result[server];
    const rawText = extractText(data);

    if (rawText && isAvailableFromText(rawText)) return true;

    if (typeof data === 'object' && data !== null) {
      // Has active RDAP status → taken
      if (Array.isArray(data.status) && data.status.length > 0) {
        const statusStr = data.status.join(' ').toLowerCase();
        if (statusStr.includes('active') || statusStr.includes('ok')) return false;
        if (statusStr.includes('free') || statusStr.includes('available')) return true;
      }

      // Has a registrar field → taken
      const registrar = data.registrar || data['Registrar'];
      if (registrar && String(registrar).trim()) return false;
    }
  }
  return false;
}

async function checkAvailability(domain) {
  try {
    const isCentralNic = getCentralNicExtension(domain);
    const opts = { timeout: 10000 };
    if (isCentralNic) opts.host = 'whois.centralnic.com';

    const result = await whoiser(domain, opts);
    return parseWhoiserResult(result);
  } catch (err) {
    if (process.env.DEBUG) console.error(`  WHOIS error for ${domain}: ${err.message}`);
    return false;
  }
}

module.exports = { checkAvailability };
