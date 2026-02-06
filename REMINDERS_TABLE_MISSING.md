# ⚠️ HATIRLATMA SİSTEMİ SORUNU

## 🔴 SORUN
Ana sayfada hatırlatıcı görünmüyor.

## 🔍 NEDEN
Supabase'de **`reminders` tablosu oluşturulmamış**.

Kod hazır ama tablo olmadığı için hatırlatmalar yüklenemiyor.

---

## ✅ ÇÖZÜM

### 1. Supabase'e Git
https://supabase.com → Projen → SQL Editor

### 2. Bu SQL'i Çalıştır

```sql
-- REMINDERS TABLOSU OLUŞTURMA
CREATE TABLE IF NOT EXISTS reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  remind_at date NOT NULL,
  note text,
  is_done boolean DEFAULT false,
  created_by text DEFAULT 'Volkan',
  created_at timestamptz DEFAULT now()
);

-- İndeksler (performans için)
CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at) WHERE is_done = false;
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON reminders(created_by);

-- RLS (Row Level Security) - Gerekirse
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Herkes okuyabilir (workspace bazlı filtre eklenebilir)
CREATE POLICY "Enable read access for all users" ON reminders
  FOR SELECT USING (true);

-- Policy: Herkes ekleyebilir
CREATE POLICY "Enable insert access for all users" ON reminders
  FOR INSERT WITH CHECK (true);

-- Policy: Kendi oluşturduğu hatırlatmaları güncelleyebilir
CREATE POLICY "Enable update for creator" ON reminders
  FOR UPDATE USING (created_by = current_user::text);

-- Kontrol: Tablo oluştu mu?
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'reminders';
```

### 3. Kontrol Et

```sql
-- Tüm hatırlatmaları göster
SELECT * FROM reminders ORDER BY created_at DESC;

-- Bugünkü hatırlatmalar
SELECT * FROM reminders 
WHERE remind_at = CURRENT_DATE 
AND is_done = false;
```

---

## 🧪 TEST

### 1. Tablo Oluşturulduktan Sonra

1. **Uygulamayı yeniden başlat:**
   ```bash
   npx expo start -c
   ```

2. **Bir göreve git**

3. **Hatırlatmalı mesaj gönder:**
   ```
   "Ali yarın aramalı"
   ```

4. **Console'da şu log'ları göreceksin:**
   ```
   ✅ MESAJ KAYDEDİLDİ (görev oluşturulmadı!)
   🔍 Hatırlatma sonucu: { date: '2026-02-04', note: 'Ali yarın aramalı' }
   Alert: 🔔 Hatırlatma
   ```

5. **Supabase'de kontrol et:**
   ```sql
   SELECT * FROM reminders;
   ```
   1 kayıt görmelisin ✅

### 2. Ana Sayfada Kontrol

1. **Ana sayfaya dön**

2. **Console'da şu log'ları göreceksin:**
   ```
   🔔 Bugünkü hatırlatmalar getiriliyor: 2026-02-04
   ✅ Hatırlatma sorgusu başarılı. Bulunan: 1
   🔔 Bugün 1 hatırlatma var
   ```

3. **Header'da göreceksin:**
   ```
   5 açık görev • 2 acil • 🔔 1 hatırlatma
   ```

4. **Görev kartında 🔔 ikonu görünecek**

---

## 🔍 SORUN GİDERME

### Sorun 1: Tablo Oluşturuldu Ama Hala Hata Var

**Console'da ne görüyorsun?**

```
❌ Hatırlatma yükleme hatası: [error detayı]
⚠️ Supabase'de reminders tablosu var mı kontrol et!
```

**Çözüm:**
- Supabase'de tabloyu kontrol et:
  ```sql
  SELECT * FROM reminders;
  ```
- RLS (Row Level Security) açıksa policy'leri kontrol et

### Sorun 2: "permission denied for table reminders"

**Çözüm:**
```sql
-- RLS'yi kapat (geliştirme için)
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;

-- Veya policy ekle
CREATE POLICY "Enable all access" ON reminders
  FOR ALL USING (true);
```

### Sorun 3: Foreign Key Hatası

**Hata:**
```
relation "tasks" does not exist
```

**Çözüm:**
- tasks tablosu var mı kontrol et
- Yoksa önce tasks tablosunu oluştur

---

## 📊 BEKLENEN CONSOLE LOG'LARI

### Başarılı Durum (Hatırlatma Var):
```
🔔 Bugünkü hatırlatmalar getiriliyor: 2026-02-04
✅ Hatırlatma sorgusu başarılı. Bulunan: 3
🔔 Bugün 3 hatırlatma var
```

### Başarılı Durum (Hatırlatma Yok):
```
🔔 Bugünkü hatırlatmalar getiriliyor: 2026-02-04
✅ Hatırlatma sorgusu başarılı. Bulunan: 0
ℹ️ Bugün hatırlatma yok
```

### Hatalı Durum (Tablo Yok):
```
🔔 Bugünkü hatırlatmalar getiriliyor: 2026-02-04
❌ Hatırlatma yükleme hatası: { code: '42P01', message: 'relation "reminders" does not exist' }
⚠️ Supabase'de reminders tablosu var mı kontrol et!
```

---

## 🎯 ÖZET

1. ✅ Kod hazır
2. ❌ Supabase'de reminders tablosu YOK
3. ✅ Yukarıdaki SQL'i çalıştır
4. ✅ Uygulamayı test et

---

## 📝 TABLO ŞEMASI

```
reminders
├── id (uuid, PK)
├── task_id (uuid, FK → tasks.id)
├── message_id (uuid, FK → messages.id, nullable)
├── remind_at (date) ← Hatırlatma tarihi
├── note (text) ← Hatırlatma notu
├── is_done (boolean, default: false)
├── created_by (text, default: 'Volkan')
└── created_at (timestamptz, default: now())
```

---

## ✅ KONTROL LİSTESİ

- [ ] Supabase'e girdim
- [ ] SQL Editor'ı açtım
- [ ] Yukarıdaki SQL'i kopyaladım
- [ ] "Run" butonuna bastım
- [ ] "Success" mesajı gördüm
- [ ] `SELECT * FROM reminders;` çalıştırdım
- [ ] Tablo görünüyor ✅
- [ ] Uygulamayı yeniden başlattım
- [ ] Console'da log'ları kontrol ettim
- [ ] Ana sayfada hatırlatma göstergesi görünüyor ✅

---

**Önemli:** Bu SQL'i çalıştırmadan hatırlatma sistemi **ÇALIŞMAZ**!

**Şu anda durum:**
- ✅ Frontend kodu hazır (index.tsx)
- ✅ Backend kodu hazır (detectReminder)
- ❌ Database tablosu YOK ← BU EKSİK!

SQL'i çalıştır, sorun çözülecek! 🚀
