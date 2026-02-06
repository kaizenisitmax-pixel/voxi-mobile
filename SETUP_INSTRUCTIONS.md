# 🚀 KALFA WhatsApp Özellikleri - Kurulum Talimatları

Bu dosya KALFA uygulamasına eklenen WhatsApp tarzı özelliklerin kurulumu için adım adım talimatlar içerir.

---

## 📦 1. PAKET KURULUMU

Gerekli paketleri yükleyin:

```bash
npm install
```

Eğer `react-native-gesture-handler` eksikse manuel olarak yükleyin:

```bash
npm install react-native-gesture-handler@~2.24.0
```

---

## 🗄️ 2. SUPABASE MIGRATION

Supabase Dashboard'a gidin ve **SQL Editor** bölümünden aşağıdaki SQL komutlarını çalıştırın:

### Yöntem 1: Dosyadan Çalıştırma

`supabase-migrations.sql` dosyasının tamamını kopyalayıp Supabase SQL Editor'a yapıştırın ve çalıştırın.

### Yöntem 2: Manuel Komutlar

```sql
-- Mesaj durumu (okundu bilgisi)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Yıldızlı mesajlar
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_starred boolean DEFAULT false;

-- Yanıtlama (reply)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES messages(id);

-- Görev sabitleme
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- İndeksler (performans için)
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_starred ON messages(is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_pinned ON tasks(is_pinned) WHERE is_pinned = true;
```

**✅ Kontrol:** SQL komutları başarıyla çalıştı mı? Hata mesajı alırsanız, tabloların mevcut olduğundan emin olun.

---

## ⚙️ 3. BABEL YAPISI

