/*
  # Create orcamento table
  
  1. New Tables
    - `orcamento` - Budget records
      - `id` (uuid, primary key)
      - `ano` (integer) - Year
      - `rubrica` (text) - Category
      - `tipo` (text) - Type (Receita, Despesa Corrente, Despesa Extraordinária)
      - `valor_estimado` (numeric) - Estimated value
      - `notas` (text) - Notes
      
  2. Security
    - Enable RLS with policies for authenticated and anon users
*/

CREATE TABLE IF NOT EXISTS orcamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano integer NOT NULL,
  rubrica text NOT NULL,
  tipo text NOT NULL,
  valor_estimado numeric(10,2) NOT NULL DEFAULT 0,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orcamento_ano ON orcamento(ano);
CREATE INDEX IF NOT EXISTS idx_orcamento_tipo ON orcamento(tipo);

ALTER TABLE orcamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read orcamento"
  ON orcamento FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert orcamento"
  ON orcamento FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update orcamento"
  ON orcamento FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete orcamento"
  ON orcamento FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon users to read orcamento"
  ON orcamento FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon users to insert orcamento"
  ON orcamento FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update orcamento"
  ON orcamento FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete orcamento"
  ON orcamento FOR DELETE
  TO anon
  USING (true);