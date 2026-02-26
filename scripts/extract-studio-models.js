import { execSync } from 'child_process';
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

const tempGltfPath = path.join(OUTPUT_DIR, 'temp_full_collection.gltf');

console.log('Converting FBX to GLTF...');
try {
  execSync(`npx fbx2gltf "${FBX_PATH}" --output "${tempGltfPath}"`, { stdio: 'inherit' });
} catch (error) {
  console.error('FBX conversion failed:', error.message);
  process.exit(1);
}

console.log('FBX converted successfully!');
console.log('Individual model extraction requires manual process or specialized tools.');
console.log('The GLTF file has been created at:', tempGltfPath);
console.log('\nNext steps:');
console.log('1. Open the GLTF file in Blender');
console.log('2. Select each object and export individually as GLB');
console.log('3. Save to the StudioCollection folder with appropriate names');
