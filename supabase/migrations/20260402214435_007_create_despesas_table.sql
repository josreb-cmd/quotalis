/*
  # Create despesas table
  
  1. New Tables
    - `despesas` - Expense records
      - `id` (uuid, primary key)
      - `descricao` (text) - Description
      - `rubrica` (text) - Category
      - `valor` (numeric) - Value
      - `data_pagamento` (date) - Payment date
      - `metodo` (text) - Payment method
      - `mes` (date) - Month (day 1)
      - `ano` (integer) - Year
      - `tipo` (text) - Type (Corrente, Extraordinária)
      - `fornecedor` (text) - Supplier
      - `notas` (text) - Notes
      
  2. Security
    - Enable RLS with policies for authenticated and anon users
*/

CREATE TABLE IF NOT EXISTS despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  rubrica text NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  data_pagamento date NOT NULL DEFAULT CURRENT_DATE,
  metodo text NOT NULL DEFAULT 'Transferência Bancária',
  mes date NOT NULL,
  ano integer NOT NULL,
  tipo text NOT NULL DEFAULT 'Corrente',
  fornecedor text,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_despesas_mes ON despesas(mes);
CREATE INDEX IF NOT EXISTS idx_despesas_ano ON despesas(ano);
CREATE INDEX IF NOT EXISTS idx_despesas_rubrica ON despesas(rubrica);

ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read despesas"
  ON despesas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert despesas"
  ON despesas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update despesas"
  ON despesas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete despesas"
  ON despesas FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon users to read despesas"
  ON despesas FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon users to insert despesas"
  ON despesas FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update despesas"
  ON despesas FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete despesas"
  ON despesas FOR DELETE
  TO anon
  USING (true);