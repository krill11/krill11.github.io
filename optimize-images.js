const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const resolutions = [
    { width: 1280, height: 720, suffix: '720p' },
    { width: 1920, height: 1080, suffix: '1080p' },
    { width: 2560, height: 1440, suffix: '2k' },
    { width: 3840, height: 2160, suffix: '4k' }
];

const images = [
    { file: 'bliss.png', format: 'png' },
    { file: 'layer1.png', format: 'png' },
    { file: 'layer2.png', format: 'png' },
    { file: 'layer3.png', format: 'png' },
    { file: 'kana.png', format: 'png' },
    { file: 'ocean.jpg', format: 'jpeg' }
];

async function optimizeImage(imagePath, outputPath, width, height, format) {
    try {
        const pipeline = sharp(imagePath);
        
        // Resize filling entire space without black bars
        pipeline.resize(width, height, {
            fit: 'cover',
            withoutEnlargement: true
        });

        // Set quality based on format
        if (format === 'jpeg') {
            pipeline.jpeg({ quality: 85 });
        } else {
            pipeline.png({ compressionLevel: 9 });
        }

        await pipeline.toFile(outputPath);
        console.log(`Optimized: ${outputPath}`);
    } catch (error) {
        console.error(`Error processing ${imagePath}:`, error);
    }
}

async function processAllImages() {
    // Create optimized directory if it doesn't exist
    const optimizedDir = path.join(__dirname, 'optimized');
    if (!fs.existsSync(optimizedDir)) {
        fs.mkdirSync(optimizedDir);
    }

    for (const image of images) {
        const imagePath = path.join(__dirname, image.file);
        if (!fs.existsSync(imagePath)) {
            console.log(`Skipping ${image.file} - file not found`);
            continue;
        }

        for (const resolution of resolutions) {
            const outputName = `${path.parse(image.file).name}_${resolution.suffix}.${image.format}`;
            const outputPath = path.join(optimizedDir, outputName);
            await optimizeImage(imagePath, outputPath, resolution.width, resolution.height, image.format);
        }
    }
}

processAllImages().then(() => {
    console.log('Image optimization complete!');
}).catch(error => {
    console.error('Error during optimization:', error);
}); 