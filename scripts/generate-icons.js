const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateIcons() {
  const sourcePath = path.join(__dirname, '..', 'public', 'dv-logo-source.png');
  const roundSourcePath = path.join(__dirname, '..', 'public', 'dv-logo-round.png');
  const publicPath = path.join(__dirname, '..', 'public');

  // Create favicon.ico (32x32)
  await sharp(sourcePath)
    .resize(32, 32)
    .toFile(path.join(publicPath, 'favicon.ico'));
  console.log('Created favicon.ico');

  // Standard favicon sizes
  const faviconSizes = [16, 32];
  for (const size of faviconSizes) {
    await sharp(sourcePath)
      .resize(size, size)
      .toFile(path.join(publicPath, `favicon-${size}x${size}.png`));
    console.log(`Created favicon-${size}x${size}.png`);
  }

  // PWA icons (square)
  const pwaSquareSizes = [192, 512];
  for (const size of pwaSquareSizes) {
    await sharp(sourcePath)
      .resize(size, size)
      .toFile(path.join(publicPath, `icon-${size}x${size}.png`));
    console.log(`Created icon-${size}x${size}.png`);
  }

  // Android maskable icons (using pre-cropped round version with safe zone padding)
  // Maskable icons need padding - safe zone is center 80% (40% radius from center)
  for (const size of pwaSquareSizes) {
    const logoSize = Math.floor(size * 0.65); // Logo takes up 65% to fit in safe zone
    const padding = Math.floor((size - logoSize) / 2);
    
    await sharp(roundSourcePath)
      .resize(logoSize, logoSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
      })
      .toFile(path.join(publicPath, `icon-maskable-${size}x${size}.png`));
    console.log(`Created icon-maskable-${size}x${size}.png`);
  }

  // Apple touch icons
  const appleSizes = [76, 120, 144, 152, 180];
  for (const size of appleSizes) {
    const filename = size === 180 ? 'apple-touch-icon.png' : `apple-touch-icon-${size}x${size}.png`;
    await sharp(sourcePath)
      .resize(size, size)
      .toFile(path.join(publicPath, filename));
    console.log(`Created ${filename}`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);