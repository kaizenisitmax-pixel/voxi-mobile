-- ============================================
-- ORDERS TABLOSU - EKSİK KOLONLARI EKLE
-- ============================================

-- details kolonu ekle (Sipariş detayı için)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS details TEXT;

-- amount kolonu ekle (Sipariş tutarı için)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount NUMERIC;

-- Eğer total_amount varsa ve amount yoksa, amount'u total_amount'a eşitle
-- (Bu durumda kod amount yerine total_amount kullanmalı, ama şimdilik her iki kolon da olsun)

-- ============================================
-- KONTROL: Kolonlar eklendi mi?
-- ============================================

-- Çalıştırdıktan sonra kontrol et:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'orders' 
-- AND column_name IN ('details', 'amount', 'created_by_user', 'total_amount');
