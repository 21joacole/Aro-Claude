#!/usr/bin/env python3
"""
Extract individual models from FBX file using Blender Python API
This script must be run with Blender's Python interpreter:
  blender --background --python extract-models.py
"""

import os
import sys

try:
    import bpy
except ImportError:
    print("ERROR: This script must be run with Blender's Python interpreter")
    print("Usage: blender --background --python extract-models.py")
    sys.exit(1)

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(script_dir)

FBX_PATH = os.path.join(project_dir, "src/assets/Lights/Full_Photo_Studio_Collection_Fbx/Photo_Studio_Collection.FBX")
OUTPUT_DIR = os.path.join(project_dir, "src/assets/Lights/StudioCollection")

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Clear the scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

print(f"Loading FBX file: {FBX_PATH}")

# Import the FBX file
bpy.ops.import_scene.fbx(filepath=FBX_PATH)

print("\n=== Objects in Scene ===\n")

# List all objects
objects_to_export = []
for obj in bpy.data.objects:
    print(f"  {obj.type}: {obj.name}")
    if obj.type in ['MESH', 'EMPTY', 'ARMATURE']:
        # Get top-level objects (no parent or parent is scene root)
        if obj.parent is None or (obj.parent and len(obj.parent.users_collection) == 0):
            objects_to_export.append(obj)

print(f"\n\nFound {len(objects_to_export)} top-level objects to export\n")

# Export each object individually
exported_count = 0

for obj in objects_to_export:
    # Deselect all
    bpy.ops.object.select_all(action='DESELECT')

    # Select the object and its children
    obj.select_set(True)
    for child in obj.children_recursive:
        child.select_set(True)

    # Make it active
    bpy.context.view_layer.objects.active = obj

    # Sanitize the name for filename
    safe_name = obj.name.replace(" ", "_").replace(".", "_").replace("/", "_").lower()
    output_path = os.path.join(OUTPUT_DIR, f"{safe_name}.glb")

    # Export as GLB
    try:
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            use_selection=True,
            export_format='GLB',
            export_materials='EXPORT',
            export_colors=True,
            export_texcoords=True,
            export_normals=True,
            export_apply=True
        )
        print(f"✓ Exported: {safe_name}.glb")
        exported_count += 1
    except Exception as e:
        print(f"✗ Error exporting {obj.name}: {e}")

print(f"\n✅ Successfully exported {exported_count} models to {OUTPUT_DIR}")
