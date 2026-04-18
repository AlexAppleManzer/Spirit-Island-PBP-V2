// Merges per-board landBounds.json files into frontend/public/boardHitboxes.json.
// Run after findContours.py has been executed for each board nickname.
// Usage: node tools/combineHitboxes.mjs

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const boardsDataPath = path.join(root, 'frontend', 'src', 'data', 'boards.ts');
const outputPath = path.join(root, 'frontend', 'public', 'boardHitboxes.json');

// Extract nicknames from the generated boards.ts (quick regex parse, no TS compiler needed)
const boardsTs = fs.readFileSync(boardsDataPath, 'utf-8');
const nicknames = [...boardsTs.matchAll(/"?nickname"?:\s*"([^"]+)"/g)].map(m => m[1]);

if (nicknames.length === 0) {
  console.error('[ERR] No board nicknames found in boards.ts — run extractBoardData.mjs first');
  process.exit(1);
}

const combined = {};
let missing = 0;

for (const nickname of nicknames) {
  const jsonPath = path.join(root, 'Assets', 'Boards', `Board ${nickname}`, 'landBounds.json');
  if (!fs.existsSync(jsonPath)) {
    console.warn(`[SKIP] Missing: ${jsonPath}`);
    missing++;
    continue;
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  combined[nickname] = {
    stageDimensions: data.stageDimensions,
    lands: data.lands,
  };
  console.log(`[OK] Board ${nickname}: ${Object.keys(data.lands).length} lands`);
}

fs.writeFileSync(outputPath, JSON.stringify(combined, null, 2), 'utf-8');
console.log(`\n[OK] Wrote boardHitboxes.json with ${Object.keys(combined).length} boards (${missing} skipped)`);
if (missing > 0) {
  console.log(`     Run: python tools/findContours.py <nickname>  for each missing board`);
}
