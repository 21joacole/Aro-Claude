/*
  # Add Environment Backgrounds Table
  
  ## Summary
  Creates a new table to store environment/backdrop models that users can select
  to customize their studio scene. This includes the existing backdrop model and
  any future additions.
  
  ## New Tables
  
  ### `environment_backgrounds`
  Stores available environment/backdrop 3D models
  - `id` (uuid, primary key) - Background identifier
  - `name` (text) - Display name
  - `file_path` (text) - Path to the GLB model file
  - `thumbnail_path` (text, nullable) - Preview image
  - `category` (text) - Type: studio, outdoor, indoor
  - `description` (text, nullable) - Optional description
  - `scale` (numeric) - Default scale multiplier
  - `is_default` (boolean) - Whether this is the default backdrop
  - `is_custom` (boolean) - Whether user-uploaded
  - `user_id` (uuid, nullable) - Owner if custom
  - `created_at` (timestamptz) - Creation timestamp
  
  ## Security
  - RLS enabled
  - All users can read default/public backgrounds
  - Users can manage their own custom backgrounds
  
  ## Initial Data
  - Adds the existing SM5 Photography Backdrop as default
*/

-- Create environment_backgrounds table
CREATE TABLE IF NOT EXISTS environment_backgrounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_path text NOT NULL,
  thumbnail_path text,
  category text NOT NULL DEFAULT 'studio',
  description text,
  scale numeric DEFAULT 3.0,
  is_default boolean DEFAULT false,
  is_custom boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE environment_backgrounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read backgrounds"
  ON environment_backgrounds FOR SELECT
  TO authenticated, anon
  USING (is_custom = false OR auth.uid() = user_id);

CREATE POLICY "Users manage custom backgrounds"
  ON environment_backgrounds FOR ALL
  TO authenticated
  USING (is_custom = true AND auth.uid() = user_id)
  WITH CHECK (is_custom = true AND auth.uid() = user_id);

-- Insert default backdrop
INSERT INTO environment_backgrounds (name, file_path, category, description, scale, is_default, is_custom)
VALUES (
  'Photography Studio Backdrop',
  './assets/Backdrop/SM5_Photography_Backdrop.glb',
  'studio',
  'Classic white photography backdrop with floor and walls',
  3.0,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_environment_backgrounds_category ON environment_backgrounds(category);
CREATE INDEX IF NOT EXISTS idx_environment_backgrounds_default ON environment_backgrounds(is_default);