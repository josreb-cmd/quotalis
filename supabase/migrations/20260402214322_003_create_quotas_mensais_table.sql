/*
  # Create quotas_mensais table
  
  1. New Tables
    - `quotas_mensais` - Monthly fees for each fraction
      - `id` (uuid, primary key)
      - `id_fracao` (uuid) - FK to fracoes
      - `mes` (date) - Month (always day 1)
      - `valor_quota` (numeric) - Quota value
      - `total_pago` (numeric) - Total paid
      - `estado` (text) - Payment status
      
  2. Security
    - Enable RLS with policies for authenticated and anon users
*/

CREATE TABLE IF NOT EXISTS quotas_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_fracao uuid NOT NULL REFERENCES fracoes(id) ON DELETE CASCADE,
  mes date NOT NULL,
  valor_quota numeric(10,2) NOT NULL DEFAULT 0,
  total_pago numeric(10,2) NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'Pendente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(id_fracao, mes)
);

CREATE INDEX IF NOT EXISTS idx_quotas_mensais_fracao ON quotas_mensais(id_fracao);
CREATE INDEX IF NOT EXISTS idx_quotas_mensais_mes ON quotas_mensais(mes);
CREATE INDEX IF NOT EXISTS idx_quotas_mensais_estado ON quotas_mensais(estado);

ALTER TABLE quotas_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read quotas_mensais"
  ON quotas_mensais FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert quotas_mensais"
  ON quotas_mensais FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update quotas_mensais"
  ON quotas_mensais FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete quotas_mensais"
  ON quotas_mensais FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon users to read quotas_mensais"
  ON quotas_mensais FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon users to insert quotas_mensais"
  ON quotas_mensais FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update quotas_mensais"
  ON quotas_mensais FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete quotas_mensais"
  ON quotas_mensais FOR DELETE
  TO anon
  USING (true);