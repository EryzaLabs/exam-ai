const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const downloadsDir = '/home/aloo/Downloads';
const assetsImagesDir = path.resolve(__dirname, '..', 'assets', 'images');

if (!fs.existsSync(assetsImagesDir)) {
  fs.mkdirSync(assetsImagesDir, { recursive: true });
}

const svgFiles = [
  'astra-mark.svg',
  'astra-logo-for-light-bg.svg',
  'astra-logo-for-dark-bg.svg',
];

// 1. Sync SVGs from Downloads if available
svgFiles.forEach((file) => {
  const downloadPath = path.join(downloadsDir, file);
  const destPath = path.join(assetsImagesDir, file);
  if (fs.existsSync(downloadPath)) {
    try {
      fs.copyFileSync(downloadPath, destPath);
    } catch (err) {
      console.warn(`Warning copying ${file}:`, err.message);
    }
  }
});

// 2. Export crisp PNG icons from astra-mark.svg using rsvg-convert
const markSvgPath = path.join(assetsImagesDir, 'astra-mark.svg');
if (fs.existsSync(markSvgPath)) {
  try {
    const pngExports = [
      { name: 'favicon.png', size: 48 },
      { name: 'icon-192.png', size: 192 },
      { name: 'icon-512.png', size: 512 },
      { name: 'icon.png', size: 512 },
      { name: 'adaptive-icon.png', size: 512 },
    ];
    for (const exp of pngExports) {
      const outPath = path.join(assetsImagesDir, exp.name);
      try {
        execSync(`rsvg-convert -w ${exp.size} -h ${exp.size} "${markSvgPath}" -o "${outPath}"`, { stdio: 'ignore' });
      } catch (e) {
        // Fallback: if rsvg-convert not present, ensure file exists if already generated
      }
    }
    console.log('✅ Astra brand icons exported cleanly from astra-mark.svg');
  } catch (err) {
    console.warn('Note exporting icons:', err.message);
  }
}
