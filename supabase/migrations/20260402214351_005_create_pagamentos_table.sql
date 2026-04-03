/*
  # Create pagamentos table
  
  1. New Tables
    - `pagamentos` - Payment records
      - `id` (uuid, primary key)
      - `id_fracao` (uuid) - FK to fracoes (nullable for unidentified)
      - `data_pagamento` (date) - Payment date
      - `valor_total` (numeric) - Total value
      - `n_meses` (integer) - Number of months covered
      - `mes_inicio` (date) - Start month
      - `tipo` (text) - Payment type
      - `metodo` (text) - Payment method
      - `nome_emissor` (text) - Payer name
      - `notas` (text) - Notes
      - `por_identificar` (boolean) - Unidentified flag
      
  2. Security
    - Enable RLS with policies for authenticated and anon users
*/

CREATE TABLE IF NOT EXISTS pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_fracao uuid REFERENCES fracoes(id) ON DELETE SET NULL,
  data_pagamento date NOT NULL DEFAULT CURRENT_DATE,
  valor_total numeric(10,2) NOT NULL DEFAULT 0,
  n_meses integer NOT NULL DEFAULT 1,
  mes_inicio date,
  tipo text NOT NULL DEFAULT 'Normal',
  metodo text NOT NULL DEFAULT 'Transferência',
  nome_emissor text,
  notas text,
  por_identificar boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_fracao ON pagamentos(id_fracao);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data ON pagamentos(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_por_identificar ON pagamentos(por_identificar);

ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read pagamentos"
  ON pagamentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert pagamentos"
  ON pagamentos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update pagamentos"
  ON pagamentos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete pagamentos"
  ON pagamentos FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon users to read pagamentos"
  ON pagamentos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon users to insert pagamentos"
  ON pagamentos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update pagamentos"
  ON pagamentos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete pagamentos"
  ON pagamentos FOR DELETE
  TO anon
  USING (true);