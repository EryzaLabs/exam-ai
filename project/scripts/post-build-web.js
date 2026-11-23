const fs = require('fs');
const path = require('path');

// 1. Ensure logo sync runs first
try {
  require('./sync-logo.js');
} catch (err) {
  console.warn('⚠️ Warning in sync-logo:', err.message);
}

const distDir = path.resolve(__dirname, '..', 'dist');
const distIndexPath = path.resolve(distDir, 'index.html');
const assetsImagesDir = path.resolve(__dirname, '..', 'assets', 'images');

if (fs.existsSync(distDir)) {
  const distAssetsDir = path.resolve(distDir, 'assets', 'images');
  if (!fs.existsSync(distAssetsDir)) {
    fs.mkdirSync(distAssetsDir, { recursive: true });
  }

  // Copy brand assets to dist/
  const filesToCopy = [
    'astra-mark.svg',
    'astra-logo-for-light-bg.svg',
    'astra-logo-for-dark-bg.svg',
    'favicon.ico',
    'favicon.png',
    'icon-192.png',
    'icon-512.png',
    'icon.png',
  ];

  for (const file of filesToCopy) {
    const src = path.join(assetsImagesDir, file);
    if (fs.existsSync(src)) {
      try {
        fs.copyFileSync(src, path.join(distDir, file));
        fs.copyFileSync(src, path.join(distAssetsDir, file));
      } catch (err) {
        console.warn(`Warning copying ${file} to dist:`, err.message);
      }
    }
  }

  // Copy favicon.png as favicon.ico as well
  const faviconSrc = path.join(assetsImagesDir, 'favicon.png');
  if (fs.existsSync(faviconSrc)) {
    try {
      fs.copyFileSync(faviconSrc, path.join(distDir, 'favicon.ico'));
    } catch (e) {}
  }

  // Write PWA manifest.json
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
    fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('✅ Generated PWA manifest.json in dist/');
  } catch (err) {
    console.warn('Warning writing manifest.json:', err.message);
  }

  console.log('✅ Astra brand assets & icons copied to dist/ and dist/assets/images/');
}

if (fs.existsSync(distIndexPath)) {
  let html = fs.readFileSync(distIndexPath, 'utf8');

  // Replace any existing <title>...</title>
  html = html.replace(/<title>.*?<\/title>/gi, '');

  // Clean existing icons and theme-color
  html = html.replace(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon|manifest)["'][^>]*>/gi, '');
  html = html.replace(/<meta[^>]+name=["']theme-color["'][^>]*>/gi, '');

  // Meta tags & Favicon links to inject
  const headElements = `  <title>Astra Exam AI • Teacher & Principal Exam Prep</title>
    <link rel="icon" type="image/svg+xml" href="/astra-mark.svg" />
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="description" content="Astra Exam AI is your all-in-one AI-driven preparation platform for competitive exams. Practice UPSC & UP Principal full mocks, analyze weaknesses, and master your syllabus." />
    <meta name="keywords" content="Astra Exam AI, UPSC Principal, UP Principal, UPPSC, DSSSB TGT, DSSSB PGT, competitive exams, mock tests, AI tutor, exam preparation" />
    <meta name="author" content="Eryza Labs" />
    <meta name="theme-color" content="#f2c94c" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Astra Exam AI • Teacher & Principal Exam Prep" />
    <meta property="og:description" content="Master competitive exams with AI-powered mock tests, performance analytics, and personalized learning." />
    <meta property="og:url" content="https://astra.eryzalabs.cloud" />
    <meta property="og:site_name" content="Astra Exam AI" />
    <meta property="og:image" content="/icon-512.png" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Astra Exam AI • Teacher & Principal Exam Prep" />
    <meta name="twitter:description" content="Master competitive exams with AI-powered mock tests, performance analytics, and personalized learning." />
    <meta name="twitter:image" content="/icon-512.png" />
`;

  html = html.replace('</head>', `${headElements}  </head>`);

  fs.writeFileSync(distIndexPath, html, 'utf8');
  console.log('✅ Successfully updated Astra Exam AI title, favicon links, and meta tags in dist/index.html');
}

// Copy TGT/PGT and mock papers into dist/ for direct static web serving
const dataTgtPgtDir = path.resolve(__dirname, '..', 'data', 'tgt_pgt');
if (fs.existsSync(dataTgtPgtDir) && fs.existsSync(distDir)) {
  try {
    const distTgtPgt = path.resolve(distDir, 'tgt_pgt');
    const distDataTgtPgt = path.resolve(distDir, 'data', 'tgt_pgt');
    fs.mkdirSync(distTgtPgt, { recursive: true });
    fs.mkdirSync(distDataTgtPgt, { recursive: true });

    const files = fs.readdirSync(dataTgtPgtDir).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      fs.copyFileSync(path.join(dataTgtPgtDir, f), path.join(distTgtPgt, f));
      fs.copyFileSync(path.join(dataTgtPgtDir, f), path.join(distDataTgtPgt, f));
    }
    console.log(`✅ Copied ${files.length} official TGT/PGT papers to dist/tgt_pgt/ and dist/data/tgt_pgt/`);
  } catch (err) {
    console.warn('⚠️ Warning copying papers to dist:', err.message);
  }
}

// Copy Full Mocks and Topic Wise papers from tests_json into dist/
const testsJsonDir = path.resolve(__dirname, '..', '..', 'tests_json');
if (fs.existsSync(testsJsonDir) && fs.existsSync(distDir)) {
  const folders = ['full_mocks', 'topic_wise'];
  for (const folder of folders) {
    const srcDir = path.join(testsJsonDir, folder);
    if (fs.existsSync(srcDir)) {
      try {
        const destDir = path.resolve(distDir, folder);
        const destDataDir = path.resolve(distDir, 'data', folder);
        fs.mkdirSync(destDir, { recursive: true });
        fs.mkdirSync(destDataDir, { recursive: true });

        const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.json'));
        for (const f of files) {
          fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
          fs.copyFileSync(path.join(srcDir, f), path.join(destDataDir, f));
        }
        console.log(`✅ Copied ${files.length} ${folder} papers to dist/${folder}/ and dist/data/${folder}/`);
      } catch (err) {
        console.warn(`⚠️ Warning copying ${folder} to dist:`, err.message);
      }
    }
  }
}
