/*
  # Create imputacoes table
  
  1. New Tables
    - `imputacoes` - Payment allocations
      - `id` (uuid, primary key)
      - `id_pagamento` (uuid) - FK to pagamentos
      - `id_quota_mensal` (uuid) - FK to quotas_mensais (nullable)
      - `id_quota_extraordinaria` (uuid) - FK to quotas_extraordinarias (nullable)
      - `valor_imputado` (numeric) - Allocated value
      - `tipo_quota` (text) - Quota type (Mensal, Extraordinária)
      - `credito_gerado` (numeric) - Generated credit
      
  2. Security
    - Enable RLS with policies for authenticated and anon users
*/

CREATE TABLE IF NOT EXISTS imputacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_pagamento uuid NOT NULL REFERENCES pagamentos(id) ON DELETE CASCADE,
  id_quota_mensal uuid REFERENCES quotas_mensais(id) ON DELETE SET NULL,
  id_quota_extraordinaria uuid REFERENCES quotas_extraordinarias(id) ON DELETE SET NULL,
  valor_imputado numeric(10,2) NOT NULL DEFAULT 0,
  tipo_quota text NOT NULL DEFAULT 'Mensal',
  credito_gerado numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imputacoes_pagamento ON imputacoes(id_pagamento);
CREATE INDEX IF NOT EXISTS idx_imputacoes_quota_mensal ON imputacoes(id_quota_mensal);
CREATE INDEX IF NOT EXISTS idx_imputacoes_quota_extraordinaria ON imputacoes(id_quota_extraordinaria);

ALTER TABLE imputacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read imputacoes"
  ON imputacoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert imputacoes"
  ON imputacoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update imputacoes"
  ON imputacoes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete imputacoes"
  ON imputacoes FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon users to read imputacoes"
  ON imputacoes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon users to insert imputacoes"
  ON imputacoes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update imputacoes"
  ON imputacoes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete imputacoes"
  ON imputacoes FOR DELETE
  TO anon
  USING (true);