`babel.config.js` dosyasını açın ve Reanimated plugin'in eklendiğinden emin olun:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // ÖNEMLİ: En sonda olmalı!
    ],
  };
};
```

**⚠️ Not:** `react-native-reanimated/plugin` **mutlaka son plugin** olarak eklenmeli!

---

## 📱 4. UYGULAMAYI BAŞLATMA

### Metro Cache'i Temizle

Değişikliklerden sonra Metro cache'ini temizlemek önemli:

```bash
npx expo start -c
```

### iOS İçin

```bash
npm run ios
```

### Android İçin

```bash
npm run android
```

---

## 🔍 5. TEST SÜRECİ

### Görev Detay Sayfası (task/[id].tsx)

#### ✅ Test Edilecekler:

1. **Okundu İşaretleri**
   - Mesaj gönder
   - Durum ikonunu kontrol et (✓ → ✓✓ → ✓✓ mavi)

2. **Uzun Basma Menüsü**
   - Bir mesaja 1-2 saniye basılı tut
   - Menü açılmalı: Kopyala, Yıldızla, Yanıtla, Sil

3. **Yıldızlama**
   - Mesajı yıldızla
   - Sarı arka plan görünmeli
   - Sağ üstte ⭐ ikonu olmalı

4. **Yanıtlama**
   - "Yanıtla" seçeneğini seç
   - Input üstünde referans mesaj görünmeli
   - X ile iptal edilebilmeli
   - Mesaj gönder, yanıtlanan mesaj küçük kutuda görünmeli

5. **Yazıyor Göstergesi**
   - Input'a yazmaya başla
   - "Volkan yazıyor..." metni görünmeli
   - 3 saniye sonra kaybolmalı

### Ana Ekran (index.tsx)

#### ✅ Test Edilecekler:

1. **Sola Kaydırma**
   - Görev kartını sola kaydır
   - 📌 Sabitle (Mavi) ve ✅ Tamamla (Yeşil) butonları görünmeli
   - Butona tıkla, aksiyon gerçekleşmeli

2. **Sağa Kaydırma**
   - Görev kartını sağa kaydır
   - 🗑️ Sil (Kırmızı) butonu görünmeli
   - Tıkla, görev silinmeli

3. **Sabitleme**
   - Bir görevi sabitle
   - 📌 ikonu görünmeli
   - Görev listenin en üstüne çıkmalı

4. **Sıralama Kontrolü**
   - Sabitli görevler en üstte mi?
   - Acil görevler sabitlilerden sonra mı?
   - Normal görevler en altta mı?

---

## 🐛 6. SORUN GİDERME

### Problem: "Cannot find module 'react-native-gesture-handler'"

**Çözüm:**
```bash
npm install react-native-gesture-handler
npx expo start -c
```

### Problem: Swipeable çalışmıyor

**Çözüm:**
1. `app/_layout.tsx` dosyasında `GestureHandlerRootView` sarmalını kontrol edin
2. Uygulamayı tamamen kapatıp yeniden başlatın
3. Cache'i temizleyin: `npx expo start -c`

### Problem: Animasyonlar donuyor

**Çözüm:**
1. `babel.config.js` dosyasında `react-native-reanimated/plugin` en sonda olmalı
2. Metro'yu temizle: `npx expo start -c`
3. Uygulamayı yeniden derleyin

### Problem: Supabase hatası

**Çözüm:**
1. `.env` dosyasındaki Supabase URL ve API Key'i kontrol edin
2. Supabase Dashboard'da yeni sütunların eklendiğini doğrulayın
3. Internet bağlantınızı kontrol edin

### Problem: TypeScript hatası

**Çözüm:**
```bash
npm run tsc --noEmit
```

Hataları kontrol edin ve düzeltin.

---

## 📊 7. VERİTABANI KONTROL

Supabase Dashboard'da kontrol edin:

### messages tablosu

Şu sütunlar olmalı:
- `id` (uuid)
- `task_id` (uuid)
- `sender_name` (text)
- `message_type` (text)
- `transcript` (text)
- `created_at` (timestamptz)
- **`status`** (text) - YENİ
- **`read_at`** (timestamptz) - YENİ
- **`is_starred`** (boolean) - YENİ
- **`reply_to_id`** (uuid) - YENİ

### tasks tablosu

Şu sütunlar olmalı:
- `id` (uuid)
- `title` (text)
- `status` (text)
- `priority` (text)
- `assigned_to` (text)
- `created_by` (text)
- `workspace_id` (uuid)
- `created_at` (timestamptz)
- **`is_pinned`** (boolean) - YENİ

---

## 🎯 8. PRODUCTION CHECKLIST

Uygulamayı production'a almadan önce:

- [ ] Tüm SQL migration'lar çalıştırıldı
- [ ] Paketler yüklendi (`npm install`)
- [ ] Cache temizlendi (`npx expo start -c`)
- [ ] iOS'ta test edildi
- [ ] Android'de test edildi
- [ ] Tüm swipe aksiyonları çalışıyor
- [ ] Mesaj özellikleri (yıldız, reply, okundu) çalışıyor
- [ ] Error handling kontrol edildi
- [ ] TypeScript hataları yok
- [ ] Linter hataları yok

---

## 📝 9. YAPILAN DEĞİŞİKLİKLER

### Değiştirilen Dosyalar:

1. ✅ `supabase-migrations.sql` - Yeni
2. ✅ `app/task/[id].tsx` - Güncellendi
3. ✅ `app/(tabs)/index.tsx` - Güncellendi
4. ✅ `app/_layout.tsx` - Güncellendi
5. ✅ `package.json` - Güncellendi
6. ✅ `WHATSAPP_FEATURES.md` - Yeni
7. ✅ `SETUP_INSTRUCTIONS.md` - Yeni (bu dosya)

### Eklenen Özellikler:

**Görev Detay:**
- Okundu işaretleri (sent/delivered/read)
- Uzun basma menüsü
- Yıldızlı mesajlar
- Yanıtlama (reply)
- "Yazıyor..." göstergesi

**Ana Ekran:**
- Swipeable (sola/sağa kaydırma)
- Sabitleme özelliği
- Akıllı sıralama (sabitli > acil > normal)

---

## 🆘 10. DESTEK

Sorun yaşarsanız:

1. **Loglara bakın:** Console'da hata mesajları var mı?
2. **Supabase kontrol:** Veritabanı bağlantısı çalışıyor mu?
3. **Cache temizle:** `npx expo start -c`
4. **Yeniden yükle:** Uygulamayı tamamen kapatıp açın

---

## ✨ İYİ KODLAMALAR!

Tüm özelliklerin başarıyla çalışması için bu talimatları sırayla takip edin.

**Önemli:** İlk çalıştırmada mutlaka cache'i temizleyin (`-c` flag ile).

---

**Geliştirici:** KALFA Team  
**Versiyon:** v0.3.0  
**Tarih:** 2026-02-03
