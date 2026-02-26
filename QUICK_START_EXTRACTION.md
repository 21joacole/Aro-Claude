# Quick Start: Extract Studio Models

Since Blender isn't available in the cloud environment, you'll need to run the extraction on your local machine. Here are three practical options:

## 🚀 FASTEST METHOD: Use Online Converter + Blender

### Step 1: Convert FBX to GLTF
1. Download `src/assets/Lights/Full_Photo_Studio_Collection_Fbx/Photo_Studio_Collection.FBX` to your computer
2. Go to: https://products.aspose.app/3d/conversion/fbx-to-gltf
3. Upload the FBX file
4. Convert to GLTF format
5. Download the converted file

### Step 2: Split in Blender (5-10 minutes)
1. Download and install Blender: https://www.blender.org/download/
2. Open Blender
3. File → Import → glTF 2.0
4. Select your converted file
5. In the Scene Collection (top right), you'll see all objects
6. For each of the 14 objects:
   - Select object → File → Export → glTF 2.0
   - Set format to "GLB"
   - Enable "Selected Objects"
   - Name it according to the list below
   - Export to `src/assets/Lights/StudioCollection/`

### Object Names to Export:
```
arri_stage_light.glb
camera_tripod.glb
glass.glb
led_light.glb
light_square.glb
lights.glb
photo_light.glb
reflector.glb
ring_light.glb
screen.glb
square_reflector.glb
stage_light.glb
studio_camera.glb
studio_camera_tripod.glb
```

## 🤖 AUTOMATED METHOD: Run Python Script Locally

If you have Blender installed on your local machine:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Run the extraction script
blender --background --python scripts/extract-models.py
```

This will automatically:
- Load the FBX file
- Find all 14 objects
- Export each as GLB
- Save to `src/assets/Lights/StudioCollection/`

## 🔧 ALTERNATIVE: Use Three.js FBXLoader (Advanced)

If you're comfortable with Node.js and Three.js, you can write a custom script using `FBXLoader` to programmatically load and split the models. However, this requires handling the Node.js/browser environment differences.

## ✅ Verification

After extraction, verify:
1. All 14 GLB files are in `src/assets/Lights/StudioCollection/`
2. Each file is 500KB - 5MB
3. Open in GLTF Viewer to test: https://gltf-viewer.donmccurdy.com/

## 🎯 After Extraction

Once complete:
1. Start your dev server
2. Open Props Library in the app
3. Filter shows "Studio Equipment" by default
4. All 14 items should appear
5. Click any item to view details

## 💡 Tips

- **Keep textures**: Make sure texture files in the FBX folder remain intact
- **Check scale**: If models appear wrong size, adjust in database
- **Test incrementally**: Export and test one model first before doing all 14
- **Backup FBX**: Keep original FBX file in case you need to re-export

## 🆘 Need Help?

If you encounter issues:
1. Check `STUDIO_MODELS_EXTRACTION_GUIDE.md` for detailed troubleshooting
2. Review `src/assets/Lights/StudioCollection/README.md` for technical details
3. Verify texture paths are relative in exported GLBs

---

**Recommended**: Use the online converter + Blender method (fastest, most reliable)
