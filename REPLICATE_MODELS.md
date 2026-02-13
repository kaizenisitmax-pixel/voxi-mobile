# Replicate AI Modelleri

## Şu An Kullanılan Model

**`adirik/interior-design`** (Default)
- ✅ 1.8M+ çalıştırma
- ✅ Hızlı (6 saniye)
- ✅ Genel amaçlı iç mekan tasarımı
- ✅ Doğrulanmış ve güvenilir

## Model Parametreleri (Optimize Edildi)

```typescript
{
  strength: 0.8,        // Orijinal yapıyı koru (0-1)
  scale: 9.0,           // Prompt guidance (7-15)
  ddim_steps: 30,       // Kalite (20-50)
  image_resolution: 768 // Çözünürlük
}
```

### Parametreleri Ayarlama:

**`strength` (0.0 - 1.0)**
- `0.5` → Orijinale çok yakın, minimal değişiklik
- `0.8` → Dengeli (ŞU AN KULLANILAN)
- `1.0` → Agresif değişiklik, orijinal yapı bozulabilir

**`scale` (7.0 - 15.0)**
- `7.5` → Esnek, yaratıcı
- `9.0` → Dengeli (ŞU AN KULLANILAN)
- `12.0` → Katı prompt takibi, daha az yaratıcılık

**`ddim_steps` (20 - 50)**
- `20` → Hızlı, düşük kalite
- `30` → Dengeli (ŞU AN KULLANILAN)
- `50` → Yavaş, yüksek kalite

## Alternatif Modeller (Gelecek)

### 1. interior-design-ai (fofr)
```typescript
model: 'fofr/interior-design-ai:latest'
```
- ✅ Daha detaylı tasarımlar
- ✅ 500K+ çalıştırma
- ⚠️ Daha yavaş (10-15 saniye)

### 2. room-designer (jagilley)
```typescript
model: 'jagilley/controlnet-scribble:latest'
```
- ✅ Özel room detection
- ✅ Daha hassas yapı koruması
- ⚠️ Daha karmaşık setup

### 3. interior-sdxl (rocketdigitalai)
```typescript
model: 'rocketdigitalai/interior-design-sdxl:latest'
```
- ✅ Yüksek çözünürlük
- ⚠️ Çok yavaş (30+ saniye)
- ⚠️ Daha fazla VRAM

## Model Değiştirme

`services/replicate.ts` dosyasında:

```typescript
// 1. MODELS objesini güncelle
const MODELS = {
  interior_design: 'yeni-model-id:version',
};

// 2. startReplicatePrediction içinde
version: MODELS.interior_design.split(':')[1],
```

## Prompt Optimizasyonu

### Kategori Bazlı Context:
```typescript
ev → "residential interior"
ticari → "commercial space"
endustriyel → "industrial facility"
diger → "outdoor space"
```

### Tool-Specific Instructions:
- `redesign` → Tüm odayı yeniden tasarla
- `furnish` → Sadece mobilya ekle
- `remove_furniture` → Mobilyaları kaldır
- `wall_paint` → Sadece duvar rengi değiştir

### Negative Prompt:
```
"mixed room types, inconsistent style, extra rooms"
```
→ Odaların karışmasını önler (mutfak + banyo)

## Sorun Giderme

### Problem: Oda tipi karışıyor (mutfak → banyo)
**Çözüm:**
1. `strength` değerini düşür (`0.6-0.7`)
2. Negative prompt'a ekle: `"different room type, wrong room"`
3. Main prompt'a ekle: `"maintain kitchen layout"` veya `"keep bathroom fixtures"`

### Problem: Orijinal yapı bozuluyor
**Çözüm:**
1. `strength` → `0.6`
2. `scale` → `10.0`
3. Main prompt: `"preserve room structure and layout"`

### Problem: Görseller düşük kalite
**Çözüm:**
1. `ddim_steps` → `40`
2. `image_resolution` → `1024`
3. A_prompt: `"8k uhd, professional photography"`

## Test Senaryoları

### Test 1: Mutfak Tasarımı
```
Category: ev
Style: modern
Tool: redesign
Expected: Modern mutfak (banyo değil!)
```

### Test 2: Boş Oda Mobilyalama
```
Category: ev
Style: minimalist
Tool: furnish
Expected: Minimal mobilyalar, duvarlar değişmemeli
```

### Test 3: Ticari Ofis
```
Category: ticari
Style: ofis
Tool: furnish_commercial
Expected: Profesyonel ofis mobilyaları
```

## Gelecek İyileştirmeler

- [ ] Kullanıcıya model seçim özelliği (Settings'te)
- [ ] Room type auto-detection (AI ile oda tipini tespit et)
- [ ] Batch processing (birden fazla stil aynı anda)
- [ ] A/B test (2 farklı model, kullanıcı seçsin)
- [ ] Custom style training (kullanıcının kendi stilleri)

---

**Son Güncelleme:** 2026-02-13
**Mevcut Model:** adirik/interior-design:76604...
**Ortalama İşlem Süresi:** 6-8 saniye
