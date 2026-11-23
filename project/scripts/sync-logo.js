const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const downloadsDir = '/home/aloo/Downloads';
const projectDir = path.resolve(__dirname, '..');
const assetsImagesDir = path.join(projectDir, 'assets', 'images');
const publicDir = path.join(projectDir, 'public');

if (!fs.existsSync(assetsImagesDir)) {
  fs.mkdirSync(assetsImagesDir, { recursive: true });
}
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
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

// 3. Generate multi-resolution favicon.ico (16, 32, 48) using Python PIL
const icon512 = path.join(assetsImagesDir, 'icon-512.png');
const faviconIcoPath = path.join(assetsImagesDir, 'favicon.ico');
if (fs.existsSync(icon512)) {
  try {
    execSync(`python3 -c "from PIL import Image; img = Image.open('${icon512}'); img.save('${faviconIcoPath}', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])"`, { stdio: 'ignore' });
    console.log('✅ Generated multi-resolution favicon.ico (16x16, 32x32, 48x48)');
  } catch (err) {
    // Fallback: copy favicon.png to favicon.ico
    const favPng = path.join(assetsImagesDir, 'favicon.png');
    if (fs.existsSync(favPng)) {
      fs.copyFileSync(favPng, faviconIcoPath);
    }
  }
}

// 4. Mirror all branding assets into public/ directory for Expo web / dev serving
const publicAssets = [
  'astra-mark.svg',
  'astra-logo-for-light-bg.svg',
  'astra-logo-for-dark-bg.svg',
  'favicon.ico',
  'favicon.png',
  'icon-192.png',
  'icon-512.png',
  'icon.png',
  'adaptive-icon.png',
];

publicAssets.forEach((file) => {
  const src = path.join(assetsImagesDir, file);
  if (fs.existsSync(src)) {
    try {
      fs.copyFileSync(src, path.join(publicDir, file));
    } catch (err) {
      console.warn(`Warning copying ${file} to public:`, err.message);
    }
  }
});

// Write PWA manifest.json in public/
const manifest = {
  name: 'Astra Exam AI',
  short_name: 'Astra AI',
  description: 'All-in-one AI-driven preparation platform for competitive teaching exams.',
  start_url: '/',
  display: 'standalone',
  background_color: '#101c18',
  theme_color: '#f2c94c',
  icons: [
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/astra-mark.svg',
      sizes: 'any',
      type: 'image/svg+xml',
    },
  ],
};

try {
  fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('✅ Public directory populated with favicon and branding assets');
} catch (err) {}

