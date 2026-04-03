/*
  # Create fracoes table
  
  1. New Tables
    - `fracoes` - Stores condominium unit information
      - `id` (uuid, primary key)
      - `nome_condomino` (text) - Owner name
      - `fracao` (text) - Unit identifier (e.g., "1ºA", "Gar 1 P-3")
      - `codigo` (text) - Letter code (e.g., "AC", "H")
      - `tipologia` (text) - Type (T1, T2, T3, T4, Comercial, Garagem, Loja, Escritório)
      - `quota_mensal` (numeric) - Monthly fee
      - `permilagem` (numeric) - Ownership share in permillage
      - `email` (text) - Contact email
      - `telemovel` (text) - Mobile phone
      - `nif` (text) - Tax identification number
      - `data_entrada` (date) - Entry date
      - `ativa` (boolean) - Active status
      - `notas` (text) - Notes
      
  2. Security
    - Enable RLS on `fracoes` table
    - Add policy for authenticated users to manage data
*/

CREATE TABLE IF NOT EXISTS fracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_condomino text NOT NULL,
  fracao text NOT NULL,
  codigo text,
  tipologia text,
  quota_mensal numeric(10,2) NOT NULL DEFAULT 0,
  permilagem numeric(8,3) NOT NULL DEFAULT 0,
  email text,
  telemovel text,
  nif text,
  data_entrada date DEFAULT CURRENT_DATE,
  ativa boolean DEFAULT true,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read fracoes"
  ON fracoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert fracoes"
  ON fracoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update fracoes"
  ON fracoes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete fracoes"
  ON fracoes FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon users to read fracoes"
  ON fracoes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon users to insert fracoes"
  ON fracoes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update fracoes"
  ON fracoes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete fracoes"
  ON fracoes FOR DELETE
  TO anon
  USING (true);