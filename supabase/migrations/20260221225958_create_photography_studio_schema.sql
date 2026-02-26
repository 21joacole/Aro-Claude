/*
  # Photography Studio Schema

  ## Overview
  This migration creates the database schema for the 3D photography studio application,
  enabling cloud storage of scenes, lighting presets, and user data.

  ## New Tables

  ### `profiles`
  User profile information linked to auth.users
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update

  ### `models`
  Available 3D models that users can load
  - `id` (uuid, primary key) - Model identifier
  - `name` (text) - Model display name
  - `file_path` (text) - Path to the GLB file
  - `thumbnail_url` (text, nullable) - Preview image URL
  - `is_default` (boolean) - Whether this is a default model
  - `created_at` (timestamptz) - Upload timestamp

  ### `scenes`
  Saved studio scenes with complete configuration
  - `id` (uuid, primary key) - Scene identifier
  - `user_id` (uuid, foreign key) - Owner user ID
  - `name` (text) - Scene name
  - `description` (text, nullable) - Optional description
  - `model_id` (uuid, foreign key) - Active model in scene
  - `camera_settings` (jsonb) - ISO, f-stop, shutter, exposure compensation
  - `camera_position` (jsonb) - Camera position and target
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last modification timestamp

  ### `lights`
  Individual light configurations within scenes
  - `id` (uuid, primary key) - Light identifier
  - `scene_id` (uuid, foreign key) - Parent scene
  - `kind` (text) - Light type (L1, L2, L3, L5)
  - `position` (jsonb) - X, Y, Z coordinates
  - `rotation` (numeric) - Rotation in degrees
  - `power` (numeric) - Light intensity
  - `size` (numeric) - Light size multiplier
  - `color` (text) - Hex color code (e.g., #ffffff)
  - `emitter_offset` (jsonb) - Local emitter position
  - `created_at` (timestamptz) - Creation timestamp

  ### `lighting_presets`
  Reusable lighting configurations
  - `id` (uuid, primary key) - Preset identifier
  - `user_id` (uuid, foreign key) - Owner user ID
  - `name` (text) - Preset name
  - `description` (text, nullable) - Optional description
  - `is_public` (boolean) - Whether other users can access
  - `lights_config` (jsonb) - Array of light configurations
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last modification timestamp

  ## Security

  All tables have Row Level Security (RLS) enabled with policies:
  - Users can only read/write their own data
  - Public presets are readable by all authenticated users
  - Models table is readable by all authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create models table
CREATE TABLE IF NOT EXISTS models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_path text NOT NULL,
  thumbnail_url text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read models"
  ON models FOR SELECT
  TO authenticated
  USING (true);

-- Create scenes table
CREATE TABLE IF NOT EXISTS scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  model_id uuid REFERENCES models(id) ON DELETE SET NULL,
  camera_settings jsonb DEFAULT '{"iso": 200, "fstop": 2.8, "shutter": 0.008, "expComp": 0}'::jsonb,
  camera_position jsonb DEFAULT '{"position": {"x": 0, "y": 1.55, "z": 3.0}, "target": {"x": 0, "y": 1.3, "z": 0}}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scenes"
  ON scenes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scenes"
  ON scenes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scenes"
  ON scenes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scenes"
  ON scenes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create lights table
CREATE TABLE IF NOT EXISTS lights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('L1', 'L2', 'L3', 'L5')),
  position jsonb NOT NULL DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
  rotation numeric DEFAULT 0,
  power numeric DEFAULT 1800,
  size numeric DEFAULT 1.0,
  color text DEFAULT '#ffffff',
  emitter_offset jsonb DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read lights in own scenes"
  ON lights FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = lights.scene_id
      AND scenes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert lights in own scenes"
  ON lights FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = lights.scene_id
      AND scenes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update lights in own scenes"
  ON lights FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = lights.scene_id
      AND scenes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = lights.scene_id
      AND scenes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete lights in own scenes"
  ON lights FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = lights.scene_id
      AND scenes.user_id = auth.uid()
    )
  );

-- Create lighting_presets table
CREATE TABLE IF NOT EXISTS lighting_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  lights_config jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lighting_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own presets"
  ON lighting_presets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read public presets"
  ON lighting_presets FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can insert own presets"
  ON lighting_presets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presets"
  ON lighting_presets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own presets"
  ON lighting_presets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default model
INSERT INTO models (name, file_path, is_default)
VALUES ('Human Bust', './assets/human_bust.glb', true)
ON CONFLICT DO NOTHING;