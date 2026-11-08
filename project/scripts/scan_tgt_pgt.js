const fs = require('fs');
const path = require('path');

function findTgtPgtDir() {
  const downloads = '/home/aloo/Downloads';
  if (!fs.existsSync(downloads)) return null;

  const entries = fs.readdirSync(downloads);
  for (const entry of entries) {
    if (entry.toUpperCase().includes('TGT') && fs.statSync(path.join(downloads, entry)).isDirectory()) {
      return path.join(downloads, entry);
    }
  }
  return null;
}

function scanDir(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(scanDir(full, baseDir));
    } else {
      results.push({
        name: file,
        path: full,
        ext: path.extname(file).toLowerCase(),
        sizeKb: Math.round(stat.size / 1024),
        relPath: path.relative(baseDir, full)
      });
    }
  }
  return results;
}

function run() {
  const targetDir = findTgtPgtDir();
  if (!targetDir) {
    console.log('⚠️ Could not locate TGT/PGT folder in /home/aloo/Downloads');
    return;
  }
  console.log('📂 Found TGT/PGT directory:', targetDir);
  const files = scanDir(targetDir);
  console.log(`📊 Found ${files.length} total files.`);

  const outPath = path.resolve(__dirname, '..', 'data', 'tgt_pgt_inventory.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ targetDir, count: files.length, files }, null, 2));
  console.log('✅ Inventory written to:', outPath);
}

if (require.main === module) {
  run();
}

module.exports = { findTgtPgtDir, scanDir, run };
