/*
  # Create administradores table
  
  1. New Tables
    - `administradores` - Stores administrator information
      - `id` (uuid, primary key)
      - `id_fracao` (uuid) - FK to fracoes
      - `data_eleicao` (date) - Election date
      - `inicio_isencao` (date) - Exemption start date
      - `fim_isencao` (date) - Exemption end date
      - `data_renuncia` (date) - Resignation date
      - `id_substitui` (uuid) - FK to administradores for inherited mandates
      
  2. Security
    - Enable RLS with policies for authenticated and anon users
*/

CREATE TABLE IF NOT EXISTS administradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_fracao uuid NOT NULL REFERENCES fracoes(id) ON DELETE CASCADE,
  data_eleicao date NOT NULL,
  inicio_isencao date NOT NULL,
  fim_isencao date NOT NULL,
  data_renuncia date,
  id_substitui uuid REFERENCES administradores(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE administradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read administradores"
  ON administradores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert administradores"
  ON administradores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update administradores"
  ON administradores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete administradores"
  ON administradores FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon users to read administradores"
  ON administradores FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon users to insert administradores"
  ON administradores FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update administradores"
  ON administradores FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete administradores"
  ON administradores FOR DELETE
  TO anon
  USING (true);