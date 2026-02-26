/*
  # Extended Set.a.light Features Schema
  
  ## Summary
  Adds comprehensive equipment, character, animation, and export features to existing schema.
  Works alongside existing: profiles, models, scenes, lights, lighting_presets
  
  ## New Tables
  1. Equipment expansion (cameras, lenses, modifiers, props)
  2. Character system (poses, expressions, customizations)
  3. Animation system (timelines, keyframes)
  4. Export system (templates, renders)
  5. Environment (HDRIs, sun positions)
  6. Projects (multi-scene organization)
  
  ## Security
  All tables have RLS enabled with appropriate policies
*/

-- Equipment: Advanced Cameras
CREATE TABLE IF NOT EXISTS equipment_cameras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  category text NOT NULL,
  sensor_size text,
  iso_range int[],
  description text,
  is_custom boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment_cameras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read cameras" ON equipment_cameras FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users manage custom cameras" ON equipment_cameras FOR ALL TO authenticated 
  USING (is_custom = true AND auth.uid() = user_id)
  WITH CHECK (is_custom = true AND auth.uid() = user_id);

-- Equipment: Lenses
CREATE TABLE IF NOT EXISTS equipment_lenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  category text NOT NULL,
  focal_length_mm numeric,
  max_aperture numeric NOT NULL,
  is_anamorphic boolean DEFAULT false,
  description text,
  is_custom boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment_lenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read lenses" ON equipment_lenses FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users manage custom lenses" ON equipment_lenses FOR ALL TO authenticated
  USING (is_custom = true AND auth.uid() = user_id)
  WITH CHECK (is_custom = true AND auth.uid() = user_id);

-- Equipment: Light Modifiers
CREATE TABLE IF NOT EXISTS equipment_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  shape text,
  dimensions_cm jsonb,
  diffusion_level numeric DEFAULT 1.0,
  description text,
  is_custom boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read modifiers" ON equipment_modifiers FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users manage custom modifiers" ON equipment_modifiers FOR ALL TO authenticated
  USING (is_custom = true AND auth.uid() = user_id)
  WITH CHECK (is_custom = true AND auth.uid() = user_id);

-- Character: Poses
CREATE TABLE IF NOT EXISTS character_poses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  pose_data jsonb NOT NULL,
  thumbnail_path text,
  description text,
  is_custom boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE character_poses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read poses" ON character_poses FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users manage custom poses" ON character_poses FOR ALL TO authenticated
  USING (is_custom = true AND auth.uid() = user_id)
  WITH CHECK (is_custom = true AND auth.uid() = user_id);

-- Character: Facial Expressions
CREATE TABLE IF NOT EXISTS character_expressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  expression_data jsonb NOT NULL,
  intensity numeric DEFAULT 1.0,
  description text,
  is_custom boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE character_expressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read expressions" ON character_expressions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users manage custom expressions" ON character_expressions FOR ALL TO authenticated
  USING (is_custom = true AND auth.uid() = user_id)
  WITH CHECK (is_custom = true AND auth.uid() = user_id);

-- Projects: Multi-scene organization
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  thumbnail_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own projects" ON projects FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add project reference to existing scenes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scenes' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE scenes ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Animation: Timelines
CREATE TABLE IF NOT EXISTS animation_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_seconds numeric DEFAULT 10,
  fps int DEFAULT 30,
  animation_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE animation_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own timelines" ON animation_timelines FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Environment: HDRIs
CREATE TABLE IF NOT EXISTS environment_hdris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_path text NOT NULL,
  thumbnail_path text,
  time_of_day text,
  weather text,
  location_type text,
  has_sun boolean DEFAULT false,
  sun_elevation_degrees numeric,
  sun_azimuth_degrees numeric,
  description text,
  is_custom boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE environment_hdris ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read HDRIs" ON environment_hdris FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users manage custom HDRIs" ON environment_hdris FOR ALL TO authenticated
  USING (is_custom = true AND auth.uid() = user_id)
  WITH CHECK (is_custom = true AND auth.uid() = user_id);

-- Props: Library
CREATE TABLE IF NOT EXISTS props_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  model_path text NOT NULL,
  thumbnail_path text,
  dimensions_cm jsonb,
  description text,
  is_custom boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE props_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read props" ON props_library FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users manage custom props" ON props_library FOR ALL TO authenticated
  USING (is_custom = true AND auth.uid() = user_id)
  WITH CHECK (is_custom = true AND auth.uid() = user_id);

-- Export: Templates
CREATE TABLE IF NOT EXISTS export_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text NOT NULL,
  layout_config jsonb NOT NULL,
  page_size text DEFAULT 'a4',
  orientation text DEFAULT 'portrait',
  description text,
  is_custom boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE export_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read templates" ON export_templates FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users manage custom templates" ON export_templates FOR ALL TO authenticated
  USING (is_custom = true AND auth.uid() = user_id)
  WITH CHECK (is_custom = true AND auth.uid() = user_id);

-- Render: Jobs Queue
CREATE TABLE IF NOT EXISTS render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES scenes(id) ON DELETE CASCADE,
  animation_id uuid REFERENCES animation_timelines(id) ON DELETE CASCADE,
  resolution text NOT NULL DEFAULT '1920x1080',
  quality text DEFAULT 'high',
  format text DEFAULT 'png',
  status text DEFAULT 'pending',
  progress_percent numeric DEFAULT 0,
  output_path text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own renders" ON render_jobs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_animation_timelines_scene ON animation_timelines(scene_id);
CREATE INDEX IF NOT EXISTS idx_character_poses_category ON character_poses(category);
CREATE INDEX IF NOT EXISTS idx_props_category ON props_library(category);
CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON render_jobs(status);