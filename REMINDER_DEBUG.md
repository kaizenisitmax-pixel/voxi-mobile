# 🔔 HATIRLATMA SİSTEMİ DEBUG REHBERİ

## ✅ YAPILAN DEĞİŞİKLİKLER

### app/task/[id].tsx - sendMessage Fonksiyonu

**Eklenеn Debug Log'ları:**

1. **Hatırlatma kontrolü başlangıcı:**
   ```
   🔍 Hatırlatma kontrolü başlıyor. MessageId: xyz123
   ```

2. **detectReminder sonucu:**
   ```
   🔍 detectReminder sonucu: { date: '2026-02-04', note: 'Ali yarın aramalı' }
   ```

3. **Hatırlatma algılandı:**
   ```
   🔔 Hatırlatma algılandı: { date: '2026-02-04', ... }
   ```

4. **Supabase insert sonucu:**
   ```
   🔔 Reminder insert sonucu: { data: [...], error: null }
   ```

5. **Başarılı kayıt:**
   ```
   ✅ Hatırlatma başarıyla kaydedildi
   ```

6. **Algılanmadı:**
   ```
   ℹ️ Mesajda hatırlatma algılanmadı
   ```

7. **Hata durumu:**
   ```
   ❌ Hatırlatma kaydetme hatası: [error detayı]
   ```

---

## 🧪 TEST SENARYOLARI

### Test 1: "Yarın" Kelimesi
```
Mesaj: "Ali yarın aramalı"

Beklenen Console Log'lar:
✉️ MESAJ GÖNDERİLİYOR: Ali yarın aramalı task_id: abc123
✅ Mesaj kaydedildi: msg-xyz
🔍 Hatırlatma kontrolü başlıyor. MessageId: msg-xyz
🔍 Hatırlatma algılama: Ali yarın aramalı
✅ Yarın algılandı: { date: '2026-02-04', note: 'Ali yarın aramalı' }
🔍 detectReminder sonucu: { date: '2026-02-04', note: 'Ali yarın aramalı' }
🔔 Hatırlatma algılandı: { date: '2026-02-04', note: 'Ali yarın aramalı' }
🔔 Reminder insert sonucu: { data: [...], error: null }
✅ Hatırlatma başarıyla kaydedildi

Alert: "🔔 Hatırlatma Oluşturuldu - 4 Şubat için hatırlatma ayarlandı"
```

### Test 2: "Haftaya" Kelimesi
```
Mesaj: "Haftaya toplantı"

Beklenen:
✅ Haftaya algılandı: { date: '2026-02-10', note: 'Haftaya toplantı' }
Alert: "10 Şubat için hatırlatma ayarlandı"
```

### Test 3: Tarih Formatı
```
Mesaj: "15 Şubat toplantı var"

Beklenen:
✅ Tarih formatı algılandı (Ay adı): { date: '2026-02-15', note: '...' }
Alert: "15 Şubat için hatırlatma ayarlandı"
```

### Test 4: Hatırlatma Yok
```
Mesaj: "Kablolar hazır"

Beklenen:
ℹ️ Hatırlatma algılanmadı
🔍 detectReminder sonucu: null
ℹ️ Mesajda hatırlatma algılanmadı
(Alert gösterilmez)
```

---

## 🔍 SORUN GİDERME

### 1. Hatırlatma Algılanmıyor

**Kontrol Et:**
- Console'da `🔍 Hatırlatma algılama:` log'u var mı?
- Mesajda "yarın", "haftaya" veya tarih formatı var mı?
- Türkçe karakterler doğru mu? (küçük harfe çevrilir)

**Örnek:**
```javascript
// ✅ Çalışır
"Ali yarın aramalı"
"haftaya toplantı"
"15 Şubat"

// ❌ Çalışmaz
"Ali yarin aramalı" (Türkçe karakter yok)
"next week" (İngilizce)
```

### 2. Hatırlatma Kaydedilmiyor

**Kontrol Et:**
- Console'da `🔔 Reminder insert sonucu:` log'unu kontrol et
- `error` kısmı null mı?
- Supabase'de `reminders` tablosu var mı?

**SQL Kontrolü:**
```sql
-- Supabase'de çalıştır:
SELECT * FROM reminders ORDER BY created_at DESC LIMIT 10;
```

### 3. Alert Gösterilmiyor

**Kontrol Et:**
- Console'da `✅ Hatırlatma başarıyla kaydedildi` var mı?
- `reminderError` null mı?
- Alert.alert çalışıyor mu?

---

## 📊 SUPABASE YAPISI

### reminders Tablosu

```sql
CREATE TABLE reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  remind_at date NOT NULL,
  note text,
  is_done boolean DEFAULT false,
  created_by text DEFAULT 'Volkan',
  created_at timestamptz DEFAULT now()
);

-- İndeksler
CREATE INDEX idx_reminders_task_id ON reminders(task_id);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at) WHERE is_done = false;
```

### Kontrol Sorguları

```sql
-- Tüm hatırlatmaları göster
SELECT 
  r.*,
  t.title as task_title,
  m.transcript as message_text
FROM reminders r
LEFT JOIN tasks t ON r.task_id = t.id
LEFT JOIN messages m ON r.message_id = m.id
ORDER BY r.created_at DESC;

-- Bugünkü hatırlatmalar
SELECT * FROM reminders 
WHERE remind_at = CURRENT_DATE 
AND is_done = false;

-- Yaklaşan hatırlatmalar
SELECT * FROM reminders 
WHERE remind_at >= CURRENT_DATE 
AND is_done = false
ORDER BY remind_at ASC;
```

---

## 🔧 KOD İNCELEMESİ

