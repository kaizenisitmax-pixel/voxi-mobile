-- ============================================
-- EKSİK MÜŞTERİ TABLOLARI VE KOLONLARI
-- ============================================

-- 1. Müşteri muhasebe işlemleri
CREATE TABLE IF NOT EXISTS customer_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('receivable', 'payable')),
  amount numeric NOT NULL,
  description text,
  workspace_id uuid,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ct_sel" ON customer_transactions 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "ct_ins" ON customer_transactions 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "ct_del" ON customer_transactions 
  FOR DELETE TO authenticated 
  USING (true);

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_ct_customer_id ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_ct_created_at ON customer_transactions(created_at DESC);

-- 2. Müşteri logları
CREATE TABLE IF NOT EXISTS customer_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cl_sel" ON customer_logs 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "cl_ins" ON customer_logs 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_cl_customer_id ON customer_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_cl_created_at ON customer_logs(created_at DESC);

-- 3. Müşteri tablosuna eksik kolonlar
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_office text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'passive'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_receivable numeric DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_payable numeric DEFAULT 0;

-- 4. Trigger: customer total'larını otomatik güncelle
CREATE OR REPLACE FUNCTION update_customer_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Alacak toplamı
  UPDATE customers
  SET total_receivable = (
    SELECT COALESCE(SUM(amount), 0)
    FROM customer_transactions
    WHERE customer_id = NEW.customer_id
      AND type = 'receivable'
  )
  WHERE id = NEW.customer_id;
  
  -- Verecek toplamı
  UPDATE customers
  SET total_payable = (
    SELECT COALESCE(SUM(amount), 0)
    FROM customer_transactions
    WHERE customer_id = NEW.customer_id
      AND type = 'payable'
  )
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customer_transactions_totals ON customer_transactions;
CREATE TRIGGER customer_transactions_totals
  AFTER INSERT OR UPDATE OR DELETE ON customer_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_totals();

-- ============================================
-- KONTROL: Tablo ve kolonlar oluşturuldu mu?
-- ============================================

-- Çalıştırdıktan sonra aşağıdaki sorguyu çalıştır ve kontrol et:
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('customer_transactions', 'customer_logs');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'customers' AND column_name IN ('billing_address', 'total_receivable');
