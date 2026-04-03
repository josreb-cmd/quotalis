/*
  # Create configuracoes table
  
  1. New Tables
    - `configuracoes` - System configuration
      - `id` (uuid, primary key)
      - `nome_condominio` (text) - Condominium name
      - `nipc` (text) - Tax ID
      - `morada` (text) - Address
      - `email_administrador` (text) - Admin email
      
  2. Security
    - Enable RLS with policies for authenticated and anon users
*/

CREATE TABLE IF NOT EXISTS configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_condominio text NOT NULL DEFAULT '',
  nipc text,
  morada text,
  email_administrador text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read configuracoes"
  ON configuracoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert configuracoes"
  ON configuracoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update configuracoes"
  ON configuracoes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete configuracoes"
  ON configuracoes FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon users to read configuracoes"
  ON configuracoes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon users to insert configuracoes"
  ON configuracoes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update configuracoes"
  ON configuracoes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete configuracoes"
  ON configuracoes FOR DELETE
  TO anon
  USING (true);