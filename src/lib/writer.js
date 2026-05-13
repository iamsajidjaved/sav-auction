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

// Loads a file into a Set of non-empty trimmed lines
function loadSet(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  return new Set(
    fs.readFileSync(filePath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)
  );
}

module.exports = { clearFile, appendLines, loadSet };
