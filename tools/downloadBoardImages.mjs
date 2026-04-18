// Downloads board images from Steam CDN URLs into Assets/Boards/Board {X}.png
// Usage: node tools/downloadBoardImages.mjs

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const root = path.resolve(process.cwd());

const BOARDS = [
  { nickname: 'A', imageUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2308721072245056835/6AD4A0AD972B5E1E9F068D15564B26CAB74316A5/' },
  { nickname: 'B', imageUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2308721072245059248/465BF72B0A091AFFD64731757DBB55430D574CA0/' },
  { nickname: 'C', imageUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2308721072245060182/C5A69D9CCC2E748DD080FA36226E67F3DBCADC0A/' },
  { nickname: 'D', imageUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2308721072245061067/615CED9200F4FC7C2C26F9277C5DDCA686D81C76/' },
  { nickname: 'E', imageUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2308724646351482563/1AF09B04F6AA49054DE727A9EA520DDFAE6D7A8C/' },
  { nickname: 'F', imageUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2308724646351483058/B65590E968306B338219BE350D4F1548D353FDC6/' },
  { nickname: 'G', imageUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2308721072245064321/45B703C37F42B0A3F9BFE48985F463335A2F97A2/' },
  { nickname: 'H', imageUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2308721072245065090/10EA39780A41780BC36D19AD5EAAA0D11B04E194/' },
];

const outDir = path.join(root, 'Assets', 'Boards');
fs.mkdirSync(outDir, { recursive: true });

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = (reqUrl) => {
      https.get(reqUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.destroy();
          fs.unlinkSync(destPath);
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          file.destroy();
          fs.unlinkSync(destPath);
          reject(new Error(`HTTP ${res.statusCode} for ${reqUrl}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', reject);
    };
    request(url);
  });
}

for (const board of BOARDS) {
  const destPath = path.join(outDir, `Board ${board.nickname}.png`);
  if (fs.existsSync(destPath)) {
    console.log(`[SKIP] Board ${board.nickname} already exists`);
    continue;
  }
  process.stdout.write(`[...] Downloading Board ${board.nickname}...`);
  try {
    await download(board.imageUrl, destPath);
    const size = fs.statSync(destPath).size;
    console.log(` done (${(size / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.log(` FAILED: ${err.message}`);
  }
}

console.log('\nDone. Run: node tools/combineHitboxes.mjs after running findContours.py for each board.');
