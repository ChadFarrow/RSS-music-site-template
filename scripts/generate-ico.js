const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function generateIco() {
  const sourceImage = '/home/laptop/Downloads/dv-white.png';
  const outputPath = path.join(__dirname, '..', 'public', 'favicon.ico');
  
  try {
    // Load the source image
    const img = await loadImage(sourceImage);
    
    // Create a 32x32 canvas for the ICO (most compatible size)
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d');
    
    // Draw the image scaled to 32x32
    ctx.drawImage(img, 0, 0, 32, 32);
    
    // Get the PNG buffer
    const buffer = canvas.toBuffer('image/png');
    
    // Simple ICO header for a single 32x32 PNG image
    const icoHeader = Buffer.from([
      0, 0,       // Reserved
      1, 0,       // Type (1 = ICO)
      1, 0,       // Number of images
      32,         // Width
      32,         // Height
      0,          // Color palette
      0,          // Reserved
      1, 0,       // Color planes
      32, 0,      // Bits per pixel
      ...Buffer.from(new Uint32Array([buffer.length]).buffer), // Size of image data
      22, 0, 0, 0 // Offset to image data
    ]);
    
    // Combine header and image data
    const icoBuffer = Buffer.concat([icoHeader, buffer]);
    
    // Write the ICO file
    fs.writeFileSync(outputPath, icoBuffer);
    console.log('✓ Generated favicon.ico');
    
    // For better compatibility, let's just copy the 32x32 PNG as a fallback
    const favicon32Path = path.join(__dirname, '..', 'public', 'favicon-32x32.png');
    const simpleFallback = fs.readFileSync(favicon32Path);
    
    // Create a proper ICO with PNG embedded
    const properIcoHeader = Buffer.alloc(22);
    properIcoHeader.writeUInt16LE(0, 0);     // Reserved
    properIcoHeader.writeUInt16LE(1, 2);     // Type: 1 for ICO
    properIcoHeader.writeUInt16LE(1, 4);     // Number of images
    properIcoHeader.writeUInt8(32, 6);       // Width
    properIcoHeader.writeUInt8(32, 7);       // Height
    properIcoHeader.writeUInt8(0, 8);        // Color palette
    properIcoHeader.writeUInt8(0, 9);        // Reserved
    properIcoHeader.writeUInt16LE(1, 10);    // Color planes
    properIcoHeader.writeUInt16LE(32, 12);   // Bits per pixel
    properIcoHeader.writeUInt32LE(simpleFallback.length, 14); // Size of image data
    properIcoHeader.writeUInt32LE(22, 18);   // Offset to image data
    
    const finalIco = Buffer.concat([properIcoHeader, simpleFallback]);
    fs.writeFileSync(outputPath, finalIco);
    
    console.log('✓ Created favicon.ico from 32x32 PNG');
    
  } catch (error) {
    console.error('Error generating ICO:', error);
    
    // Fallback: just copy the 32x32 PNG
    console.log('Using fallback method...');
    const favicon32 = path.join(__dirname, '..', 'public', 'favicon-32x32.png');
    const pngData = fs.readFileSync(favicon32);
    
    // Create minimal ICO wrapper
    const header = Buffer.alloc(22);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);
    header[6] = 32;
    header[7] = 32;
    header.writeUInt16LE(1, 10);
    header.writeUInt16LE(32, 12);
    header.writeUInt32LE(pngData.length, 14);
    header.writeUInt32LE(22, 18);
    
    fs.writeFileSync(outputPath, Buffer.concat([header, pngData]));
    console.log('✓ Created basic favicon.ico');
  }
}

generateIco().catch(console.error);