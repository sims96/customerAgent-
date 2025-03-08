// This is a Node.js script to generate all the required icons for the PWA
// Run with: node generate-icons.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Make sure the icons directory exists
const iconDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir);
}

// Source logo path
const sourceLogo = path.join(__dirname, 'logo.jpg');

// PWA icon sizes
const pwaSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Apple icon sizes
const appleSizes = [
  { width: 180, height: 180, name: 'apple-icon-180x180.png' },
  // Apple splash screens
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732.png' },
  { width: 1668, height: 2388, name: 'apple-splash-1668-2388.png' },
  { width: 1536, height: 2048, name: 'apple-splash-1536-2048.png' },
  { width: 1125, height: 2436, name: 'apple-splash-1125-2436.png' },
  { width: 1242, height: 2688, name: 'apple-splash-1242-2688.png' },
  { width: 828, height: 1792, name: 'apple-splash-828-1792.png' },
  { width: 1242, height: 2208, name: 'apple-splash-1242-2208.png' }
];

// Generate PWA icons
async function generatePwaIcons() {
  console.log('Generating PWA icons...');
  
  for (const size of pwaSizes) {
    try {
      await sharp(sourceLogo)
        .resize(size, size)
        .toFile(path.join(iconDir, `icon-${size}x${size}.png`));
      
      console.log(`Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`Error generating icon-${size}x${size}.png:`, error);
    }
  }
}

// Generate Apple icons
async function generateAppleIcons() {
  console.log('Generating Apple icons and splash screens...');
  
  for (const item of appleSizes) {
    try {
      if (item.name.includes('splash')) {
        // For splash screens, center the logo on a background
        const background = Buffer.from(
          '<svg><rect width="100%" height="100%" fill="#0f1117"/></svg>'
        );
        
        const logoSize = Math.min(item.width, item.height) * 0.4;
        
        await sharp(background)
          .resize(item.width, item.height)
          .composite([{
            input: await sharp(sourceLogo)
              .resize(logoSize, logoSize)
              .toBuffer(),
            gravity: 'center'
          }])
          .toFile(path.join(iconDir, item.name));
      } else {
        await sharp(sourceLogo)
          .resize(item.width, item.height)
          .toFile(path.join(iconDir, item.name));
      }
      
      console.log(`Generated ${item.name}`);
    } catch (error) {
      console.error(`Error generating ${item.name}:`, error);
    }
  }
}

// Execute the functions
async function generateAllIcons() {
  try {
    await generatePwaIcons();
    await generateAppleIcons();
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateAllIcons();