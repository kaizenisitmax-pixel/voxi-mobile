# KALFA/Voxi - WhatsApp Tarzı İletişim Özellikleri

Bu dokümanda KALFA uygulamasına eklenen WhatsApp tarzı özellikler açıklanmaktadır.

## 📋 İÇİNDEKİLER

1. [Supabase Migration](#supabase-migration)
2. [Görev Detay Özellikleri](#görev-detay-özellikleri)
3. [Ana Ekran Özellikleri](#ana-ekran-özellikleri)
4. [Kurulum](#kurulum)

---

## 🗄️ SUPABASE MIGRATION

Öncelikle `supabase-migrations.sql` dosyasındaki SQL komutlarını Supabase Dashboard'da çalıştırın:

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
```

---

## 💬 GÖREV DETAY ÖZELLİKLERİ

### 1. **Okundu İşaretleri**

Mesaj balonlarının sağ altında durum göstergesi:

- **✓** (Gri): `sent` - Gönderildi
- **✓✓** (Gri): `delivered` - İletildi
- **✓✓** (Mavi): `read` - Okundu

```typescript
status: 'sent' | 'delivered' | 'read'
```

### 2. **Mesaj Menüsü (Uzun Basma)**

Mesaja uzun basınca açılan menü:

- **📋 Kopyala**: Mesajı kopyala
- **⭐ Yıldızla / Yıldızı Kaldır**: Mesajı yıldızlı işaretle
- **↩️ Yanıtla**: Mesaja yanıt ver
- **🗑️ Sil**: Mesajı sil (sadece kendi mesajlarınızda)

### 3. **Yanıtlama (Reply)**

- Yanıtla seçeneğini seçince input'un üstünde referans mesaj gösterilir
- **X** butonu ile iptal edilebilir
- Yanıtlanan mesaj, mesaj balonunun üstünde küçük bir kutu olarak gösterilir
- `reply_to_id` olarak Supabase'e kaydedilir

```typescript
reply_to_id?: string;
reply_to?: Message;
```

### 4. **Yıldızlı Mesajlar**

- Yıldızlanan mesajlar **sarı arka plan** ile gösterilir
- Mesaj balonunun sağ üstünde **⭐** ikonu görünür
- `is_starred: true` olarak kaydedilir

### 5. **"Yazıyor..." Göstergesi**

- Input'a yazınca "Volkan yazıyor..." mesajı gösterilir
- 3 saniyelik timeout sonrası kaybolur
- 3 nokta animasyonu (●●●)

---

## 📱 ANA EKRAN ÖZELLİKLERİ

### 1. **Swipeable (Kaydırma) Aksiyonları**

#### Sola Kaydırma:
- **📌 Sabitle** (Mavi): Görevi sabitle/sabitlemeyi kaldır
- **✅ Tamamla** (Yeşil): Görevi tamamlandı olarak işaretle

#### Sağa Kaydırma:
- **🗑️ Sil** (Kırmızı): Görevi sil

```typescript
import { Swipeable } from 'react-native-gesture-handler';
```

### 2. **Sabitleme (Pin)**

- Sabitlenmiş görevler listenin **en üstünde** gösterilir
- Görev kartının yanında **📌** ikonu görünür
- `is_pinned: true` olarak kaydedilir

### 3. **Akıllı Sıralama**

Görevler şu öncelik sırasına göre listelenir:

1. **Sabitlenmiş görevler** (📌)
2. **Acil görevler** (🔥)
3. **Normal görevler**

```typescript
// Sıralama mantığı
filtered.sort((a, b) => {
  if (a.is_pinned && !b.is_pinned) return -1;
  if (!a.is_pinned && b.is_pinned) return 1;
  if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
  if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
  return 0;
});
```

---

## 🛠️ KURULUM

### 1. Gerekli Paketler

Aşağıdaki paketler zaten yüklü olmalı:

```json
{
  "react-native-gesture-handler": "~2.x.x",
  "react-native-reanimated": "~3.x.x"
}
```

Eğer yüklü değilse:

```bash
npm install react-native-gesture-handler react-native-reanimated
```

### 2. Babel Config

`babel.config.js` dosyasına Reanimated plugin ekleyin:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // En sonda olmalı
  };
};
```

### 3. Metro Config

`metro.config.js` dosyasında Gesture Handler yapılandırması:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
```

### 4. App Layout

`app/_layout.tsx` dosyasında GestureHandlerRootView sarmalı:

```typescript
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayoutNav() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ... */}
    </GestureHandlerRootView>
  );
}
```

---

## 📝 TYPESCRIPT TİPLERİ

### Message Interface

```typescript
interface Message {
  id: string;
  task_id: string;
  sender_name: string;
  message_type: 'text' | 'voice' | 'image' | 'file' | 'system';
  transcript: string;
  ai_response?: string;
  audio_url?: string;
  file_url?: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
  read_at?: string;
  is_starred?: boolean;
  reply_to_id?: string;
  reply_to?: Message;
}
```

### Task Interface

```typescript
interface Task {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'done';
  priority: 'urgent' | 'normal' | 'low';
  assigned_to: string;
  created_by: string;
  workspace_id: string;
  due_date?: string;
  created_at: string;
  is_pinned?: boolean;
  lastMessage?: {
    transcript: string;
    created_at: string;
    sender_name: string;
  } | null;
}
```

---

## 🎨 STIL ÖZELLİKLERİ

### Renk Paleti

- **Mavi** (`#2563EB`): Ana renk, okundu işareti
- **Yeşil** (`#059669`): Tamamlama, başarı
- **Kırmızı** (`#DC2626`): Silme, acil
- **Turuncu** (`#D97706`): Uyarı
- **Sarı** (`#FEF3C7`): Yıldızlı mesaj arka planı

### WhatsApp Tarzı Baloncuklar

- Kendi mesajları: Mavi arka plan, sağ taraf
- Diğer mesajlar: Beyaz arka plan, sol taraf
- Sistem mesajları: Gri, ortalanmış

---

## 🚀 KULLANIM SENARYOLARI

### 1. Mesaj Gönderme

```typescript
await supabase.from('messages').insert([{
  task_id: id,
  sender_name: 'Volkan',
  message_type: 'text',
  transcript: input.trim(),
  status: 'sent',
  reply_to_id: replyTo?.id || null,
  created_at: new Date().toISOString(),
}]);
```

### 2. Mesajı Yıldızlama

```typescript
await supabase
  .from('messages')
  .update({ is_starred: !currentStarred })
  .eq('id', messageId);
```

### 3. Görevi Sabitleme

```typescript
await supabase
  .from('tasks')
  .update({ is_pinned: !currentPinned })
  .eq('id', taskId);
```

### 4. Mesajları Okundu Yap

```typescript
await supabase
  .from('messages')
  .update({ status: 'read', read_at: new Date().toISOString() })
  .in('id', unreadMessageIds);
```

---

## 🐛 SORUN GİDERME

### Swipeable Çalışmıyor

1. `GestureHandlerRootView` sarmalını kontrol edin
2. `react-native-gesture-handler` paketinin doğru yüklendiğinden emin olun
3. Uygulamayı yeniden başlatın

### Animasyonlar Donuyor

1. `react-native-reanimated/plugin` Babel config'de en sonda olmalı
2. Metro bundle'ı temizleyin: `npx expo start -c`

### Mesajlar Güncellenmİyor

1. `useFocusEffect` hook'unun doğru kullanıldığını kontrol edin
2. Supabase bağlantısını test edin
3. Console'da hata loglarını kontrol edin

---

## ✅ TEST CHECKLISTESI

- [ ] Mesaj gönderme
- [ ] Okundu işaretleri gösteriliyor
- [ ] Mesaja uzun basma menüsü açılıyor
- [ ] Mesajı yıldızlama/kaldırma çalışıyor
- [ ] Yanıtlama özelliği çalışıyor
- [ ] "Yazıyor..." göstergesi görünüyor
- [ ] Sola/sağa kaydırma çalışıyor
- [ ] Görev sabitleme çalışıyor
- [ ] Görev tamamlama çalışıyor
- [ ] Görev silme çalışıyor
- [ ] Sıralama doğru (sabitli > acil > normal)

---

## 📚 EK KAYNAKLAR

- [React Native Gesture Handler Docs](https://docs.swmansion.com/react-native-gesture-handler/)
- [React Native Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- [Supabase Docs](https://supabase.com/docs)

---

**Geliştirici:** KALFA Team  
**Versiyon:** v0.3.0  
**Tarih:** 2026-02-03
