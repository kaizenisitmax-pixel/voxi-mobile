# 🐛 FİLTRE DEBUG MODU AKTİF

`app/(tabs)/index.tsx` dosyasında filtre chip'leri DEBUG moduna alındı.

---

## 🎨 DEBUG RENKLERİ

Şu anda filtre chip'leri şu şekilde görünmeli:

```
ScrollView container: 🟨 SARI (#FFFF00)
Aktif chip: 🟥 KIRMIZI (#FF0000) + Beyaz text (#FFFFFF)
Pasif chip: 🟩 YEŞİL (#00FF00) + Siyah text (#000000)
```

**Font boyutu:** 16px (büyütüldü)
**Font ağırlığı:** 600 (bold)

---

## 🧪 TEST ADIMI

1. Expo'da reload: `r`
2. Ana ekrana git
3. **GÖRDÜĞÜN:**

### Senaryo 1: Renkli chip'ler görünüyor ✅
```
🟨🟨🟨🟨🟨🟨🟨🟨 (sarı arka plan)
  🟥 Tümü   🟩 Acil   🟩 Normal   🟩 Bugün
```
**SONUÇ:** Stil sistemi çalışıyor! Sorun önceki stil referanslarındaydı.

### Senaryo 2: Hâlâ siyah bar görünüyor ❌
```
⬛⬛⬛⬛⬛⬛⬛⬛ (siyah bar, hiçbir renk yok)
```
**SONUÇ:** Sorun başka bir yerdedir:
- Üstte başka bir View olabilir (overlay)
- Header veya Search'ün altı kapatıyor olabilir
- Z-index sorunu olabilir

### Senaryo 3: Sarı arka plan var, chip'ler yok 🤔
```
🟨🟨🟨🟨🟨🟨🟨🟨 (sarı arka plan)
(chip'ler görünmüyor)
```
**SONUÇ:** FILTERS array'i boş veya map çalışmıyor.

---

## 📝 MEVCUT DEBUG KODU

```tsx
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{
    paddingHorizontal: 20,
    marginVertical: 10,
    gap: 8,
    backgroundColor: '#FFFF00', // DEBUG: Sarı
  }}
>
  {FILTERS.map((f) => (
    <TouchableOpacity
      key={f}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: filter === f ? '#FF0000' : '#00FF00', // DEBUG: Kırmızı/Yeşil
      }}
      onPress={() => setFilter(f)}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: filter === f ? '#FFFFFF' : '#000000', // DEBUG: Beyaz/Siyah
        }}
      >
        {f}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

---

## 🔄 SONRAKI ADIMLAR

### Eğer renkli chip'ler görünüyorsa:
✅ Stil sistemi çalışıyor! Normal renklere geri dönebiliriz:
```tsx
backgroundColor: filter === f ? '#212121' : 'transparent'
borderWidth: filter === f ? 0 : 1
borderColor: '#E8E6E1'
color: filter === f ? '#FFFFFF' : '#8E8E93'
```

### Eğer hâlâ siyah bar görünüyorsa:
❌ Başka bir View sorunu var. Screenshot at veya şunu söyle:
- Sarı arka plan görünüyor mu?
- Chip'ler görünüyor mu?
- Yazılar görünüyor mu?

---

**Test et ve sonucu bildir!** 🚀
