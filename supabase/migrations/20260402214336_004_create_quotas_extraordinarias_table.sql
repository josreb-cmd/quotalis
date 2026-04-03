/*
  # Create quotas_extraordinarias table
  
  1. New Tables
    - `quotas_extraordinarias` - Extraordinary fees
      - `id` (uuid, primary key)
      - `descricao` (text) - Description
      - `valor_total` (numeric) - Total value
      - `prazo` (date) - Deadline
      - `id_fracao` (uuid) - FK to fracoes
      - `valor_por_fracao` (numeric) - Value per fraction
      - `total_pago` (numeric) - Total paid
      - `estado` (text) - Payment status
      
  2. Security
    - Enable RLS with policies for authenticated and anon users
*/

CREATE TABLE IF NOT EXISTS quotas_extraordinarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor_total numeric(10,2) NOT NULL DEFAULT 0,
  prazo date NOT NULL,
  id_fracao uuid NOT NULL REFERENCES fracoes(id) ON DELETE CASCADE,
  valor_por_fracao numeric(10,2) NOT NULL DEFAULT 0,
  total_pago numeric(10,2) NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'Pendente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotas_extraordinarias_fracao ON quotas_extraordinarias(id_fracao);
CREATE INDEX IF NOT EXISTS idx_quotas_extraordinarias_prazo ON quotas_extraordinarias(prazo);

ALTER TABLE quotas_extraordinarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read quotas_extraordinarias"
  ON quotas_extraordinarias FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert quotas_extraordinarias"
  ON quotas_extraordinarias FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update quotas_extraordinarias"
  ON quotas_extraordinarias FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete quotas_extraordinarias"
  ON quotas_extraordinarias FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon users to read quotas_extraordinarias"
  ON quotas_extraordinarias FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon users to insert quotas_extraordinarias"
  ON quotas_extraordinarias FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update quotas_extraordinarias"
  ON quotas_extraordinarias FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete quotas_extraordinarias"
  ON quotas_extraordinarias FOR DELETE
  TO anon
  USING (true);