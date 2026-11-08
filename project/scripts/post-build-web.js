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
const projectLogoPath = path.resolve(assetsImagesDir, 'logo.png');
const projectFaviconPath = path.resolve(assetsImagesDir, 'favicon.png');
const projectIconPath = path.resolve(assetsImagesDir, 'icon.png');

if (fs.existsSync(distDir)) {
  const logoSource = [
    '/home/aloo/Downloads/Astra Exam App Logo.png',
    projectLogoPath,
    projectFaviconPath,
    projectIconPath,
  ].find(p => fs.existsSync(p));

  if (logoSource) {
    try {
      fs.copyFileSync(logoSource, path.resolve(distDir, 'favicon.png'));
      fs.copyFileSync(logoSource, path.resolve(distDir, 'favicon.ico'));
      fs.copyFileSync(logoSource, path.resolve(distDir, 'logo.png'));

      const distAssetsDir = path.resolve(distDir, 'assets', 'images');
      if (!fs.existsSync(distAssetsDir)) {
        fs.mkdirSync(distAssetsDir, { recursive: true });
      }
      fs.copyFileSync(logoSource, path.resolve(distAssetsDir, 'favicon.png'));
      fs.copyFileSync(logoSource, path.resolve(distAssetsDir, 'logo.png'));
      console.log('✅ Favicon & logo copied to dist/ and dist/assets/images/');
    } catch (err) {
      console.warn('⚠️ Warning copying logo to dist:', err.message);
    }
  }
}

if (fs.existsSync(distIndexPath)) {
  let html = fs.readFileSync(distIndexPath, 'utf8');

  // Replace any existing <title>...</title>
  html = html.replace(/<title>.*?<\/title>/gi, '');

  // Meta tags & Favicon links to inject
  const headElements = `  <title>Astra Exam AI • UPSC & UP Principal Mock Tests</title>
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="shortcut icon" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/favicon.png" />
    <meta name="description" content="Astra Exam AI is your all-in-one AI-driven preparation platform for competitive exams. Practice UPSC & UP Principal full mocks, analyze weaknesses, and master your syllabus." />
    <meta name="keywords" content="Astra Exam AI, UPSC Principal, UP Principal, UPPSC, competitive exams, mock tests, AI tutor, exam preparation" />
    <meta name="author" content="Eryza Labs" />
    <meta name="theme-color" content="#4F46E5" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Astra Exam AI • UPSC & UP Principal Mock Tests" />
    <meta property="og:description" content="Master competitive exams with AI-powered mock tests, performance analytics, and personalized learning." />
    <meta property="og:url" content="https://astra.eryzalabs.cloud" />
    <meta property="og:site_name" content="Astra Exam AI" />
    <meta property="og:image" content="/favicon.png" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Astra Exam AI • UPSC & UP Principal Mock Tests" />
    <meta name="twitter:description" content="Master competitive exams with AI-powered mock tests, performance analytics, and personalized learning." />
    <meta name="twitter:image" content="/favicon.png" />
`;

  // Remove duplicate icons if any existed
  html = html.replace(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>/gi, '');

  if (!html.includes('name="description"')) {
    html = html.replace('</head>', `${headElements}  </head>`);
  } else {
    html = html.replace('</head>', `  <title>Astra Exam AI • UPSC & UP Principal Mock Tests</title>\n  <link rel="icon" type="image/png" href="/favicon.png" />\n  <link rel="shortcut icon" href="/favicon.png" />\n  <link rel="apple-touch-icon" href="/favicon.png" />\n  </head>`);
  }

  fs.writeFileSync(distIndexPath, html, 'utf8');
  console.log('✅ Successfully updated Astra Exam AI title, favicon links, and meta tags in dist/index.html');
} else {
  console.log('⚠️ dist/index.html not found, skipping post-build injection');
}

// Copy TGT/PGT and mock papers into dist/ for direct static web serving
const dataTgtPgtDir = path.resolve(__dirname, '..', 'data', 'tgt_pgt');
if (fs.existsSync(dataTgtPgtDir) && fs.existsSync(distDir)) {
  try {
    const distTgtPgt = path.resolve(distDir, 'tgt_pgt');
    const distDataTgtPgt = path.resolve(distDir, 'data', 'tgt_pgt');
    fs.mkdirSync(distTgtPgt, { recursive: true });
    fs.mkdirSync(distDataTgtPgt, { recursive: true });

    const files = fs.readdirSync(dataTgtPgtDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      fs.copyFileSync(path.join(dataTgtPgtDir, f), path.join(distTgtPgt, f));
      fs.copyFileSync(path.join(dataTgtPgtDir, f), path.join(distDataTgtPgt, f));
    }
    console.log(`✅ Copied ${files.length} official TGT/PGT papers to dist/tgt_pgt/ and dist/data/tgt_pgt/`);
  } catch (err) {
    console.warn('⚠️ Warning copying papers to dist:', err.message);
  }
}
