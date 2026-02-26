-- # Add Studio Collection Props
--
-- ## Overview
-- Adds 14 new studio equipment props extracted from the Full Photo Studio Collection.
-- These are added to the props_library table and categorized as studio equipment.
--
-- ## New Props
--
-- ### Professional Lights (7 items)
-- - arri_stage_light: Professional Arri-style stage lighting
-- - led_light: Modern LED panel light
-- - light_square: Square studio light
-- - lights: General studio lighting fixture
-- - photo_light: Photography flash/strobe
-- - ring_light: Ring light for portrait photography
-- - stage_light: Professional stage spotlight
--
-- ### Reflectors & Modifiers (4 items)
-- - reflector: Round reflector disc
-- - square_reflector: Square reflector panel
-- - glass: Glass diffusion panel
-- - screen: Backdrop/diffusion screen
--
-- ### Support Equipment (3 items)
-- - camera_tripod: Standard camera tripod
-- - studio_camera_tripod: Professional studio tripod
-- - studio_camera: Professional studio camera
--
-- ## Notes
-- - Category set to 'studio_equipment' for easy filtering
-- - Default dimensions are estimates based on typical equipment
-- - Model paths point to StudioCollection folder (models need to be extracted from FBX)
-- - These props can be placed and manipulated like any other prop in the scene

-- Insert Professional Lights
INSERT INTO props_library (name, category, model_path, dimensions_cm, description, is_custom)
VALUES 
  ('Arri Stage Light', 'studio_equipment', 'src/assets/Lights/StudioCollection/arri_stage_light.glb', '{"width": 40, "height": 50, "depth": 35}'::jsonb, 'Professional Arri-style stage lighting with barn doors', false),
  ('LED Panel Light', 'studio_equipment', 'src/assets/Lights/StudioCollection/led_light.glb', '{"width": 45, "height": 60, "depth": 8}'::jsonb, 'Modern LED panel light for continuous lighting', false),
  ('Square Studio Light', 'studio_equipment', 'src/assets/Lights/StudioCollection/light_square.glb', '{"width": 60, "height": 60, "depth": 40}'::jsonb, 'Square-shaped studio softbox light', false),
  ('Studio Light', 'studio_equipment', 'src/assets/Lights/StudioCollection/lights.glb', '{"width": 35, "height": 55, "depth": 30}'::jsonb, 'General purpose studio lighting fixture', false),
  ('Photo Flash Light', 'studio_equipment', 'src/assets/Lights/StudioCollection/photo_light.glb', '{"width": 25, "height": 40, "depth": 25}'::jsonb, 'Photography flash/strobe with umbrella mount', false),
  ('Ring Light', 'studio_equipment', 'src/assets/Lights/StudioCollection/ring_light.glb', '{"width": 45, "height": 50, "depth": 8}'::jsonb, 'Circular ring light for portrait photography', false),
  ('Stage Spotlight', 'studio_equipment', 'src/assets/Lights/StudioCollection/stage_light.glb', '{"width": 30, "height": 45, "depth": 35}'::jsonb, 'Professional stage spotlight with adjustable beam', false)
ON CONFLICT DO NOTHING;

-- Insert Reflectors & Modifiers
INSERT INTO props_library (name, category, model_path, dimensions_cm, description, is_custom)
VALUES 
  ('Round Reflector', 'studio_equipment', 'src/assets/Lights/StudioCollection/reflector.glb', '{"width": 80, "height": 120, "depth": 2}'::jsonb, 'Round collapsible reflector disc', false),
  ('Square Reflector', 'studio_equipment', 'src/assets/Lights/StudioCollection/square_reflector.glb', '{"width": 100, "height": 100, "depth": 2}'::jsonb, 'Square reflector panel with frame', false),
  ('Glass Diffuser', 'studio_equipment', 'src/assets/Lights/StudioCollection/glass.glb', '{"width": 60, "height": 90, "depth": 3}'::jsonb, 'Glass diffusion panel for soft lighting', false),
  ('Diffusion Screen', 'studio_equipment', 'src/assets/Lights/StudioCollection/screen.glb', '{"width": 150, "height": 200, "depth": 5}'::jsonb, 'Large backdrop screen or diffusion panel', false)
ON CONFLICT DO NOTHING;

-- Insert Support Equipment
INSERT INTO props_library (name, category, model_path, dimensions_cm, description, is_custom)
VALUES 
  ('Camera Tripod', 'studio_equipment', 'src/assets/Lights/StudioCollection/camera_tripod.glb', '{"width": 50, "height": 150, "depth": 50}'::jsonb, 'Standard camera tripod with adjustable height', false),
  ('Studio Camera Tripod', 'studio_equipment', 'src/assets/Lights/StudioCollection/studio_camera_tripod.glb', '{"width": 60, "height": 180, "depth": 60}'::jsonb, 'Professional heavy-duty studio camera tripod', false),
  ('Studio Camera', 'studio_equipment', 'src/assets/Lights/StudioCollection/studio_camera.glb', '{"width": 20, "height": 15, "depth": 25}'::jsonb, 'Professional studio camera body', false)
ON CONFLICT DO NOTHING;
