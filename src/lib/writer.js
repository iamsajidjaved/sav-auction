'use strict';

const fs = require('fs');
const path = require('path');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function clearFile(filePath) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, '', 'utf8');
}

// Appends lines immediately to disk — no buffering
function appendLines(filePath, lines) {
  if (!lines || lines.length === 0) return;
  ensureDir(filePath);
  const content = lines.join('\n') + '\n';
  fs.appendFileSync(filePath, content, 'utf8');
}

module.exports = { clearFile, appendLines };
