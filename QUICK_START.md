# 🚀 VOXI Hızlı Başlangıç

VOXI uygulamasını çalıştırmak için adım adım rehber.

## 📋 Gereksinimler

- Node.js 18+ yüklü
- npm veya yarn
- Expo CLI
- iOS Simulator (Mac) veya Android Emulator

## 🔧 İlk Kurulum (Bir Kerelik)

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. Environment Variables
```bash
# .env dosyası oluştur
cp .env.example .env

# .env dosyasını düzenle ve key'leri ekle:
# - EXPO_PUBLIC_SUPABASE_URL
# - EXPO_PUBLIC_SUPABASE_ANON_KEY
# - EXPO_PUBLIC_ANTHROPIC_API_KEY
```

### 3. Icon Dosyalarını Oluştur
```bash
# SVG'leri oluştur
npm run generate-icons

# SVG'leri PNG'ye dönüştür (manuel):
# - Figma/Canva ile assets/images/*.svg dosyalarını aç
# - PNG olarak export et (icon.png 1024x1024, vb.)
```

## ▶️ Development (Günlük Kullanım)

### Başlat
```bash
npm start
# veya
npx expo start
```

### iOS Simulator
```bash
npm run ios
# veya
npx expo start --ios
```

### Android Emulator
```bash
npm run android
# veya
npx expo start --android
```

## 🏗️ Build & Deploy

### EAS Kurulumu (İlk Kez)
```bash
# EAS CLI yükle
npm install -g eas-cli

# Giriş yap
eas login

# Proje başlat
eas init

# EAS project ID'yi kopyala ve güncelle:
# - app.json → extra.eas.projectId
# - app.json → updates.url
```

### Development Build
```bash
# iOS simülatör
npm run build:dev:ios

# Android emülatör
npm run build:dev:android
```

### Preview Build (TestFlight / Internal Testing)
```bash
# iOS
npm run build:preview:ios

# Android
npm run build:preview:android
```

### Production Build
```bash
# Her iki platform
npm run build:prod
```

### Store'a Gönder
```bash
# iOS (App Store)
npm run submit:ios

# Android (Google Play)
npm run submit:android

# Her ikisi
npm run submit:all
```

## 🐛 Sentry Kurulumu (Opsiyonel ama Önerilen)

1. https://sentry.io'da hesap aç
2. Yeni proje oluştur: "voxi-mobile"
3. DSN'i kopyala
4. `app/_layout.tsx` dosyasında `YOUR_SENTRY_DSN` yerine yapıştır

## 🌐 Landing Page Deploy

```bash
# Vercel ile deploy (önerilen)
cd landing
vercel

# veya Netlify
netlify deploy

# Domain bağla: voxi.app
```

## ⚠️ Yaygın Hatalar ve Çözümleri

### "Cannot find module '@sentry/react-native'"
```bash
npm install
# Sentry paketi yüklenmemiş, npm install yapın
```

### "Icon dosyaları bulunamıyor"
```bash
npm run generate-icons
# Sonra SVG'leri PNG'ye dönüştürün
```

### "EAS project ID yok"
```bash
eas init
# Project ID'yi app.json'a ekleyin
```

### "Supabase bağlantı hatası"
```bash
# .env dosyasını kontrol edin
# EXPO_PUBLIC_SUPABASE_URL ve ANON_KEY doğru mu?
```

## 📱 Test Cihazlarda Çalıştırma

### iOS (Fiziksel Cihaz)
```bash
# Preview build oluştur
npm run build:preview:ios

# TestFlight'a yükle
npm run submit:ios

# TestFlight'tan cihazınıza indirin
```

### Android (Fiziksel Cihaz)
```bash
# Preview build oluştur
npm run build:preview:android

# Internal Testing'e yükle
npm run submit:android

# Play Store'dan (internal) indirin
```

## 📚 Daha Fazla Bilgi

- **README.md** — Detaylı dokümantasyon
- **VOXI_SPRINT_5_COMPLETE.md** — Sprint 5 detayları
- **store/metadata.md** — Store metadata ve checklist
- **.env.example** — Environment variables örneği

## 🆘 Destek

Sorun yaşarsanız:
- E-posta: destek@voxi.app
- GitHub Issues: (proje public ise)

---

**Kolay gelsin! 🎉**
