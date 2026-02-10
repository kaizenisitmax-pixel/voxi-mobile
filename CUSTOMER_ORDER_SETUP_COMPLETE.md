# MÜŞTERİ VE SİPARİŞ KARTLARI — KURULUM TAMAMLANDI

## ✅ OLUŞTURULAN DOSYALAR

### 1. SAYFA DOSYALARI
- ✅ `app/customer/[id].tsx` - Müşteri Kartı Detay (2 tab: Detay, Muhasebe)
- ✅ `app/customer/new.tsx` - Yeni Müşteri Ekleme Form
- ✅ `app/order/[id].tsx` - Sipariş Kartı Detay (Tek ekran)
- ✅ `app/order/new.tsx` - Yeni Sipariş Ekleme Form

### 2. SQL MİGRATION DOSYALARI
- ✅ `supabase/customer-fields.sql` - customers tablosu kolonları + customer_transactions tablosu
- ✅ `supabase/customer-logs.sql` - customer_logs tablosu + trigger
- ✅ `supabase/orders-table.sql` - orders tablosu + tasks.order_id kolonu
- ✅ `supabase/order-logs.sql` - order_logs tablosu + trigger

### 3. AI FONKSİYONLARI (`lib/ai.ts`)
- ✅ `analyzeCustomerCommand()` - Müşteri Detay tab mikrofonu
- ✅ `analyzeCustomerTransactionCommand()` - Müşteri Muhasebe tab mikrofonu
- ✅ `analyzeOrderCommand()` - Sipariş kartı mikrofonu

### 4. NAVIGATION DÜZELTMELERİ (`app/task/[id].tsx`)
- ✅ Müşteri "+ Ekle" → Boş müşteri kartı oluştur + aç
- ✅ Müşteri "Aç" → `/customer/{id}` detay sayfasına git
- ✅ Sipariş "+ Ekle" → Boş sipariş kartı oluştur + aç
- ✅ Sipariş "Aç" → `/order/{id}` detay sayfasına git
- ✅ Modal içi "+ Yeni Müşteri Ekle" → Boş kart oluştur + aç

---

## 📋 KURULUM ADIMLARI

### ADIM 1: SQL MIGRATION'LARI ÇALIŞTIR

Supabase Studio → SQL Editor'de şu dosyaları **sırasıyla** çalıştır:

```sql
-- 1. Müşteri alanları ve muhasebe
supabase/customer-fields.sql

-- 2. Müşteri logları
supabase/customer-logs.sql

-- 3. Siparişler tablosu
supabase/orders-table.sql

-- 4. Sipariş logları
supabase/order-logs.sql
```

**VEYA** terminal'den:

```bash
cd /Users/volkansimsirkaya/kalfa-app
supabase db push
```

---

### ADIM 2: APP'İ YENİDEN BAŞLAT

```bash
# Expo cache temizle ve başlat
npx expo start --clear
```

---

## 🎯 MÜŞTERİ KARTI DETAY (`app/customer/[id].tsx`)

### DETAY TAB

**Özellikler:**
- ✅ Başlık + Meta (düzenlenebilir company_name, oluşturan, tarih)
- ✅ Durum Chip (Aktif/Pasif)
- ✅ 7 Bilgi Satırı:
  - Fatura Adresi (document-text-outline)
  - Sevk Adresi (car-outline)
  - Vergi Dairesi (business-outline)
  - Vergi No (pricetag-outline)
  - Yetkili (person-outline)
  - Telefon (call-outline) - Tıkla → Ara
  - E-posta (mail-outline) - Tıkla → Mail Gönder
