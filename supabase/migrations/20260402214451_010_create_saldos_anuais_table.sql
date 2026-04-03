/*
  # Create saldos_anuais table
  
  1. New Tables
    - `saldos_anuais` - Annual balance records
      - `id` (uuid, primary key)
      - `ano` (integer) - Year
      - `saldo_caixa` (numeric) - Cash balance
      - `saldo_conta_ordem` (numeric) - Current account balance
      - `saldo_fundo_reserva` (numeric) - Reserve fund balance
      - `notas_balanco` (text) - Balance notes
      
  2. Security
    - Enable RLS with policies for authenticated and anon users
*/

CREATE TABLE IF NOT EXISTS saldos_anuais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano integer NOT NULL UNIQUE,
  saldo_caixa numeric(10,2) NOT NULL DEFAULT 0,
  saldo_conta_ordem numeric(10,2) NOT NULL DEFAULT 0,
  saldo_fundo_reserva numeric(10,2) NOT NULL DEFAULT 0,
  notas_balanco text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saldos_anuais_ano ON saldos_anuais(ano);

ALTER TABLE saldos_anuais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read saldos_anuais"
  ON saldos_anuais FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert saldos_anuais"
  ON saldos_anuais FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update saldos_anuais"
  ON saldos_anuais FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete saldos_anuais"
  ON saldos_anuais FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon users to read saldos_anuais"
  ON saldos_anuais FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon users to insert saldos_anuais"
  ON saldos_anuais FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update saldos_anuais"
  ON saldos_anuais FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete saldos_anuais"
  ON saldos_anuais FOR DELETE
  TO anon
  USING (true);