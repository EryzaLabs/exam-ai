const fs = require('fs');
const path = require('path');

const downloadLogoPath = '/home/aloo/Downloads/Astra Exam App Logo.png';
const assetsImagesDir = path.resolve(__dirname, '..', 'assets', 'images');
const projectLogoPath = path.resolve(assetsImagesDir, 'logo.png');
const projectFaviconPath = path.resolve(assetsImagesDir, 'favicon.png');
const projectIconPath = path.resolve(assetsImagesDir, 'icon.png');

if (!fs.existsSync(assetsImagesDir)) {
  fs.mkdirSync(assetsImagesDir, { recursive: true });
}

// 1. Check if user's local Downloads has the high-res Astra logo
if (fs.existsSync(downloadLogoPath)) {
  try {
    fs.copyFileSync(downloadLogoPath, projectLogoPath);
    fs.copyFileSync(downloadLogoPath, projectFaviconPath);
    fs.copyFileSync(downloadLogoPath, projectIconPath);
    console.log('✅ Astra logo synced successfully from Downloads to project assets!');
  } catch (err) {
    console.warn('⚠️ Warning syncing from Downloads:', err.message);
  }
}

// 2. Ensure projectLogoPath ALWAYS exists so Metro bundler never fails on Netlify or CI
if (!fs.existsSync(projectLogoPath)) {
  if (fs.existsSync(projectFaviconPath)) {
    try {
      fs.copyFileSync(projectFaviconPath, projectLogoPath);
      console.log('✅ Generated logo.png from favicon.png for build resolution.');
    } catch (e) {}
  } else if (fs.existsSync(projectIconPath)) {
    try {
      fs.copyFileSync(projectIconPath, projectLogoPath);
      console.log('✅ Generated logo.png from icon.png for build resolution.');
    } catch (e) {}
  } else {
    // Write 1x1 transparent fallback PNG so Metro never fails
    const fallbackPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    try {
      fs.writeFileSync(projectLogoPath, fallbackPng);
      console.log('✅ Created fallback logo.png to ensure bundle stability.');
    } catch (e) {}
  }
}