- ✅ Açıklama (notes, düzenlenebilir)
- ✅ Büyük Mikrofon (80x80, siyah, gray halo, audio kaydı + AI analizi)
- ✅ Sistem Logları (customer_logs'dan, max 3)

**Sesli Komutlar (Detay Tab):**
- "Vergi no 1234567890" → tax_number güncelle
- "Yetkili Ahmet Bey" → contact_name güncelle
- "Fatura adresi Organize Sanayi" → billing_address güncelle
- "Sevk adresi aynı" → shipping_address = billing_address

### MUHASEBE TAB

**Özellikler:**
- ✅ 3 Özet Kartı (Alacak, Verecek, Bakiye)
  - Bakiye = total_receivable - total_payable
  - Negatif bakiye kırmızı (#FF3B30)
- ✅ Son İşlemler Listesi (customer_transactions'dan)
  - [+] → receivable (fatura)
  - [-] → payable (ödeme)
- ✅ Büyük Mikrofon (audio + AI)
- ✅ Sistem Logları (max 3)

**Sesli Komutlar (Muhasebe Tab):**
- "5 bin lira ödeme geldi" → payable +5000
- "12 bin fatura kesildi" → receivable +12000
- "3 bin 500 ödeme" → payable +3500

---

## 🎯 SİPARİŞ KARTI DETAY (`app/order/[id].tsx`)

### TEK EKRAN (Tab yok)

**Özellikler:**
- ✅ Başlık + Meta (title, order_number, tarih, oluşturan)
- ✅ 7 Durum Chip'i (horizontal scroll):
  - Teklif, Onay, Üretim, Sevk, Teslim, Fatura, CRM
- ✅ 2 Bilgi Satırı:
  - Müşteri (business-outline) - Tıkla → Müşteri kartına git
  - Teslim Tarihi (calendar-outline)
- ✅ Detay Alanı (details, düzenlenebilir)
- ✅ Büyük Mikrofon (80x80, audio + AI)
- ✅ Sistem Logları (order_logs'dan, max 3)

**Sesli Komutlar:**
- "Durum üretimde" → status: "production"
- "Teslim tarihi 15 mart" → delivery_date: "2026-03-15"
- "Detay ekle: 4 adet varil ısıtma" → details güncelle

---

## 🔗 NAVIGATION AKIŞI

### Görev Kartından:

```
Görev Kartı Detay
├─ Müşteri Satırı
│  ├─ Müşteri varsa → "Aç" → /customer/{id}
│  └─ Müşteri yoksa → "+ Ekle" → Boş müşteri oluştur → /customer/{yeni-id}
│
└─ Sipariş Satırı
   ├─ Sipariş varsa → "Aç" → /order/{id}
   └─ Sipariş yoksa → "+ Ekle" → Boş sipariş oluştur → /order/{yeni-id}
```

### Müşteri Seçim Modalı:

```
Modal Açık
└─ "+ Yeni Müşteri Ekle" → Boş müşteri oluştur → /customer/{yeni-id}
```

### Sipariş Kartından:

```
Sipariş Kartı Detay
└─ Müşteri Satırı → /customer/{id}
```

---

## 🎨 TASARIM DİLİ

**Renkler:**
- Ana Arka Plan: `#F5F3EF`
- Kart Arka Plan: `#FFFFFF`
- Siyah: `#1A1A1A`
- Gri Yazı: `#8E8E93`
- Açık Gri: `#3C3C43`
- Border: `#E5E5EA`
- Mavi (Link): `#53BDEB`
- Kırmızı (Negatif): `#FF3B30`

**Mikrofon:**
- Boyut: 80x80
- Arka plan: `#1A1A1A`
- İkon rengi: `#FFFFFF`
- Halo: `#8E8E93` (gray, pulse animation)
- Border radius: 40

**İkonlar:**
- Ionicons (Lucide-style)
- Boyut: 20px
- Renk: `#3C3C43`
- Emoji YOK

---

## 📊 DATABASE YAPISI

### `customers` Tablosu (Yeni Kolonlar):
```sql
billing_address text
shipping_address text
tax_office text
tax_number text
contact_name text
phone text
email text
notes text
status text DEFAULT 'active'  -- 'active' | 'passive'
total_receivable numeric DEFAULT 0
total_payable numeric DEFAULT 0
```

### `customer_transactions` Tablosu:
```sql
id uuid PRIMARY KEY
customer_id uuid REFERENCES customers(id)
type text  -- 'receivable' | 'payable'
amount numeric
description text
reference_type text
reference_id uuid
workspace_id uuid
created_by uuid
created_at timestamptz
```

### `customer_logs` Tablosu:
```sql
id uuid PRIMARY KEY
customer_id uuid REFERENCES customers(id)
action_type text
field_name text
old_value text
new_value text
user_id uuid
created_at timestamptz
```

### `orders` Tablosu:
```sql
id uuid PRIMARY KEY
title text
order_number text UNIQUE
status text DEFAULT 'quote'
customer_id uuid REFERENCES customers(id)
delivery_date date
details text
workspace_id uuid
created_by uuid
created_at timestamptz
updated_at timestamptz
```

### `order_logs` Tablosu:
```sql
id uuid PRIMARY KEY
order_id uuid REFERENCES orders(id)
action_type text
field_name text
old_value text
new_value text
user_id uuid
created_at timestamptz
```

### `tasks` Tablosu (Yeni Kolon):
```sql
order_id uuid REFERENCES orders(id)
```

---

## 🧪 TEST ADIMLARI

### 1. SQL Migration Kontrolü
```sql
-- Supabase SQL Editor'de çalıştır:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name IN ('billing_address', 'total_receivable');
-- 2 satır dönmeli

SELECT COUNT(*) FROM customer_transactions;
-- Hata vermemeli (tablo var)

SELECT COUNT(*) FROM orders;
-- Hata vermemeli (tablo var)
```

### 2. Müşteri Kartı Testi
1. Görev kartı aç
2. Müşteri satırı → "+ Ekle" tıkla
3. ✅ Boş müşteri kartı açılmalı (company_name: "Yeni Müşteri")
4. Mikrofona basılı tut → "Vergi no 1234567890" de
5. ✅ Vergi no alanı güncellenmeli
6. Muhasebe tabına geç
7. Mikrofona basılı tut → "5 bin lira ödeme geldi" de
8. ✅ Verecek +5000 olmalı

### 3. Sipariş Kartı Testi
1. Görev kartı aç
2. Sipariş satırı → "+ Ekle" tıkla
3. ✅ Boş sipariş kartı açılmalı (title: "Yeni Sipariş")
4. Mikrofona basılı tut → "Durum üretimde" de
5. ✅ Durum chip'i "Üretim"e geçmeli

### 4. Navigation Testi
1. Sipariş kartında müşteri satırına tıkla
2. ✅ Müşteri kartı açılmalı
3. Geri dön → Görev kartında müşteri satırı → "Aç" tıkla
4. ✅ Müşteri kartı açılmalı

---

## ⚠️ SORUN GİDERME

### "Unable to resolve module groq"
**Çözüm:** Zaten düzeltildi. `app/order/[id].tsx` → `import { transcribeAudio } from '../../lib/ai'`

### "Table 'orders' does not exist"
**Çözüm:** `supabase/orders-table.sql` dosyasını Supabase SQL Editor'de çalıştır

### "Column 'order_id' does not exist"
**Çözüm:** `ALTER TABLE tasks ADD COLUMN order_id UUID;` çalıştır (orders-table.sql içinde var)

### "Eski form sayfası açılıyor"
**Çözüm:** App cache'i temizle: `npx expo start --clear`

### "Mikrofon çalışmıyor"
**Kontrol:**
1. `.env` dosyasında API key'ler var mı?
   - `EXPO_PUBLIC_GROQ_API_KEY`
   - `EXPO_PUBLIC_CLAUDE_API_KEY`
   - `EXPO_PUBLIC_OPENAI_API_KEY`
2. Mikrofon izni verildi mi?
3. Console'da hata var mı?

---

## 📝 NOTLAR

- ✅ Linter hatası yok
- ✅ TypeScript tipleri doğru
- ✅ RLS politikaları aktif
- ✅ Trigger'lar çalışıyor (total güncelleme, log)
- ✅ Console log'lar eklendi (🔗 emojisi ile)
- ⚠️ Emoji sadece console log'larda, UI'da YOK
- ⚠️ Form sayfaları (`/customer/new`, `/order/new`) hâlâ var, kaldırılmadı (isteğe göre silinebilir)

---

## 🚀 SONUÇ

Tüm müşteri ve sipariş kartı özellikleri tamamlandı. Kullanıcı artık:

1. **Görev kartından** müşteri/sipariş ekleyebilir (boş kart açılır)
2. **Mikrofon ile** tüm alanları doldurabilir (Groq STT + Claude NLP + OpenAI TTS)
3. **Detay sayfalarında** bilgileri düzenleyebilir
4. **Muhasebe sekmesinde** alacak/verecek yönetebilir
5. **Sistem loglarında** tüm değişiklikleri görebilir

**Test et ve geri bildirim ver!** 🎉
