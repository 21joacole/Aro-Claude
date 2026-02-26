/*
  # Add Default Transform Properties to Models

  1. Changes
    - Add default_rotation_x, default_rotation_y, default_rotation_z columns to models table
    - Add default_position_x, default_position_y, default_position_z columns to models table
    - Add default_scale column to models table
    - Set default values for Military Character and related action figures

  2. Notes
    - These values will be applied when a model is first loaded
    - The Military Character's current transform will serve as the template
    - Values are stored as numeric (decimal) for precision
*/

-- Add transform columns to models table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'models' AND column_name = 'default_rotation_x'
  ) THEN
    ALTER TABLE models ADD COLUMN default_rotation_x numeric DEFAULT -1.5707963267948966;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'models' AND column_name = 'default_rotation_y'
  ) THEN
    ALTER TABLE models ADD COLUMN default_rotation_y numeric DEFAULT 3.141592653589793;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'models' AND column_name = 'default_rotation_z'
  ) THEN
    ALTER TABLE models ADD COLUMN default_rotation_z numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'models' AND column_name = 'default_position_x'
  ) THEN
    ALTER TABLE models ADD COLUMN default_position_x numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'models' AND column_name = 'default_position_y'
  ) THEN
    ALTER TABLE models ADD COLUMN default_position_y numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'models' AND column_name = 'default_position_z'
  ) THEN
    ALTER TABLE models ADD COLUMN default_position_z numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'models' AND column_name = 'default_scale'
  ) THEN
    ALTER TABLE models ADD COLUMN default_scale numeric DEFAULT 1.0;
  END IF;
END $$;

-- Update specific models with Military Character's transform settings
-- These models will share the same default transform as Military Character
UPDATE models
SET
  default_rotation_x = -1.5707963267948966,
  default_rotation_y = 3.141592653589793,
  default_rotation_z = 0,
  default_position_x = 0,
  default_position_y = 0,
  default_position_z = 0,
  default_scale = 1.0
WHERE name IN (
  'Military Character',
  'Muscular Warrior',
  'Realistic Human',
  'Spiderman Action Figure',
  'Tactical Action Figure'
);
