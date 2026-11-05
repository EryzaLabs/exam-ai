const fs = require('fs');
const path = require('path');
const { loadImage, createCanvas } = require('@napi-rs/canvas');

async function processAndCropImage(inputPath, outputPath, isFavicon = false) {
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

    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const maxVal = Math.max(r, g, b);

        if (maxVal <= 18) {
          // Completely transparent
          data[i + 3] = 0;
        } else if (maxVal < 45) {
          // Feather transition
          const factor = (maxVal - 18) / (45 - 18);
          data[i + 3] = Math.round(data[i + 3] * factor);
        }

        // Track bounding box of visible content
        if (data[i + 3] > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // If visible bounding box found, crop out dead empty margins
    if (maxX > minX && maxY > minY) {
      const padding = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
      const cropX = Math.max(0, minX - padding);
      const cropY = Math.max(0, minY - padding);
      const cropW = Math.min(canvas.width - cropX, (maxX - minX) + padding * 2);
      const cropH = Math.min(canvas.height - cropY, (maxY - minY) + padding * 2);

      const croppedCanvas = createCanvas(cropW, cropH);
      const croppedCtx = croppedCanvas.getContext('2d');
      croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const buffer = croppedCanvas.toBuffer('image/png');
      fs.writeFileSync(outputPath, buffer);
      console.log(`✨ Autocropped transparent logo (${cropW}x${cropH}) saved to: ${outputPath}`);
      return true;
    } else {
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(outputPath, buffer);
      console.log(`✨ Transparent logo saved to: ${outputPath}`);
      return true;
    }
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
    console.log('⚠️ No source logo found to process.');
    return;
  }

  console.log(`🎨 Processing and autocropping: ${source}`);
  await processAndCropImage(source, logoPath);
  await processAndCropImage(source, faviconPath, true);
  await processAndCropImage(source, iconPath);

  // Sync to dist if it exists
  const distDir = path.resolve(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    await processAndCropImage(source, path.resolve(distDir, 'favicon.png'), true);
    await processAndCropImage(source, path.resolve(distDir, 'favicon.ico'), true);
    await processAndCropImage(source, path.resolve(distDir, 'logo.png'));
  }
  console.log('✅ Transparent & autocropped Astra logo generation complete!');
}

if (require.main === module) {
  main();
}

module.exports = { processAndCropImage, main };
