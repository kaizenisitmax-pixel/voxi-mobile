// scripts/generate-icon.js
// VOXI Icon Generator
// Bu script SVG icon tanımları oluşturur
// Terminal: node scripts/generate-icon.js

const fs = require('fs');
const path = require('path');

// Assets klasörünü oluştur
const assetsDir = path.join(__dirname, '..', 'assets');
const imagesDir = path.join(assetsDir, 'images');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// 1. APP ICON SVG — 1024x1024
const iconSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Arka plan: yuvarlatılmış kare, siyah -->
  <rect width="1024" height="1024" rx="224" fill="#1A1A1A"/>

  <!-- VOXI yazısı: beyaz, ortalanmış, bold -->
  <text
    x="512" y="560"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
    font-weight="900"
    font-size="280"
    fill="#FFFFFF"
    text-anchor="middle"
    dominant-baseline="middle"
    letter-spacing="-12"
  >VOXI</text>

  <!-- Alt çizgi aksanı (opsiyonel vurgu) -->
  <rect x="280" y="680" width="464" height="8" rx="4" fill="#FFFFFF" opacity="0.25"/>
</svg>
`;

// 2. ADAPTIVE ICON (Android) — 1024x1024
const adaptiveIconSvg = iconSvg; // Aynı tasarım

// 3. SPLASH ICON — 200x200 (küçük logo)
const splashIconSvg = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <!-- VOXI yazısı: beyaz, büyük -->
  <text
    x="100" y="115"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
    font-weight="900"
    font-size="60"
    fill="#FFFFFF"
    text-anchor="middle"
    dominant-baseline="middle"
    letter-spacing="-2"
  >VOXI</text>
</svg>
`;

// 4. FAVICON — 48x48
const faviconSvg = `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <!-- Arka plan: siyah yuvarlatılmış kare -->
  <rect width="48" height="48" rx="10" fill="#1A1A1A"/>
  
  <!-- V harfi: beyaz, ortalanmış -->
  <text
    x="24" y="32"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
    font-weight="900"
    font-size="28"
    fill="#FFFFFF"
    text-anchor="middle"
    dominant-baseline="middle"
  >V</text>
</svg>
`;

// 5. NOTIFICATION ICON (Android) — 96x96 (monokrom)
const notificationIconSvg = `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <!-- Beyaz V harfi (notification bar için) -->
  <text
    x="48" y="64"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
    font-weight="900"
    font-size="56"
    fill="#FFFFFF"
    text-anchor="middle"
    dominant-baseline="middle"
  >V</text>
</svg>
`;

// SVG dosyalarını kaydet
fs.writeFileSync(path.join(imagesDir, 'icon.svg'), iconSvg.trim());
fs.writeFileSync(path.join(imagesDir, 'adaptive-icon.svg'), adaptiveIconSvg.trim());
fs.writeFileSync(path.join(imagesDir, 'splash-icon.svg'), splashIconSvg.trim());
fs.writeFileSync(path.join(imagesDir, 'favicon.svg'), faviconSvg.trim());
fs.writeFileSync(path.join(imagesDir, 'notification-icon.svg'), notificationIconSvg.trim());

console.log('✅ Icon SVG dosyaları oluşturuldu:');
console.log('   assets/images/icon.svg');
console.log('   assets/images/adaptive-icon.svg');
console.log('   assets/images/splash-icon.svg');
console.log('   assets/images/favicon.svg');
console.log('   assets/images/notification-icon.svg');
console.log('');
console.log('⚠️  SONRAKI ADIM:');
console.log('   SVG dosyalarını PNG\'ye dönüştürün:');
console.log('');
console.log('   1. Figma/Sketch/Canva ile SVG\'leri aç');
console.log('   2. PNG olarak dışa aktar:');
console.log('      - icon.png → 1024x1024');
console.log('      - adaptive-icon.png → 1024x1024');
console.log('      - splash-icon.png → 200x200');
console.log('      - favicon.png → 48x48');
console.log('      - notification-icon.png → 96x96');
console.log('');
console.log('   3. PNG dosyalarını assets/images/ klasörüne kaydet');
console.log('');
console.log('   VEYA sharp-cli ile otomatik dönüştür:');
console.log('   npm install -g sharp-cli');
console.log('   sharp -i assets/images/icon.svg -o assets/images/icon.png resize 1024 1024');
console.log('');
console.log('📝 ŞİMDİLİK: PNG dosyaları yoksa uygulama placeholder ile çalışacak.');
