import sharp from 'sharp';
import fs from 'fs';

async function generateIcons() {
    try {
        console.log('🎨 Generando iconos con fondo transparente...\n');

        // Generar icon-512x512.png
        await sharp('public/icon.svg')
            .resize(512, 512)
            .png()
            .toFile('public/icon-512x512.png');
        console.log('✅ icon-512x512.png generado');

        // Generar icon-192x192.png
        await sharp('public/icon.svg')
            .resize(192, 192)
            .png()
            .toFile('public/icon-192x192.png');
        console.log('✅ icon-192x192.png generado');

        // Generar apple-touch-icon.png
        await sharp('public/icon.svg')
            .resize(180, 180)
            .png()
            .toFile('public/apple-touch-icon.png');
        console.log('✅ apple-touch-icon.png generado');

        // Generar favicon.png (32x32)
        await sharp('public/icon.svg')
            .resize(32, 32)
            .png()
            .toFile('public/favicon.png');
        console.log('✅ favicon.png generado');

        // Copiar favicon.png como favicon.ico
        fs.copyFileSync('public/favicon.png', 'public/favicon.ico');
        console.log('✅ favicon.ico generado');

        console.log('\n🎉 ¡Todos los iconos generados exitosamente con fondo transparente!');
    } catch (error) {
        console.error('❌ Error generando iconos:', error);
    }
}

generateIcons();
