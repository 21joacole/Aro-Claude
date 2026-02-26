import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FBX_PATH = path.join(__dirname, '../src/assets/Lights/Full_Photo_Studio_Collection_Fbx/Photo_Studio_Collection.FBX');
const OUTPUT_DIR = path.join(__dirname, '../src/assets/Lights/StudioCollection');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const loader = new FBXLoader();

console.log('Loading FBX file...');
loader.load(FBX_PATH, (fbxScene) => {
  console.log('\n=== FBX Scene Structure ===\n');

  const models = [];

  fbxScene.traverse((child) => {
    if (child.isMesh || child.isGroup) {
      const depth = getDepth(child);
      const indent = '  '.repeat(depth);
      console.log(`${indent}${child.type}: ${child.name}`);

      if (child.isMesh && child.name && child.name.trim() !== '') {
        models.push({
          name: child.name,
          object: child
        });
      }
    }
  });

  console.log(`\n\nFound ${models.length} named meshes to extract\n`);

  const exporter = new GLTFExporter();
  let exportCount = 0;

  models.forEach((model, index) => {
    const sanitizedName = sanitizeName(model.name);
    const outputPath = path.join(OUTPUT_DIR, `${sanitizedName}.glb`);

    const clonedMesh = model.object.clone();
    const tempScene = new THREE.Scene();
    tempScene.add(clonedMesh);

    exporter.parse(
      tempScene,
      (result) => {
        const buffer = Buffer.from(result);
        fs.writeFileSync(outputPath, buffer);
        console.log(`✓ Exported: ${sanitizedName}.glb`);
        exportCount++;

        if (exportCount === models.length) {
          console.log(`\n✅ Successfully exported ${exportCount} models to ${OUTPUT_DIR}`);
          process.exit(0);
        }
      },
      (error) => {
        console.error(`✗ Error exporting ${model.name}:`, error);
        exportCount++;

        if (exportCount === models.length) {
          console.log(`\n✅ Finished with ${exportCount} exports`);
          process.exit(0);
        }
      },
      { binary: true }
    );
  });

  if (models.length === 0) {
    console.log('No models found to export. Checking top-level objects...');

    const topLevelObjects = [];
    fbxScene.children.forEach(child => {
      if (child.isMesh || child.isGroup) {
        topLevelObjects.push(child);
      }
    });

    console.log(`Found ${topLevelObjects.length} top-level objects`);
    process.exit(0);
  }
}, undefined, (error) => {
  console.error('Error loading FBX:', error);
  process.exit(1);
});

function getDepth(object) {
  let depth = 0;
  let current = object;
  while (current.parent) {
    depth++;
    current = current.parent;
  }
  return depth - 1;
}

function sanitizeName(name) {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}
