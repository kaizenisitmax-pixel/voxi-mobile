-- ============================================
-- SİPARİŞLER TABLOSU
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'quote',
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  delivery_date DATE,
  details TEXT,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TASKS TABLOSUNA ORDER_ID EKLE
-- ============================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Workspace üyelerinin kendi workspace'lerindeki siparişleri görmesine izin ver
CREATE POLICY "Users can view orders in their workspace"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.workspace_id = orders.workspace_id
      AND profiles.id = auth.uid()
    )
  );

-- Workspace üyelerinin kendi workspace'lerinde sipariş oluşturmasına izin ver
CREATE POLICY "Users can insert orders in their workspace"
  ON orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.workspace_id = orders.workspace_id
      AND profiles.id = auth.uid()
    )
  );

-- Workspace üyelerinin kendi workspace'lerindeki siparişleri güncellemesine izin ver
CREATE POLICY "Users can update orders in their workspace"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.workspace_id = orders.workspace_id
      AND profiles.id = auth.uid()
    )
  );

-- Workspace üyelerinin kendi workspace'lerindeki siparişleri silmesine izin ver
CREATE POLICY "Users can delete orders in their workspace"
  ON orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.workspace_id = orders.workspace_id
      AND profiles.id = auth.uid()
    )
  );

-- ============================================
-- UPDATED_AT TRİGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at_trigger ON orders;
CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- ============================================
-- INDEX (Performans için)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_workspace_id ON orders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_tasks_order_id ON tasks(order_id);
