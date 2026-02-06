# VOXI — AI Destekli Ekip Yönetimi

Küçük ekipler için tasarlanmış, AI destekli görev ve müşteri yönetimi uygulaması.

![VOXI Logo](assets/images/icon.png)

## 🎯 Özellikler

- 🤖 **VOXI AI Asistan** — Sesli/yazılı komutla görev oluşturma (Claude Sonnet 4.5)
- 📋 **Görev Yönetimi** — 5N1K detaylı görev kartları
- 👥 **Müşteri & Paydaş Kartları** — CRM benzeri müşteri takibi
- 🔔 **Akıllı Bildirimler** — Push + SMS (acil görevler)
- 📊 **AI Haftalık Rapor** — Otomatik istatistik ve özet
- 🏢 **Çoklu Ekip** — Montaj, satış, depo ayrı ekipler

## 🛠️ Tech Stack

- **Frontend:** React Native + Expo (Expo Router)
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **AI:** Anthropic Claude Sonnet 4.5
- **SMS:** Netgsm
- **Push:** Expo Push Notifications
- **Error Tracking:** Sentry

## 📦 Kurulum

### Gereksinimler
- Node.js 18+ 
- npm veya yarn
- Expo CLI
- iOS Simulator / Android Emulator veya fiziksel cihaz

### Adımlar

```bash
# Projeyi klonla
git clone https://github.com/volkan/voxi-app.git
cd voxi-app

# Bağımlılıkları yükle
npm install

# .env dosyası oluştur
cp .env.example .env
# .env dosyasına Supabase, Anthropic, Netgsm key'lerini ekle

# Development sunucusunu başlat
npx expo start
```

## 🔐 Environment Variables

`.env` dosyası oluşturun ve aşağıdaki değerleri ekleyin:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_ANTHROPIC_API_KEY=your-anthropic-key
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn (opsiyonel)
```

## 🚀 Build & Deploy

### EAS Build Kurulumu

```bash
# EAS CLI yükle (global)
npm install -g eas-cli

# EAS'a giriş yap
eas login

# Proje başlat
eas init
```

### Development Build

```bash
# iOS simülatör
eas build --platform ios --profile development

# Android emülatör
eas build --platform android --profile development
```

### Preview Build (TestFlight / Internal Testing)

```bash
# iOS
eas build --platform ios --profile preview

# Android
eas build --platform android --profile preview
```

### Production Build (App Store / Play Store)

```bash
# Her iki platform
eas build --platform all --profile production

# Store'a gönder
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

## 📁 Proje Yapısı

```
app/
├── (auth)/              — Giriş + OTP doğrulama
│   ├── welcome.tsx      — E-posta/Telefon giriş
│   └── verify.tsx       — OTP kodu doğrulama
├── (onboarding)/        — Profil + workspace kurulumu
│   ├── profile.tsx
│   ├── workspace.tsx
│   └── create-workspace.tsx
├── (tabs)/              — Ana sekmeler
│   ├── index.tsx        — Görevler
│   ├── completed.tsx    — Biten görevler
│   ├── newTask.tsx      — Yeni görev oluştur
│   ├── voxi.tsx         — VOXI AI sohbet
│   ├── team.tsx         — Ekip & Müşteriler
│   └── settings.tsx     — Ayarlar
├── task/[id].tsx        — Görev detay (5N1K)
├── customer/[id].tsx    — Müşteri kartı detay
├── settings/            — Alt ayarlar sayfaları
│   ├── profile.tsx
│   ├── company.tsx
│   └── team-management.tsx
└── legal/               — Yasal sayfalar
    ├── privacy.tsx
    └── terms.tsx

lib/
├── ai.ts                — VOXI AI fonksiyonları
├── supabase.ts          — Supabase client
├── notifications.ts     — Push notification
├── push-trigger.ts      — Bildirim tetikleme
├── sms.ts               — Netgsm SMS
└── invite.ts            — Davet sistemi

contexts/
└── AuthContext.tsx       — Auth state yönetimi

assets/
└── images/
    ├── icon.png          — App icon (1024x1024)
    ├── adaptive-icon.png — Android adaptive (1024x1024)
    ├── splash-icon.png   — Splash screen (200x200)
    ├── favicon.png       — Web favicon (48x48)
    └── notification-icon.png — Notification icon (96x96)
```

## 📱 Özellikler Detayı

### 1. AI Asistan (VOXI)
- Claude Sonnet 4.5 ile doğal dil anlama
- Sesli komut desteği (Whisper STT)
- Otomatik görev, müşteri, paydaş kartı oluşturma
- Haftalık özet raporu

### 2. Görev Yönetimi
- 5N1K formatı (Ne, Ne zaman, Nerede, Nasıl, Neden, Kim)
- Dosya ekleme (fotoğraf, PDF)
- Sesli not ekleme
- Öncelik ve durum takibi
- Hatırlatma sistemi

### 3. Ekip Yönetimi
- Workspace (şirket) ve Team (ekip) yapısı
- Rol bazlı yetkilendirme (owner, admin, manager, member)
- Davet sistemi (kod veya telefon/e-posta)
- Çoklu ekip desteği

### 4. Bildirimler
- Push notification (görev atandığında)
- SMS (acil görevler)
- Sabah hatırlatması (09:00)
- Bildirim tercihleri yönetimi

### 5. Müşteri Yönetimi
- Müşteri kartları (CRM benzeri)
- Paydaş kartları
- Görevle otomatik bağlantı
- Not ve AI özet

## 🧪 Test

```bash
# Jest (unit tests)
npm test

# E2E tests (Detox)
npm run test:e2e
```

## 🐛 Hata Takibi

Sentry entegre edildi. Production'da otomatik olarak hata raporları gönderilir.

```tsx
// Manuel hata gönderme
import * as Sentry from '@sentry/react-native';

try {
  // risky code
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'task_management', action: 'create_task' },
  });
}
```

## 📄 Lisans

Özel yazılım. Tüm hakları saklıdır. © 2026 VOXI

## 👤 İletişim

- **E-posta:** destek@voxi.app
- **Web:** https://voxi.app

## 🙏 Teşekkürler

- [Expo](https://expo.dev) — Development ve build altyapısı
- [Supabase](https://supabase.com) — Backend as a Service
- [Anthropic](https://anthropic.com) — Claude AI API
- [Sentry](https://sentry.io) — Hata takibi
