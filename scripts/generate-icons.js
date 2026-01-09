/**
 * Generate PWA icons from the app logo
 * First makes the logo transparent using ImageMagick, then creates multiple sizes
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '../public/app-logo.jpg');
const TRANSPARENT_PATH = path.join(__dirname, '../public/app-logo-transparent.png');
const OUTPUT_DIR = path.join(__dirname, '../public');

const SIZES = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' }, // iOS icon
];

async function makeTransparent() {
  try {
    console.log('🎨 Making logo background transparent with ImageMagick...\n');
    
    // Remove white background with a small fuzz factor for near-white colors
    execSync(`magick "${INPUT_PATH}" -fuzz 5%% -transparent white "${TRANSPARENT_PATH}"`, {
      stdio: 'inherit'
    });
    
    console.log('✅ Created transparent logo\n');
  } catch (error) {
    console.error('❌ Error making transparent:', error.message);
    console.error('\n💡 Make sure ImageMagick is installed and in your PATH');
    console.error('   You may need to restart your terminal after installation');
    process.exit(1);
  }
}

async function generateIcons() {
  try {
    console.log('📱 Generating PWA icons...\n');

    // Check if input file exists
    if (!fs.existsSync(INPUT_PATH)) {
      console.error('❌ Error: app-logo.jpg not found in public folder');
      console.error('   Please add your logo to public/app-logo.jpg');
      process.exit(1);
    }

    // First, make the logo transparent
    await makeTransparent();

    // Use the transparent version
    const sourceImage = TRANSPARENT_PATH;

    // Process each size
    for (const { size, name } of SIZES) {
      const outputPath = path.join(OUTPUT_DIR, name);
      
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    }

    console.log('\n🎉 All icons generated successfully!');
    console.log('\nGenerated files:');
    console.log('   - public/app-logo-transparent.png (transparent version)');
    SIZES.forEach(({ name }) => console.log(`   - public/${name}`));
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