### sendMessage İş Akışı

```typescript
async function sendMessage() {
  // 1. Boş kontrol
  if (!input.trim()) return;
  
  // 2. Mesajı Supabase'e kaydet
  const { data, error } = await supabase.from('messages').insert([{
    task_id: id,
    sender_name: 'Volkan',
    message_type: 'text',
    transcript: text,
    ai_response: '',
    status: 'sent',
    reply_to_id: replyTo?.id || null,
    created_at: new Date().toISOString(),
  }]).select();
  
  if (error) {
    Alert.alert('Hata', 'Mesaj gönderilemedi');
    return;
  }
  
  // 3. Hatırlatma algılama
  const messageId = data?.[0]?.id;
  if (messageId) {
    const reminder = await detectReminder(text);
    
    if (reminder) {
      // 4. Hatırlatmayı kaydet
      const { error: reminderError } = await supabase
        .from('reminders')
        .insert([{
          task_id: id,
          message_id: messageId,
          remind_at: reminder.date,
          note: reminder.note,
          created_by: 'Volkan',
        }])
        .select();
      
      // 5. Alert göster
      if (!reminderError) {
        Alert.alert('🔔 Hatırlatma Oluşturuldu', '...');
      }
    }
  }
  
  // 6. Ekranı temizle
  setInput('');
  setReplyTo(null);
  setIsTyping(false);
  await fetchMessages();
}
```

---

## 🎯 KRİTİK KONTROL LİSTESİ

Test yaparken şunları kontrol et:

- [ ] Console'da `✉️ MESAJ GÖNDERİLİYOR:` log'u görünüyor mu?
- [ ] Mesaj kaydedildi log'u var mı?
- [ ] `🔍 Hatırlatma kontrolü başlıyor` log'u var mı?
- [ ] `messageId` null değil mi?
- [ ] `detectReminder` çağrılıyor mu?
- [ ] detectReminder sonucu log'lanıyor mu?
- [ ] Eğer hatırlatma algılandıysa insert log'u var mı?
- [ ] Insert sonucu error içeriyor mu?
- [ ] Alert gösteriliyor mu?
- [ ] Supabase'de yeni kayıt oluştu mu?

---

## 📱 TEST ADIMLARI

1. **Uygulamayı Başlat:**
   ```bash
   npx expo start --clear
   ```

2. **Görev Detay Sayfasına Git:**
   - Ana ekrandan bir görev seç
   - Veya yeni görev oluştur

3. **Test Mesajı Gönder:**
   ```
   "Ali yarın aramalı"
   ```

4. **Console Log'ları Kontrol Et:**
   - Expo Developer Tools'u aç
   - Console sekmesine bak
   - Yukarıdaki log'ların hepsini görmeli sin

5. **Supabase Kontrol:**
   - Supabase Dashboard → reminders tablosu
   - Yeni kayıt olduğunu doğrula

6. **Alert Kontrolü:**
   - Ekranda "🔔 Hatırlatma Oluşturuldu" alert'i çıkmalı

---

## 🐛 MUHTEMEL HATALAR

### Hata 1: "reminders tablosu yok"
```
error: relation "reminders" does not exist
```
**Çözüm:** Supabase'de reminders tablosunu oluştur (SQL yukarıda)

### Hata 2: "Foreign key constraint"
```
error: insert or update on table "reminders" violates foreign key constraint
```
**Çözüm:** task_id veya message_id geçerli değil, kontrol et

### Hata 3: "Column 'message_id' does not exist"
```
error: column "message_id" of relation "reminders" does not exist
```
**Çözüm:** reminders tablosuna message_id sütunu ekle:
```sql
ALTER TABLE reminders ADD COLUMN message_id uuid REFERENCES messages(id) ON DELETE SET NULL;
```

### Hata 4: "detectReminder is not a function"
```
TypeError: detectReminder is not a function
```
**Çözüm:** Import kontrolü yap:
```typescript
import { detectReminder, summarizeTask } from '../../lib/ai';
```

---

## ✅ BAŞARILI TEST ÖRNEĞİ

```
[Console Output]
✉️ MESAJ GÖNDERİLİYOR: Ali yarın aramalı task_id: abc-123
✅ Mesaj kaydedildi: msg-xyz
🔍 Hatırlatma kontrolü başlıyor. MessageId: msg-xyz
🔍 Hatırlatma algılama: Ali yarın aramalı
✅ Yarın algılandı: { date: '2026-02-04', note: 'Ali yarın aramalı' }
🔍 detectReminder sonucu: { date: '2026-02-04', note: 'Ali yarın aramalı' }
🔔 Hatırlatma algılandı: { date: '2026-02-04', note: 'Ali yarın aramalı' }
🔔 Reminder insert sonucu: { 
  data: [{ 
    id: 'rem-123', 
    task_id: 'abc-123', 
    message_id: 'msg-xyz',
    remind_at: '2026-02-04',
    note: 'Ali yarın aramalı',
    created_by: 'Volkan'
  }], 
  error: null 
}
✅ Hatırlatma başarıyla kaydedildi

[Alert Ekranda]
🔔 Hatırlatma Oluşturuldu
4 Şubat için hatırlatma ayarlandı
[Tamam]
```

---

## 📞 DESTEK

Hala çalışmıyorsa:

1. **Console log'larının tamamını** kopyala
2. **Supabase'den reminders tablosunu** kontrol et:
   ```sql
   SELECT * FROM reminders ORDER BY created_at DESC LIMIT 5;
   ```
3. **Hata mesajlarını** paylaş

---

**Güncelleme:** 2026-02-03  
**Durum:** ✅ Tüm debug log'ları eklendi  
**Test:** Hazır
