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

let sourceFile = null;
if (fs.existsSync(downloadLogoPath)) {
  sourceFile = downloadLogoPath;
} else if (fs.existsSync(projectLogoPath)) {
  sourceFile = projectLogoPath;
}

if (sourceFile) {
  try {
    fs.copyFileSync(sourceFile, projectLogoPath);
    fs.copyFileSync(sourceFile, projectFaviconPath);
    fs.copyFileSync(sourceFile, projectIconPath);
    console.log(`✅ Astra logo synced successfully from ${sourceFile} to:`);
    console.log(`   - ${projectLogoPath}`);
    console.log(`   - ${projectFaviconPath}`);
    console.log(`   - ${projectIconPath}`);
  } catch (err) {
    console.error('❌ Failed to copy Astra logo files:', err);
  }
} else {
  console.warn('⚠️ No source Astra logo found to sync.');
}
