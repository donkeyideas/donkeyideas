// Script to generate app icons from PNG source
const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, 'assets');
const sourcePng = path.join(assetsDir, 'logo-original.png');
const iconPng = path.join(assetsDir, 'icon.png');
const iconIco = path.join(assetsDir, 'icon.ico');

console.log('📦 Generating App Icons');
console.log('========================\n');

async function generateIcons() {
  try {
    // Check if source exists
    if (!fs.existsSync(sourcePng)) {
      console.error('❌ Source logo not found:', sourcePng);
      console.log('\nPlease ensure logo-original.png exists in assets folder');
      process.exit(1);
    }

    console.log('✅ Source logo found:', sourcePng);

    // Create optimized icon.png (512x512 for best quality)
    console.log('\n📐 Creating optimized icon.png (512x512)...');
    await sharp(sourcePng)
      .resize(512, 512, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 } 
      })
      .png()
      .toFile(iconPng);
    console.log('✅ Created icon.png (512x512)');

    // Generate ICO for Windows (multiple sizes)
    console.log('\n🪟 Generating Windows icon (ICO)...');
    try {
      // Create multiple sizes for ICO (16, 32, 48, 64, 128, 256)
      const sizes = [16, 32, 48, 64, 128, 256];
      const buffers = [];
      
      for (const size of sizes) {
        const buffer = await sharp(sourcePng)
          .resize(size, size, { 
            fit: 'contain', 
            background: { r: 0, g: 0, b: 0, alpha: 0 } 
          })
          .png()
          .toBuffer();
        buffers.push(buffer);
      }
      
      // Convert to ICO
      const icoBuffer = await toIco(buffers);
      fs.writeFileSync(iconIco, icoBuffer);
      console.log('✅ Created icon.ico with multiple sizes');
    } catch (error) {
      console.warn('⚠️  Could not generate ICO automatically:', error.message);
      console.log('\n   Manual conversion:');
      console.log('   1. Go to: https://icoconverter.com/');
      console.log('   2. Upload:', sourcePng);
      console.log('   3. Download and save as:', iconIco);
    }

    // For macOS ICNS, provide instructions
    console.log('\n🍎 macOS icon (ICNS) - Manual conversion:');
    console.log('   1. Go to: https://cloudconvert.com/png-to-icns');
    console.log('   2. Upload:', sourcePng);
    console.log('   3. Download and save as: apps/desktop/assets/icon.icns');
    console.log('   (ICNS is optional - app will work without it)');

    console.log('\n✅ Icon generation complete!');
    console.log('\n📁 Generated files:');
    console.log(`   ✅ ${iconPng} (512x512 - Linux/fallback)`);
    if (fs.existsSync(iconIco)) {
      console.log(`   ✅ ${iconIco} (Windows - multiple sizes)`);
    } else {
      console.log(`   ⚠️  ${iconIco} (Windows - needs manual creation)`);
    }
    console.log('\n💡 Icons will be used when you build the installer.');
    console.log('💡 The app window icon will update after rebuilding.');

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
