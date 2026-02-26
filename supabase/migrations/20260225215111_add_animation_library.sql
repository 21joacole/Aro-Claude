/*
  # Animation Library System

  1. New Tables
    - `animation_presets`
      - `id` (uuid, primary key)
      - `name` (text) - Display name like "Idle", "Walking", "T-Pose"
      - `category` (text) - Category like "poses", "actions", "loops"
      - `description` (text) - Description of the animation
      - `thumbnail_url` (text) - Preview image URL
      - `animation_data` (jsonb) - Stores keyframe data
      - `duration` (float) - Animation duration in seconds
      - `is_looping` (boolean) - Whether animation loops
      - `created_at` (timestamptz)

    - `model_animations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `project_id` (uuid, foreign key to projects)
      - `model_id` (text) - The model this animation is applied to
      - `animation_preset_id` (uuid, foreign key to animation_presets)
      - `custom_settings` (jsonb) - Speed, blend mode, etc.
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Public read access to animation_presets
    - Users can manage their own model_animations

  3. Indexes
    - Index on category for filtering
    - Index on user_id and project_id for queries
*/

-- Create animation_presets table
CREATE TABLE IF NOT EXISTS animation_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'poses',
  description text DEFAULT '',
  thumbnail_url text DEFAULT '',
  animation_data jsonb NOT NULL DEFAULT '{}',
  duration float DEFAULT 1.0,
  is_looping boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create model_animations table
CREATE TABLE IF NOT EXISTS model_animations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  model_id text NOT NULL,
  animation_preset_id uuid REFERENCES animation_presets(id) ON DELETE CASCADE NOT NULL,
  custom_settings jsonb DEFAULT '{"speed": 1.0, "blendMode": "normal"}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE animation_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_animations ENABLE ROW LEVEL SECURITY;

-- Policies for animation_presets (public read)
CREATE POLICY "Anyone can view animation presets"
  ON animation_presets FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert animation presets"
  ON animation_presets FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for model_animations
CREATE POLICY "Users can view own model animations"
  ON model_animations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own model animations"
  ON model_animations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own model animations"
  ON model_animations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own model animations"
  ON model_animations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_animation_presets_category ON animation_presets(category);
CREATE INDEX IF NOT EXISTS idx_model_animations_user_id ON model_animations(user_id);
CREATE INDEX IF NOT EXISTS idx_model_animations_project_id ON model_animations(project_id);
CREATE INDEX IF NOT EXISTS idx_model_animations_model_id ON model_animations(model_id);

-- Insert default animation presets
INSERT INTO animation_presets (name, category, description, animation_data, duration, is_looping) VALUES
  ('T-Pose', 'poses', 'Standard T-pose for rigging', '{"type": "pose", "joints": {"leftArm": {"rotation": [0, 0, -90]}, "rightArm": {"rotation": [0, 0, 90]}}}', 0, false),
  ('A-Pose', 'poses', 'A-pose with arms slightly down', '{"type": "pose", "joints": {"leftArm": {"rotation": [0, 0, -45]}, "rightArm": {"rotation": [0, 0, 45]}}}', 0, false),
  ('Idle Standing', 'loops', 'Natural standing idle animation', '{"type": "loop", "keyframes": [{"time": 0, "pose": "standing"}, {"time": 2, "pose": "standing_shift"}]}', 2.0, true),
  ('Walking', 'loops', 'Walking cycle animation', '{"type": "loop", "keyframes": [{"time": 0, "pose": "walk_1"}, {"time": 0.5, "pose": "walk_2"}, {"time": 1, "pose": "walk_1"}]}', 1.0, true),
  ('Running', 'loops', 'Running cycle animation', '{"type": "loop", "keyframes": [{"time": 0, "pose": "run_1"}, {"time": 0.3, "pose": "run_2"}, {"time": 0.6, "pose": "run_1"}]}', 0.6, true),
  ('Sitting', 'poses', 'Sitting pose', '{"type": "pose", "joints": {"hip": {"rotation": [90, 0, 0]}, "leftKnee": {"rotation": [90, 0, 0]}, "rightKnee": {"rotation": [90, 0, 0]}}}', 0, false),
  ('Waving', 'actions', 'Hand waving gesture', '{"type": "action", "keyframes": [{"time": 0, "pose": "wave_start"}, {"time": 0.5, "pose": "wave_mid"}, {"time": 1, "pose": "wave_start"}]}', 1.0, false),
  ('Pointing', 'poses', 'Pointing gesture', '{"type": "pose", "joints": {"rightArm": {"rotation": [0, 0, 45]}, "rightForearm": {"rotation": [0, 0, 0]}}}', 0, false),
  ('Arms Crossed', 'poses', 'Arms crossed pose', '{"type": "pose", "joints": {"leftArm": {"rotation": [0, 45, -90]}, "rightArm": {"rotation": [0, -45, 90]}}}', 0, false),
  ('Victory Pose', 'poses', 'Arms raised in victory', '{"type": "pose", "joints": {"leftArm": {"rotation": [0, 0, -135]}, "rightArm": {"rotation": [0, 0, 135]}}}', 0, false)
ON CONFLICT DO NOTHING;