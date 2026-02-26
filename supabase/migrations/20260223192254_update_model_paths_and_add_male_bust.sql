/*
  # Update Model Paths and Add New Model

  ## Changes Made
  1. Updates existing 'Human Bust' model path from `./assets/human_bust.glb` to `../assets/Models/human_bust.glb`
  2. Adds new 'Male Human Bust' model with path `../assets/Models/Male_Human_Bust.glb`

  ## Details
  - Both models are now located in the src/assets/Models folder
  - The new Male Human Bust model is added as a non-default option
  - Uses ON CONFLICT DO NOTHING to prevent duplicate entries
*/

-- Update existing Human Bust model path
UPDATE models
SET file_path = '../assets/Models/human_bust.glb'
WHERE name = 'Human Bust' AND file_path = './assets/human_bust.glb';

-- Insert new Male Human Bust model
INSERT INTO models (name, file_path, is_default)
VALUES ('Male Human Bust', '../assets/Models/Male_Human_Bust.glb', false)
ON CONFLICT DO NOTHING;
