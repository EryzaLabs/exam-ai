const fs = require('fs');
const path = require('path');
const { loadImage, createCanvas } = require('@napi-rs/canvas');

async function processImage(inputPath, outputPath) {
  if (!fs.existsSync(inputPath)) {
    return false;
  }

  try {
    const image = await loadImage(inputPath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const maxVal = Math.max(r, g, b);

      if (maxVal <= 18) {
        // Completely black / background
        data[i + 3] = 0;
      } else if (maxVal < 45) {
        // Smooth feathering to avoid jagged edges on dark glows
        const factor = (maxVal - 18) / (45 - 18);
        data[i + 3] = Math.round(data[i + 3] * factor);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`✨ Transparent PNG created successfully at: ${outputPath}`);
    return true;
  } catch (err) {
    console.error(`Error processing image ${inputPath}:`, err.message);
    return false;
  }
}

async function main() {
  const downloadLogoPath = '/home/aloo/Downloads/Astra Exam App Logo.png';
  const assetsDir = path.resolve(__dirname, '..', 'assets', 'images');
  const logoPath = path.resolve(assetsDir, 'logo.png');
  const faviconPath = path.resolve(assetsDir, 'favicon.png');
  const iconPath = path.resolve(assetsDir, 'icon.png');

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const source = fs.existsSync(downloadLogoPath) ? downloadLogoPath : (fs.existsSync(logoPath) ? logoPath : null);

  if (!source) {
    console.log('⚠️ No source logo found to remove background.');
    return;
  }

  console.log(`🎨 Removing black background from: ${source}`);
  await processImage(source, logoPath);
  await processImage(source, faviconPath);
  await processImage(source, iconPath);

  // Also copy to dist if dist exists
  const distDir = path.resolve(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    await processImage(source, path.resolve(distDir, 'favicon.png'));
    await processImage(source, path.resolve(distDir, 'favicon.ico'));
    await processImage(source, path.resolve(distDir, 'logo.png'));
  }
  console.log('✅ Transparent PNG generation complete!');
}

if (require.main === module) {
  main();
}

module.exports = { processImage, main };
