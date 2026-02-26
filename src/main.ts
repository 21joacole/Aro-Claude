import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { getLightingPreset, type LightingPresetName } from "./lib/lightingPresets";
import type { LightKind, LightRigSnapshot } from "./lib/types";
import { showEquipmentModal } from "./lib/equipmentManager";
import { showPosesModal, showExpressionsModal, showCharacterCustomizationModal, showModelTransformModal } from "./lib/characterManager";
import { showTimelineModal, addKeyframe, togglePlayback } from "./lib/animationManager";
import { animationLibrary } from "./lib/animationLibrary";
import { showNewProjectModal, showLoadProjectModal, saveCurrentProject } from "./lib/projectManager";
import { showEnvironmentTypeModal, showBackgroundsModal, showHDRIModal, showSunPositionModal, showFogModal } from "./lib/environmentManager";
import { showRenderModal, showBlueprintModal, showDiagramModal, showSpecsModal } from "./lib/exportManager";
import { showCameraModelsModal, showLensSelectionModal, showDOFModal, showCameraPositionModal } from "./lib/advancedCameraManager";
import { AuthManager } from "./lib/auth";
import { CloudStorage } from "./lib/cloudStorage";
import { getModelAssetURL, getModelFilename } from "./lib/assetRegistry";
import { UIManager } from "./lib/uiManager";
import { supabase } from "./lib/supabase";
import { initEquipmentLibrary, initTopTabs, initRightPanelTabs } from "./lib/equipmentLibrary";

/* ---------------- DOM ---------------- */
const overheadCanvas = document.getElementById("overheadCanvas") as HTMLCanvasElement;
const modelCanvas = document.getElementById("modelCanvas") as HTMLCanvasElement;

const lightControlsEl = document.getElementById("lightControls") as HTMLDivElement;

const btnUndoTop = document.getElementById("btnUndoTop") as HTMLButtonElement;
const btnUndo = document.getElementById("btnUndo") as HTMLButtonElement;

const modelsContainer = document.getElementById('modelsContainer') as HTMLElement;

const btnL1 = document.getElementById("btnL1") as HTMLButtonElement;
const btnL2 = document.getElementById("btnL2") as HTMLButtonElement;
const btnL3 = document.getElementById("btnL3") as HTMLButtonElement;
const btnL5 = document.getElementById("btnL5") as HTMLButtonElement;

const isoEl = document.getElementById("iso") as HTMLInputElement;
const fstopEl = document.getElementById("fstop") as HTMLInputElement;
const shutterEl = document.getElementById("shutter") as HTMLInputElement;
const expCompEl = document.getElementById("expComp") as HTMLInputElement;
const maintainExposureEl = document.getElementById("maintainExposure") as HTMLInputElement;

const isoVal = document.getElementById("isoVal") as HTMLDivElement;
const fstopVal = document.getElementById("fstopVal") as HTMLDivElement;
const shutterVal = document.getElementById("shutterVal") as HTMLDivElement;
const expCompVal = document.getElementById("expCompVal") as HTMLDivElement;

const evVal = document.getElementById("evVal") as HTMLSpanElement;
const exposureVal = document.getElementById("exposureVal") as HTMLSpanElement;

/* ---------------- CONSTS ---------------- */
const COLORS = {
  backdrop: 0xffffff,
  accent: 0x92A694,
};
const LAYERS = { WORLD: 0, ICONS: 1 };
const FLOOR_Y = 0;

const specialModelSettings = {
  positionZ: -0.1,
  rotationX: Math.PI / 2,
  rotationY: 0,
  rotationZ: 0,
  targetHeight: 1.68
};

/* ---------------- THREE CORE ---------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.backdrop);

const loader = new GLTFLoader();
function assetURL(rel: string) {
  return new URL(rel, import.meta.url).toString();
}


/* Renderers (✅ no transparency -> consistent bright background) */
const overheadRenderer = new THREE.WebGLRenderer({ canvas: overheadCanvas, antialias: true, alpha: false });
const modelRenderer = new THREE.WebGLRenderer({ canvas: modelCanvas, antialias: true, alpha: false });

overheadRenderer.outputColorSpace = THREE.SRGBColorSpace;
modelRenderer.outputColorSpace = THREE.SRGBColorSpace;

overheadRenderer.toneMapping = THREE.ACESFilmicToneMapping;
modelRenderer.toneMapping = THREE.ACESFilmicToneMapping;

overheadRenderer.setClearColor(new THREE.Color(COLORS.backdrop), 1);
modelRenderer.setClearColor(new THREE.Color(COLORS.backdrop), 1);

overheadRenderer.shadowMap.enabled = true;
overheadRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
modelRenderer.shadowMap.enabled = true;
modelRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* Cameras */
const overheadCam = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
overheadCam.position.set(0, 8, 0.001);
overheadCam.lookAt(0, 0, 0);
overheadCam.layers.enable(LAYERS.WORLD);
overheadCam.layers.enable(LAYERS.ICONS);

const modelCam = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
modelCam.position.set(0, 1.6, 3.2);
modelCam.lookAt(0, 1.3, 0);
modelCam.layers.enable(LAYERS.WORLD);
modelCam.layers.disable(LAYERS.ICONS);

/* Controls */
const overheadControls = new OrbitControls(overheadCam, overheadCanvas);
overheadControls.enableDamping = true;
overheadControls.dampingFactor = 0.14;
overheadControls.rotateSpeed = 0.35;
overheadControls.panSpeed = 0.45;
overheadControls.zoomSpeed = 0.7;
overheadControls.target.set(0, 1.1, 0);
overheadControls.screenSpacePanning = true;
overheadControls.minDistance = 2;
overheadControls.maxDistance = 30;
overheadControls.maxPolarAngle = Math.PI / 2.05;

const modelControls = new OrbitControls(modelCam, modelCanvas);
modelControls.enableDamping = true;
modelControls.dampingFactor = 0.10;
modelControls.rotateSpeed = 0.6;
modelControls.zoomSpeed = 0.9;
modelControls.target.set(0, 1.3, 0);
modelControls.enablePan = false;
modelControls.minDistance = 1.8;
modelControls.maxDistance = 10;

/* Post-processing setup */
const composer = new EffectComposer(modelRenderer);
composer.addPass(new RenderPass(scene, modelCam));

const bokeh = new BokehPass(scene, modelCam, {
  focus: 4.0,
  aperture: 0.00015,
  maxblur: 0.01,
});
composer.addPass(bokeh);

/* Base lighting (✅ slightly brighter so both views aren't black) */
scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.22));
scene.add(new THREE.AmbientLight(0xffffff, 0.18));

/* HDRI Environment setup */
let pmremGenerator: THREE.PMREMGenerator | null = null;
let currentHDRTexture: THREE.Texture | null = null;

function initPMREMGenerator() {
  if (!pmremGenerator) {
    pmremGenerator = new THREE.PMREMGenerator(modelRenderer);
    pmremGenerator.compileEquirectangularShader();
  }
  return pmremGenerator;
}

async function loadHDREnvironment(hdrPath: string, setAsBackground = false) {
  const pmrem = initPMREMGenerator();

  return new Promise<void>((resolve, reject) => {
    new RGBELoader().load(
      hdrPath,
      (hdr) => {
        const envMap = pmrem.fromEquirectangular(hdr).texture;
        scene.environment = envMap;

        if (setAsBackground) {
          scene.background = envMap;
        }

        if (currentHDRTexture) {
          currentHDRTexture.dispose();
        }
        currentHDRTexture = envMap;

        hdr.dispose();
        resolve();
      },
      undefined,
      (error) => {
        console.error("Error loading HDR:", error);
        reject(error);
      }
    );
  });
}

function removeHDREnvironment() {
  if (currentHDRTexture) {
    currentHDRTexture.dispose();
    currentHDRTexture = null;
  }
  scene.environment = null;
  scene.background = null;
}

/* Dragging plane */
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_Y);

/* ---------------- Helpers ---------------- */
function forceBounds(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if ((mesh as any).isMesh && (mesh as any).geometry) {
      const g = (mesh as any).geometry as THREE.BufferGeometry;
      if (!g.boundingBox) g.computeBoundingBox();
      if (!g.boundingSphere) g.computeBoundingSphere();
    }
  });
}

function centerObjectXZ(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const c = new THREE.Vector3();
  box.getCenter(c);
  root.position.x += -c.x;
  root.position.z += -c.z;
  root.updateMatrixWorld(true);
}

function snapObjectMinYToFloor(root: THREE.Object3D, floorY = FLOOR_Y, pad = 0.01) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const minY = box.min.y;
  const delta = (floorY + pad) - minY;
  root.position.y += delta;
  root.updateMatrixWorld(true);
}

/* ---------------- Lighting Preset Functions ---------------- */
async function applyLightingPreset(presetName: LightingPresetName) {
  clearLights();

  const snapshots = getLightingPreset(presetName);

  for (const snap of snapshots) {
    await recreateFromSnapshot(snap);
  }

  if (rigs.length > 0) {
    selectRig(rigs[0]);
  }

  rebuildLightModulesUI();
}

/* ---------------- World assets ---------------- */
let currentSubjectModel: THREE.Object3D | null = null;
let currentBackdrop: THREE.Object3D | null = null;

function createDefaultFloorAndWalls() {
  const floorGeometry = new THREE.PlaneGeometry(20, 20);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  floor.layers.enable(LAYERS.WORLD);
  scene.add(floor);

  const wallGeometry = new THREE.PlaneGeometry(20, 10);
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
  });
  const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
  backWall.position.set(0, 5, -10);
  backWall.receiveShadow = true;
  backWall.layers.enable(LAYERS.WORLD);
  scene.add(backWall);
}

async function loadBackdrop(backdropPath?: string, scale: number = 3.0) {
  if (currentBackdrop) {
    scene.remove(currentBackdrop);
    currentBackdrop = null;
  }

  const url = backdropPath ? assetURL(backdropPath) : assetURL("./assets/Backdrop/SM5_Photography_Backdrop.glb");
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;

  forceBounds(root);
  root.traverse((o) => {
    o.layers.enable(LAYERS.WORLD);
    if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat: THREE.Material) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.color.setHex(0xffffff);
            mat.emissive.setHex(0x0);
            mat.metalness = 0.0;
            mat.roughness = 0.90;
            mat.needsUpdate = true;
          } else if (mat instanceof THREE.MeshPhongMaterial) {
            mat.color.setHex(0xffffff);
            mat.emissive.setHex(0x0);
            mat.needsUpdate = true;
          } else if (mat instanceof THREE.MeshBasicMaterial) {
            mat.color.setHex(0xffffff);
            mat.needsUpdate = true;
          }
        });
      }
    }
  });

  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.setScalar(scale);

  centerObjectXZ(root);
  snapObjectMinYToFloor(root, FLOOR_Y, 0.0);

  scene.add(root);
  currentBackdrop = root;
}

async function loadSubject(modelPath: string = "./assets/Models/human_bust.glb") {
  if (currentSubjectModel) {
    scene.remove(currentSubjectModel);
    currentSubjectModel = null;
  }

  const filename = getModelFilename(modelPath);
  const url = getModelAssetURL(filename);
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;

  forceBounds(root);
  root.traverse((o) => {
    o.layers.enable(LAYERS.WORLD);
    if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  // Apply different rotation for special models to face camera
  const isSpecialModel = modelPath.includes("Male_Human_Bust") ||
                         modelPath.includes("Female_Human_Bust") ||
                         modelPath.includes("African_American_Male") ||
                         modelPath.includes("African_American_Female");

  if (isSpecialModel) {
    root.rotation.set(
      -Math.PI / 2 + specialModelSettings.rotationX,
      Math.PI / 2 + Math.PI + specialModelSettings.rotationY,
      specialModelSettings.rotationZ
    );
  } else {
    root.rotation.set(-Math.PI / 2, Math.PI, 0);
  }

  root.scale.setScalar(1.0);
  root.position.set(0, 0, 0);

  centerObjectXZ(root);

  // scale by height
  let box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const targetHeight = isSpecialModel ? specialModelSettings.targetHeight : 1.6;
  const s = targetHeight / Math.max(0.001, size.y);
  root.scale.multiplyScalar(s);

  centerObjectXZ(root);
  snapObjectMinYToFloor(root, FLOOR_Y, 0.02);

  // Move special models toward backdrop (negative Z)
  if (isSpecialModel) {
    root.position.z += specialModelSettings.positionZ;
  }

  scene.add(root);
  currentSubjectModel = root;

  (currentSubjectModel.userData as any).modelPath = modelPath;

  modelControls.target.set(0, 1.2, 0);
  modelCam.position.set(0, 1.55, 3.0);
  modelCam.lookAt(modelControls.target);

  overheadControls.target.set(0, 1.1, 0);
  overheadCam.position.set(0, 8, 0.001);
  overheadCam.lookAt(overheadControls.target);
}

let cameraIconRoot: THREE.Object3D | null = null;
let viewfinderScreen: THREE.Mesh | null = null;
let viewfinderTexture: THREE.WebGLRenderTarget | null = null;

async function loadCameraIcon() {
  const url = assetURL("./assets/Camera/15_camera.glb");
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;

  forceBounds(root);
  root.traverse((o) => {
    o.layers.set(LAYERS.ICONS);
    if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat: THREE.Material) => {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
            mat.color.setHex(0xffffff);
            mat.emissive.setHex(0x0);
            mat.needsUpdate = true;
          } else if (mat instanceof THREE.MeshBasicMaterial) {
            mat.color.setHex(0xffffff);
            mat.needsUpdate = true;
          }
        });
      }
    }
  });
  root.scale.setScalar(0.55);

  root.position.set(0, 1.20, 3.0);
  root.rotation.set(0, Math.PI, 0);

  viewfinderTexture = new THREE.WebGLRenderTarget(256, 144, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  const screenGeo = new THREE.PlaneGeometry(0.15, 0.1);
  const screenMat = new THREE.MeshBasicMaterial({
    map: viewfinderTexture.texture,
    side: THREE.DoubleSide,
  });
  viewfinderScreen = new THREE.Mesh(screenGeo, screenMat);
  viewfinderScreen.layers.set(LAYERS.ICONS);

  viewfinderScreen.position.set(0, 0.05, -0.12);
  viewfinderScreen.rotation.set(0, 0, 0);

  root.add(viewfinderScreen);

  scene.add(root);
  cameraIconRoot = root;
}

/* ---------------- Light rigs ---------------- */
const lightModelPath: Record<LightKind, string> = {
  L1: "./assets/Lights/SM5_Photography_Flash_Long_Rectangular_Softbox.glb",
  L2: "./assets/Lights/SM5_Photography_Flash_Rectangular_Softbox.glb",
  L3: "./assets/Lights/SM5_Photography_Flash_Square_Softbox.glb",
  L5: "./assets/Lights/SM5_Photography_Studio_Flash_-_Type_02.glb",
};

const lightNiceName: Record<LightKind, string> = {
  L1: "Long Rect Softbox",
  L2: "Rect Softbox",
  L3: "Square Softbox",
  L5: "Small Round Light",
};

type LightRig = {
  id: string;
  kind: LightKind;
  group: THREE.Group;
  icon: THREE.Group;
  iconModel: THREE.Object3D;
  spot: THREE.SpotLight;
  target: THREE.Object3D;

  power: number;
  size: number;
  rotateDeg: number;
  color: string;

  iconBaseScale: number;
  iconYOffset: number;

  emitterLocal: THREE.Vector3;
  forwardLocal: THREE.Vector3;
};

const rigs: LightRig[] = [];
let selectedRig: LightRig | null = null;

/* Picking + dragging */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let dragging = false;
let dragStartPos: { x: number; z: number } | null = null;

/* ---------------- Undo only ---------------- */
type Action =
  | { type: "add"; snap: LightRigSnapshot }
  | { type: "remove"; snap: LightRigSnapshot }
  | { type: "move"; id: string; from: { x: number; z: number }; to: { x: number; z: number } };

const undoStack: Action[] = [];
const MAX_STACK = 30;

function refreshUndoButton() {
  if (btnUndo) btnUndo.disabled = undoStack.length === 0;
  if (btnUndoTop) btnUndoTop.disabled = undoStack.length === 0;
}

function pushUndo(a: Action) {
  undoStack.push(a);
  if (undoStack.length > MAX_STACK) undoStack.shift();
  refreshUndoButton();
}

function snapshotRig(r: LightRig): LightRigSnapshot {
  return {
    id: r.id,
    kind: r.kind,
    pos: { x: r.group.position.x, z: r.group.position.z },
    power: r.power,
    size: r.size,
    rotateDeg: r.rotateDeg,
    color: r.color,
  };
}

async function recreateFromSnapshot(s: LightRigSnapshot) {
  const rig = await createLightInternal(s.kind, s.id, false);
  setRigPosition(rig, s.pos.x, s.pos.z);
  setRigPower(rig, s.power);
  setRigSize(rig, s.size);
  setRigRotate(rig, s.rotateDeg);
  setRigColor(rig, s.color);
}

async function doUndo() {
  const a = undoStack.pop();
  if (!a) return;

  if (a.type === "add") {
    removeRigById(a.snap.id, false);
  } else if (a.type === "remove") {
    await recreateFromSnapshot(a.snap);
  } else if (a.type === "move") {
    const r = rigs.find((x) => x.id === a.id);
    if (r) setRigPosition(r, a.from.x, a.from.z);
  }
  refreshUndoButton();
  rebuildLightModulesUI();
}

if (btnUndo) btnUndo.addEventListener("click", () => void doUndo());
if (btnUndoTop) btnUndoTop.addEventListener("click", () => void doUndo());

/* ---------------- Selection helpers ---------------- */
function makeID() {
  return "L" + Math.random().toString(16).slice(2, 8).toUpperCase();
}

function markRigIdRecursive(obj: THREE.Object3D, rigId: string) {
  obj.userData.rigId = rigId;
  obj.children.forEach((c) => markRigIdRecursive(c, rigId));
}

function findRigIdUpChain(obj: THREE.Object3D | null): string | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData && cur.userData.rigId) return String(cur.userData.rigId);
    cur = cur.parent;
  }
  return null;
}

function selectRig(rig: LightRig | null) {
  selectedRig = rig;
  for (const r of rigs) {
    const ring = r.icon.getObjectByName("selRing") as THREE.Mesh | null;
    if (!ring) continue;
    const mat = ring.material as THREE.MeshBasicMaterial;
    mat.opacity = r === rig ? 1.0 : 0.35;
    mat.needsUpdate = true;
  }
  rebuildLightModulesUI();
}

/* ---------------- Dragging ---------------- */
function setNDCFromEvent(ev: PointerEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
}

function pickRigFromOverhead(ev: PointerEvent): LightRig | null {
  setNDCFromEvent(ev, overheadCanvas);
  raycaster.layers.set(LAYERS.ICONS);
  raycaster.setFromCamera(ndc, overheadCam);

  const iconObjects = rigs.map((r) => r.icon);
  const hits = raycaster.intersectObjects(iconObjects, true);
  if (!hits.length) return null;

  const rigId = findRigIdUpChain(hits[0].object);
  if (!rigId) return null;

  return rigs.find((r) => r.id === rigId) ?? null;
}

function computeIconFloorYOffsetStable(iconGroup: THREE.Group, iconModel: THREE.Object3D): number {
  const savedY = iconGroup.position.y;
  iconGroup.position.y = 0;
  iconGroup.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(iconModel);
  const offset = -box.min.y + 0.001;

  iconGroup.position.y = savedY;
  iconGroup.updateMatrixWorld(true);

  return offset;
}

function applyIconScaleAndFloorSnap(r: LightRig) {
  const s = r.iconBaseScale * r.size;
  r.icon.scale.setScalar(s);
  r.icon.updateMatrixWorld(true);

  r.iconYOffset = computeIconFloorYOffsetStable(r.icon, r.iconModel);
  r.icon.position.y = r.iconYOffset;

  r.spot.position.copy(r.emitterLocal);

  const aimDist = 2.0;
  const t = r.emitterLocal.clone().add(r.forwardLocal.clone().multiplyScalar(aimDist));
  r.target.position.copy(t);
}

function setRigPosition(r: LightRig, x: number, z: number) {
  // ✅ only move the parent group; icon is local inside it
  r.group.position.set(x, 0, z);
}

function setRigPower(r: LightRig, power: number) {
  r.power = power;
  r.spot.intensity = power;
}

function setRigSize(r: LightRig, size: number) {
  r.size = size;
  applyIconScaleAndFloorSnap(r);

  const baseDeg = 42;
  const newDeg = THREE.MathUtils.clamp(baseDeg * Math.sqrt(size), 18, 80);
  r.spot.angle = THREE.MathUtils.degToRad(newDeg);

  const pen = THREE.MathUtils.clamp(0.10 + 0.35 * Math.log(size + 1), 0.05, 0.9);
  r.spot.penumbra = pen;
}

function setRigRotate(r: LightRig, deg: number) {
  r.rotateDeg = THREE.MathUtils.clamp(deg, -180, 180);

  // ✅ rotate the iconHolder (and therefore its light + target)
  r.icon.rotation.y = THREE.MathUtils.degToRad(r.rotateDeg);
}

function setRigColor(r: LightRig, hexColor: string) {
  r.color = hexColor;
  r.spot.color.setStyle(hexColor);
}

function dragSelectedRig(ev: PointerEvent) {
  if (!selectedRig) return;

  setNDCFromEvent(ev, overheadCanvas);
  raycaster.layers.set(LAYERS.ICONS);
  raycaster.setFromCamera(ndc, overheadCam);

  const hitPoint = new THREE.Vector3();
  const ok = raycaster.ray.intersectPlane(dragPlane, hitPoint);
  if (!ok) return;

  const minR = 0.6;
  const v2 = new THREE.Vector2(hitPoint.x, hitPoint.z);
  if (v2.length() < minR) v2.setLength(minR);

  setRigPosition(selectedRig, v2.x, v2.y);
}

function setDragging(on: boolean) {
  dragging = on;
  overheadControls.enabled = !on;
}

overheadCanvas.addEventListener("pointerdown", (ev) => {
  const picked = pickRigFromOverhead(ev);
  if (!picked) return;

  ev.preventDefault();
  ev.stopPropagation();

  selectRig(picked);
  dragStartPos = { x: picked.group.position.x, z: picked.group.position.z };
  setDragging(true);

  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    dragSelectedRig(e);
  };

  const onUp = () => {
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("pointercancel", onUp, true);

    if (dragging && selectedRig && dragStartPos) {
      const end = { x: selectedRig.group.position.x, z: selectedRig.group.position.z };
      const moved = Math.hypot(end.x - dragStartPos.x, end.z - dragStartPos.z) > 0.0001;
      if (moved) pushUndo({ type: "move", id: selectedRig.id, from: dragStartPos, to: end });
    }

    dragStartPos = null;
    setDragging(false);
  };

  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onUp, true);
});

/* ---------------- FIXED emitter placement ---------------- */
/**
 * ✅ Compute emitter in WORLD, then convert to iconHolder LOCAL.
 * This fixes the "light coming from side/bottom" bug.
 */
function computeFixedEmitterLocal(
  iconHolder: THREE.Object3D,
  iconModel: THREE.Object3D,
  kind: LightKind
): { emitterLocal: THREE.Vector3; forwardLocal: THREE.Vector3 } {
  iconHolder.updateMatrixWorld(true);
  iconModel.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(iconModel);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  let yPct = 0.95;
  let zOffset = 0.02;

  if (kind === "L1") { yPct = 0.96; zOffset = 0.03; }
  if (kind === "L2") { yPct = 0.95; zOffset = 0.025; }
  if (kind === "L3") { yPct = 0.95; zOffset = 0.02; }
  if (kind === "L5") { yPct = 0.97; zOffset = 0.04; }

  const emitterWorld = new THREE.Vector3(
    center.x,
    box.min.y + size.y * yPct,
    center.z + zOffset
  );

  const emitterLocal = iconHolder.worldToLocal(emitterWorld.clone());

  const angle400 = THREE.MathUtils.degToRad(-90);
  const forwardLocal = new THREE.Vector3(
    Math.sin(angle400),
    0,
    Math.cos(angle400)
  );

  return { emitterLocal, forwardLocal };
}

/* ---------------- Create/remove lights ---------------- */
async function createLight(kind: LightKind) {
  const rig = await createLightInternal(kind, makeID(), true);
  selectRig(rig);
  rebuildLightModulesUI();
}

async function createLightInternal(kind: LightKind, id: string, recordUndo: boolean) {
  const group = new THREE.Group();
  group.layers.enable(LAYERS.WORLD);

  const iconURL = assetURL(lightModelPath[kind]);
  const gltf = await loader.loadAsync(iconURL);
  const iconModel = gltf.scene;

  forceBounds(iconModel);
  iconModel.traverse((o) => {
    o.layers.set(LAYERS.ICONS);
    if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat: THREE.Material) => {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
            mat.color.setHex(0xffffff);
            mat.emissive.setHex(0x0);
            mat.needsUpdate = true;
          } else if (mat instanceof THREE.MeshBasicMaterial) {
            mat.color.setHex(0xffffff);
            mat.needsUpdate = true;
          }
        });
      }
    }
  });

  // selection ring
  const ringGeo = new THREE.RingGeometry(0.16, 0.22, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: COLORS.accent,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthTest: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.name = "selRing";
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.006;
  ring.layers.set(LAYERS.ICONS);

  const iconHolder = new THREE.Group();
  iconHolder.layers.set(LAYERS.ICONS);
  iconHolder.add(iconModel);
  iconHolder.add(ring);

  // ✅ iconHolder is inside group now (no double-position bug)
  group.add(iconHolder);

  // target + spotlight
  const target = new THREE.Object3D();
  iconHolder.add(target);

  const spot = new THREE.SpotLight(0xffffff, 1800, 35, THREE.MathUtils.degToRad(42), 0.3, 2.0);
  spot.decay = 2.0;
  spot.penumbra = 0.22;
  spot.target = target;
  spot.castShadow = true;
  spot.shadow.mapSize.width = 2048;
  spot.shadow.mapSize.height = 2048;
  spot.shadow.camera.near = 0.1;
  spot.shadow.camera.far = 35;
  spot.shadow.bias = -0.001;
  spot.shadow.normalBias = 0.05;
  iconHolder.add(spot);

  // start around subject
  const startAngle = rigs.length * 0.9;
  const radius = 2.2;
  const x = Math.cos(startAngle) * radius;
  const z = Math.sin(startAngle) * radius;

  group.position.set(x, 0, z);

  // orient the light to face the subject by default
  // Calculate angle to point toward origin (subject)
  iconHolder.rotation.y = Math.atan2(-x, -z);

  markRigIdRecursive(iconHolder, id);

  scene.add(group);

  // ✅ compute emitter LOCAL correctly
  const { emitterLocal, forwardLocal } = computeFixedEmitterLocal(iconHolder, iconModel, kind);

  spot.position.copy(emitterLocal);
  const aimDist = 2.0;
  target.position.copy(emitterLocal.clone().add(forwardLocal.clone().multiplyScalar(aimDist)));

  const rig: LightRig = {
    id,
    kind,
    group,
    icon: iconHolder,
    iconModel,
    spot,
    target,
    power: 1800,
    size: 1.0,
    rotateDeg: -100,
    color: '#ffffff',
    iconBaseScale: 0.35,
    iconYOffset: 0.0,
    emitterLocal,
    forwardLocal,
  };

  applyIconScaleAndFloorSnap(rig);
  setRigPower(rig, rig.power);
  setRigSize(rig, rig.size);
  setRigRotate(rig, rig.rotateDeg);

  rigs.push(rig);

  if (recordUndo) pushUndo({ type: "add", snap: snapshotRig(rig) });
  refreshUndoButton();

  return rig;
}

function removeRigById(id: string, recordUndo: boolean) {
  const idx = rigs.findIndex((r) => r.id === id);
  if (idx === -1) return;

  const r = rigs[idx];
  const snap = snapshotRig(r);

  scene.remove(r.group);
  rigs.splice(idx, 1);

  if (recordUndo) pushUndo({ type: "remove", snap });
  refreshUndoButton();

  if (selectedRig?.id === id) selectRig(rigs[0] ?? null);
  rebuildLightModulesUI();
}

/* ---------------- UI: lighting modules ---------------- */
function rebuildLightModulesUI() {
  lightControlsEl.innerHTML = "";

  if (rigs.length === 0) {
    const d = document.createElement("div");
    d.className = "hint";
    d.textContent = "Add a light to generate controls.";
    lightControlsEl.appendChild(d);
    return;
  }

  for (const r of rigs) {
    const mod = document.createElement("div");
    mod.className = "lightModule";

    const header = document.createElement("div");
    header.className = "lightModuleHeader";

    const name = document.createElement("div");
    name.className = "lightName";
    name.textContent = lightNiceName[r.kind] + (selectedRig?.id === r.id ? " (selected)" : "");

    const idEl = document.createElement("div");
    idEl.className = "lightId";
    idEl.textContent = r.id;

    header.appendChild(name);
    header.appendChild(idEl);
    header.addEventListener("click", () => selectRig(r));

    // POWER
    const rowP = document.createElement("div");
    rowP.className = "lightRow";
    const labelP = document.createElement("label");
    labelP.textContent = "Power";
    const sliderP = document.createElement("input");
    sliderP.type = "range";
    sliderP.min = "0";
    sliderP.max = "6000";
    sliderP.step = "10";
    sliderP.value = String(r.power);
    const valP = document.createElement("div");
    valP.className = "lightVal";
    valP.textContent = `${Math.round(r.power)}`;
    sliderP.addEventListener("input", () => {
      const v = parseFloat(sliderP.value);
      setRigPower(r, THREE.MathUtils.clamp(v, 0, 6000));
      valP.textContent = `${Math.round(r.power)}`;
    });
    rowP.appendChild(labelP);
    rowP.appendChild(sliderP);
    rowP.appendChild(valP);

    // SIZE
    const rowS = document.createElement("div");
    rowS.className = "lightRow";
    const labelS = document.createElement("label");
    labelS.textContent = "Size";
    const sliderS = document.createElement("input");
    sliderS.type = "range";
    sliderS.min = "0.25";
    sliderS.max = "6.0";
    sliderS.step = "0.01";
    sliderS.value = String(r.size);
    const valS = document.createElement("div");
    valS.className = "lightVal";
    valS.textContent = `${r.size.toFixed(2)}x`;
    sliderS.addEventListener("input", () => {
      const v = parseFloat(sliderS.value);
      setRigSize(r, THREE.MathUtils.clamp(v, 0.25, 6.0));
      valS.textContent = `${r.size.toFixed(2)}x`;
    });
    rowS.appendChild(labelS);
    rowS.appendChild(sliderS);
    rowS.appendChild(valS);

    // ROTATE
    const rowR = document.createElement("div");
    rowR.className = "lightRow";
    const labelR = document.createElement("label");
    labelR.textContent = "Rotate";
    const sliderR = document.createElement("input");
    sliderR.type = "range";
    sliderR.min = "-180";
    sliderR.max = "180";
    sliderR.step = "1";
    sliderR.value = String(r.rotateDeg);
    const valR = document.createElement("div");
    valR.className = "lightVal";
    valR.textContent = `${Math.round(r.rotateDeg)}°`;
    sliderR.addEventListener("input", () => {
      const v = parseFloat(sliderR.value);
      setRigRotate(r, v);
      valR.textContent = `${Math.round(r.rotateDeg)}°`;
    });
    rowR.appendChild(labelR);
    rowR.appendChild(sliderR);
    rowR.appendChild(valR);

    // COLOR
    const rowC = document.createElement("div");
    rowC.className = "lightRow";
    const labelC = document.createElement("label");
    labelC.textContent = "Color";
    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.value = r.color;
    colorPicker.style.width = "60px";
    colorPicker.style.height = "32px";
    colorPicker.style.cursor = "pointer";
    const valC = document.createElement("div");
    valC.className = "lightVal";
    valC.textContent = r.color.toUpperCase();
    colorPicker.addEventListener("input", () => {
      const color = colorPicker.value;
      setRigColor(r, color);
      valC.textContent = color.toUpperCase();
    });
    rowC.appendChild(labelC);
    rowC.appendChild(colorPicker);
    rowC.appendChild(valC);

    // EMITTER X
    const rowEX = document.createElement("div");
    rowEX.className = "lightRow";
    const labelEX = document.createElement("label");
    labelEX.textContent = "Emitter X";
    const sliderEX = document.createElement("input");
    sliderEX.type = "range";
    sliderEX.min = "-0.5";
    sliderEX.max = "0.5";
    sliderEX.step = "0.001";
    sliderEX.value = String(r.emitterLocal.x);
    const valEX = document.createElement("div");
    valEX.className = "lightVal";
    valEX.textContent = `${r.emitterLocal.x.toFixed(3)}`;
    sliderEX.addEventListener("input", () => {
      const v = parseFloat(sliderEX.value);
      r.emitterLocal.x = v;
      applyIconScaleAndFloorSnap(r);
      valEX.textContent = `${v.toFixed(3)}`;
    });
    rowEX.appendChild(labelEX);
    rowEX.appendChild(sliderEX);
    rowEX.appendChild(valEX);

    // EMITTER Y
    const rowEY = document.createElement("div");
    rowEY.className = "lightRow";
    const labelEY = document.createElement("label");
    labelEY.textContent = "Emitter Y";
    const sliderEY = document.createElement("input");
    sliderEY.type = "range";
    sliderEY.min = "-0.5";
    sliderEY.max = "1.5";
    sliderEY.step = "0.001";
    sliderEY.value = String(r.emitterLocal.y);
    const valEY = document.createElement("div");
    valEY.className = "lightVal";
    valEY.textContent = `${r.emitterLocal.y.toFixed(3)}`;
    sliderEY.addEventListener("input", () => {
      const v = parseFloat(sliderEY.value);
      r.emitterLocal.y = v;
      applyIconScaleAndFloorSnap(r);
      valEY.textContent = `${v.toFixed(3)}`;
    });
    rowEY.appendChild(labelEY);
    rowEY.appendChild(sliderEY);
    rowEY.appendChild(valEY);

    // EMITTER Z
    const rowEZ = document.createElement("div");
    rowEZ.className = "lightRow";
    const labelEZ = document.createElement("label");
    labelEZ.textContent = "Emitter Z";
    const sliderEZ = document.createElement("input");
    sliderEZ.type = "range";
    sliderEZ.min = "-0.5";
    sliderEZ.max = "0.5";
    sliderEZ.step = "0.001";
    sliderEZ.value = String(r.emitterLocal.z);
    const valEZ = document.createElement("div");
    valEZ.className = "lightVal";
    valEZ.textContent = `${r.emitterLocal.z.toFixed(3)}`;
    sliderEZ.addEventListener("input", () => {
      const v = parseFloat(sliderEZ.value);
      r.emitterLocal.z = v;
      applyIconScaleAndFloorSnap(r);
      valEZ.textContent = `${v.toFixed(3)}`;
    });
    rowEZ.appendChild(labelEZ);
    rowEZ.appendChild(sliderEZ);
    rowEZ.appendChild(valEZ);

    // PRINT EMITTER POSITION BUTTON
    const printRow = document.createElement("div");
    printRow.style.marginTop = "8px";
    const printBtn = document.createElement("button");
    printBtn.className = "btn";
    printBtn.textContent = "Print Emitter Position";
    printBtn.style.background = "rgba(150,200,255,0.92)";
    printBtn.addEventListener("click", () => {
      console.log(`Light ${r.id} (${r.kind}): emitterLocal = (${r.emitterLocal.x.toFixed(3)}, ${r.emitterLocal.y.toFixed(3)}, ${r.emitterLocal.z.toFixed(3)})`);
    });
    printRow.appendChild(printBtn);

    // REMOVE
    const remRow = document.createElement("div");
    remRow.style.marginTop = "8px";
    const remBtn = document.createElement("button");
    remBtn.className = "btn";
    remBtn.textContent = "Remove Light";
    remBtn.style.background = "rgba(255,255,255,0.92)";
    remBtn.addEventListener("click", () => {
      removeRigById(r.id, true);
    });
    remRow.appendChild(remBtn);

    mod.appendChild(header);
    mod.appendChild(rowP);
    mod.appendChild(rowS);
    mod.appendChild(rowR);
    mod.appendChild(rowC);
    mod.appendChild(rowEX);
    mod.appendChild(rowEY);
    mod.appendChild(rowEZ);
    mod.appendChild(printRow);
    mod.appendChild(remRow);

    lightControlsEl.appendChild(mod);
  }
}

/* ---------------- Camera exposure ---------------- */
function computeEV100(iso: number, f: number, t: number) {
  return Math.log2((f * f) / t) - Math.log2(iso / 100);
}
function evToExposure(ev100: number, expComp: number) {
  const base = 0.85;
  const exposure = base * Math.pow(2, -(ev100 - 10.0)) * Math.pow(2, expComp);
  return THREE.MathUtils.clamp(exposure, 0.02, 4.0);
}
function formatShutter(t: number) {
  const inv = Math.round(1 / t);
  if (inv >= 2) return `1/${inv}`;
  return `${t.toFixed(3)}s`;
}

let lockedExposure: number | null = null;
function syncUI() {
  const iso = parseFloat(isoEl.value);
  const f = parseFloat(fstopEl.value);
  const t = parseFloat(shutterEl.value);
  const expComp = parseFloat(expCompEl.value);

  isoVal.textContent = iso.toFixed(0);
  fstopVal.textContent = f.toFixed(1);
  shutterVal.textContent = formatShutter(t);
  expCompVal.textContent = expComp.toFixed(1);

  const ev = computeEV100(iso, f, t);
  evVal.textContent = ev.toFixed(2);

  if (maintainExposureEl.checked) {
    if (lockedExposure == null) lockedExposure = modelRenderer.toneMappingExposure;
    const exposureValue = lockedExposure ?? 1.0;
    modelRenderer.toneMappingExposure = exposureValue;
    overheadRenderer.toneMappingExposure = exposureValue;
    exposureVal.textContent = exposureValue.toFixed(3);
  } else {
    lockedExposure = null;
    const exposure = evToExposure(ev, expComp);
    modelRenderer.toneMappingExposure = exposure;
    overheadRenderer.toneMappingExposure = exposure;
    exposureVal.textContent = exposure.toFixed(3);
  }

  const apertureValue = THREE.MathUtils.clamp(0.00001 * Math.pow(1 / f, 2), 0.00001, 0.001);
  (bokeh.uniforms as any)['aperture'].value = apertureValue;

  const maxBlurValue = THREE.MathUtils.clamp(0.005 + (1 / f) * 0.01, 0.005, 0.03);
  (bokeh.uniforms as any)['maxblur'].value = maxBlurValue;
}
[isoEl, fstopEl, shutterEl, expCompEl, maintainExposureEl].forEach((el) => el.addEventListener("input", syncUI));

/* ---------------- Reset ---------------- */
function clearLights() {
  for (const r of rigs) {
    scene.remove(r.group);
  }
  rigs.length = 0;
  selectedRig = null;
  rebuildLightModulesUI();
}

function resetScene() {
  clearLights();
  undoStack.length = 0;
  refreshUndoButton();

  if (currentSubjectModel) {
    scene.remove(currentSubjectModel);
    currentSubjectModel = null;
  }

  if (currentBackdrop) {
    scene.remove(currentBackdrop);
    currentBackdrop = null;
  }

  const removeHDR = (window as any).removeHDREnvironment;
  if (removeHDR) {
    removeHDR();
  }

  overheadControls.target.set(0, 1.1, 0);
  overheadCam.position.set(0, 8, 0.001);
  overheadControls.update();

  modelControls.target.set(0, 1.3, 0);
  modelCam.position.set(0, 1.55, 3.0);
  modelControls.update();

  isoEl.value = "200";
  fstopEl.value = "2.8";
  shutterEl.value = "0.008";
  expCompEl.value = "0";
  maintainExposureEl.checked = false;
  lockedExposure = null;
  syncUI();

  collapseAllPanels();
}

const menuEdit = document.getElementById("menuEdit") as HTMLButtonElement;
const editDropdown = document.getElementById("editDropdown") as HTMLElement;
const menuReset = document.getElementById("menuReset") as HTMLButtonElement;

menuEdit?.addEventListener("click", (e) => {
  e.stopPropagation();
  const isVisible = editDropdown.style.display === "block";
  editDropdown.style.display = isVisible ? "none" : "block";
});

document.addEventListener("click", () => {
  if (editDropdown) editDropdown.style.display = "none";
});

menuReset?.addEventListener("click", () => {
  if (confirm("Are you sure you want to reset the scene? This will remove all models, lights, backdrops, and reset camera settings.")) {
    resetScene();
  }
  if (editDropdown) editDropdown.style.display = "none";
});

/* Model buttons - dynamically loaded */
async function loadModelButtons() {
  if (!modelsContainer) return;

  const { data: models, error } = await supabase
    .from('models')
    .select('*')
    .order('is_default', { ascending: false });

  if (error) {
    console.error('Error loading models:', error);
    return;
  }

  modelsContainer.innerHTML = '';

  models?.forEach((model) => {
    const button = document.createElement('button');
    button.className = 'btn btnPrimary';
    button.textContent = model.name;
    button.addEventListener('click', () => void loadSubject(model.file_path));
    modelsContainer.appendChild(button);
  });
}

loadModelButtons();

initEquipmentLibrary(
  (modelPath: string) => void loadSubject(modelPath),
  (lightType: string) => void createLight(lightType as LightKind),
  (presetName: string) => void applyLightingPreset(presetName as LightingPresetName)
);

initTopTabs();
initRightPanelTabs();

/* Light buttons - keep for sidebar backward compatibility */
btnL1?.addEventListener("click", () => void createLight("L1"));
btnL2?.addEventListener("click", () => void createLight("L2"));
btnL3?.addEventListener("click", () => void createLight("L3"));
btnL5?.addEventListener("click", () => void createLight("L5"));

/* Lighting preset buttons - Classic Portrait */
const btnButterfly = document.getElementById("btnButterfly") as HTMLButtonElement;
const btnLoop = document.getElementById("btnLoop") as HTMLButtonElement;
const btnRembrandt = document.getElementById("btnRembrandt") as HTMLButtonElement;
const btnSplit = document.getElementById("btnSplit") as HTMLButtonElement;
const btnBroad = document.getElementById("btnBroad") as HTMLButtonElement;
const btnShort = document.getElementById("btnShort") as HTMLButtonElement;

btnButterfly.addEventListener("click", () => void applyLightingPreset("butterfly"));
btnLoop.addEventListener("click", () => void applyLightingPreset("loop"));
btnRembrandt.addEventListener("click", () => void applyLightingPreset("rembrandt"));
btnSplit.addEventListener("click", () => void applyLightingPreset("split"));
btnBroad.addEventListener("click", () => void applyLightingPreset("broad"));
btnShort.addEventListener("click", () => void applyLightingPreset("short"));

/* Lighting preset buttons - Special Effects */
const btnRim = document.getElementById("btnRim") as HTMLButtonElement;
const btnHair = document.getElementById("btnHair") as HTMLButtonElement;
const btnKicker = document.getElementById("btnKicker") as HTMLButtonElement;

btnRim.addEventListener("click", () => void applyLightingPreset("rim"));
btnHair.addEventListener("click", () => void applyLightingPreset("hair"));
btnKicker.addEventListener("click", () => void applyLightingPreset("kicker"));

/* ---------------- NEW FEATURE BUTTONS ---------------- */

// Project Management
const btnNewProject = document.getElementById("btnNewProject") as HTMLButtonElement;
const btnLoadProject = document.getElementById("btnLoadProject") as HTMLButtonElement;
const btnSaveProject = document.getElementById("btnSaveProject") as HTMLButtonElement;

btnNewProject.addEventListener("click", () => showNewProjectModal());
btnLoadProject.addEventListener("click", () => {
  void showLoadProjectModal(async (sceneData) => {
    await restoreSceneState(sceneData);
  });
});
btnSaveProject.addEventListener("click", () => {
  const sceneState = captureSceneState();
  void saveCurrentProject(sceneState);
});

// Equipment Library
const btnCameras = document.getElementById("btnCameras") as HTMLButtonElement;
const btnLenses = document.getElementById("btnLenses") as HTMLButtonElement;
const btnModifiers = document.getElementById("btnModifiers") as HTMLButtonElement;
const btnProps = document.getElementById("btnProps") as HTMLButtonElement;

btnCameras.addEventListener("click", () => showEquipmentModal('cameras'));
btnLenses.addEventListener("click", () => showEquipmentModal('lenses'));
btnModifiers.addEventListener("click", () => showEquipmentModal('modifiers'));
btnProps.addEventListener("click", () => showEquipmentModal('props'));

// Character Controls
const btnModelTransform = document.getElementById("btnModelTransform") as HTMLButtonElement;
const btnPoses = document.getElementById("btnPoses") as HTMLButtonElement;
const btnExpressions = document.getElementById("btnExpressions") as HTMLButtonElement;
const btnCharacterCustomize = document.getElementById("btnCharacterCustomize") as HTMLButtonElement;

btnModelTransform.addEventListener("click", () => {
  showModelTransformModal(currentSubjectModel, (rotation, position, scale) => {
    if (currentSubjectModel) {
      currentSubjectModel.rotation.set(rotation.x, rotation.y, rotation.z);
      currentSubjectModel.position.set(position.x, position.y, position.z);
      currentSubjectModel.scale.setScalar(scale);
    }
  });
});
btnPoses.addEventListener("click", () => showPosesModal());
btnExpressions.addEventListener("click", () => showExpressionsModal());
btnCharacterCustomize.addEventListener("click", () => showCharacterCustomizationModal());

// Environment
const btnEnvironmentType = document.getElementById("btnEnvironmentType") as HTMLButtonElement;
const btnBackgrounds = document.getElementById("btnBackgrounds") as HTMLButtonElement;
const btnHDRI = document.getElementById("btnHDRI") as HTMLButtonElement;
const btnSunPosition = document.getElementById("btnSunPosition") as HTMLButtonElement;
const btnFog = document.getElementById("btnFog") as HTMLButtonElement;

btnEnvironmentType.addEventListener("click", () => showEnvironmentTypeModal());
btnBackgrounds.addEventListener("click", () => {
  void showBackgroundsModal(async (backdropPath: string, scale: number) => {
    await loadBackdrop(backdropPath, scale);
  });
});
btnHDRI.addEventListener("click", () => {
  (window as any).removeHDREnvironment = removeHDREnvironment;
  void showHDRIModal(async (path: string, showBackground: boolean) => {
    await loadHDREnvironment(path, showBackground);
  });
});
btnSunPosition.addEventListener("click", () => showSunPositionModal());
btnFog.addEventListener("click", () => showFogModal());

// Advanced Camera
const btnCameraModels = document.getElementById("btnCameraModels") as HTMLButtonElement;
const btnLensSelection = document.getElementById("btnLensSelection") as HTMLButtonElement;
const btnDOF = document.getElementById("btnDOF") as HTMLButtonElement;
const btnCameraPosition = document.getElementById("btnCameraPosition") as HTMLButtonElement;

btnCameraModels.addEventListener("click", () => showCameraModelsModal());
btnLensSelection.addEventListener("click", () => showLensSelectionModal());
btnDOF.addEventListener("click", () => showDOFModal());
btnCameraPosition.addEventListener("click", () => showCameraPositionModal());

// Animation - Bottom Panel
const btnTimelineBottom = document.getElementById("btnTimelineBottom") as HTMLButtonElement;
const btnKeyframeBottom = document.getElementById("btnKeyframeBottom") as HTMLButtonElement;
const btnPlayAnimationBottom = document.getElementById("btnPlayAnimationBottom") as HTMLButtonElement;

if (btnTimelineBottom) btnTimelineBottom.addEventListener("click", () => showTimelineModal());
if (btnKeyframeBottom) btnKeyframeBottom.addEventListener("click", () => addKeyframe());
if (btnPlayAnimationBottom) btnPlayAnimationBottom.addEventListener("click", () => togglePlayback());

// Character Controls - Bottom Panel
const btnPosesBottom = document.getElementById("btnPosesBottom") as HTMLButtonElement;
const btnExpressionsBottom = document.getElementById("btnExpressionsBottom") as HTMLButtonElement;
const btnCustomizeBottom = document.getElementById("btnCustomizeBottom") as HTMLButtonElement;
const btnTransformBottom = document.getElementById("btnTransformBottom") as HTMLButtonElement;

if (btnPosesBottom) btnPosesBottom.addEventListener("click", () => showPosesModal());
if (btnExpressionsBottom) btnExpressionsBottom.addEventListener("click", () => showExpressionsModal());
if (btnCustomizeBottom) btnCustomizeBottom.addEventListener("click", () => showCharacterCustomizationModal());
if (btnTransformBottom) btnTransformBottom.addEventListener("click", () => {
  showModelTransformModal(currentSubjectModel, (rotation, position, scale) => {
    if (currentSubjectModel) {
      currentSubjectModel.rotation.set(rotation.x, rotation.y, rotation.z);
      currentSubjectModel.position.set(position.x, position.y, position.z);
      currentSubjectModel.scale.set(scale, scale, scale);
    }
  });
});

// Export
const btnExportRender = document.getElementById("btnExportRender") as HTMLButtonElement;
const btnExportBlueprint = document.getElementById("btnExportBlueprint") as HTMLButtonElement;
const btnExportDiagram = document.getElementById("btnExportDiagram") as HTMLButtonElement;
const btnExportSpecs = document.getElementById("btnExportSpecs") as HTMLButtonElement;

btnExportRender.addEventListener("click", () => showRenderModal());
btnExportBlueprint.addEventListener("click", () => showBlueprintModal());
btnExportDiagram.addEventListener("click", () => showDiagramModal());
btnExportSpecs.addEventListener("click", () => showSpecsModal());

/* ---------------- Resize ---------------- */
function resizeRendererToCanvas(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
  const w = Math.max(2, Math.floor(canvas.clientWidth));
  const h = Math.max(2, Math.floor(canvas.clientHeight));
  if (canvas.width !== w || canvas.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
function onResize() {
  resizeRendererToCanvas(overheadRenderer, overheadCam, overheadCanvas);
  resizeRendererToCanvas(modelRenderer, modelCam, modelCanvas);

  const w = Math.max(2, Math.floor(modelCanvas.clientWidth));
  const h = Math.max(2, Math.floor(modelCanvas.clientHeight));
  composer.setSize(w, h);
}
window.addEventListener("resize", onResize);



/* ---------------- Panel collapse/expand ---------------- */
function collapseAllPanels() {
  const panels = document.querySelectorAll(".panel");
  panels.forEach((panel) => {
    const content = panel.querySelector(".panelContent") as HTMLElement;
    if (!content) return;

    panel.classList.add("collapsed");
    content.style.maxHeight = "0px";
  });
}

function initPanelCollapse() {
  const panels = document.querySelectorAll(".panel");

  panels.forEach((panel) => {
    const title = panel.querySelector(".panelTitle");
    const content = panel.querySelector(".panelContent");

    if (!title || !content) return;

    const htmlContent = content as HTMLElement;

    // Start all panels collapsed
    panel.classList.add("collapsed");
    htmlContent.style.maxHeight = "0px";

    title.addEventListener("click", () => {
      const isCollapsed = panel.classList.contains("collapsed");

      if (isCollapsed) {
        panel.classList.remove("collapsed");
        htmlContent.style.maxHeight = htmlContent.scrollHeight + "px";
      } else {
        panel.classList.add("collapsed");
        htmlContent.style.maxHeight = "0px";
      }
    });
  });

  const resizeObserver = new ResizeObserver(() => {
    panels.forEach((panel) => {
      if (panel.classList.contains("collapsed")) return;
      const content = panel.querySelector(".panelContent") as HTMLElement;
      if (content) {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });

  panels.forEach((panel) => {
    const content = panel.querySelector(".panelContent");
    if (content) resizeObserver.observe(content);
  });
}

/* ---------------- Touch controls for mobile ---------------- */
function initTouchControls() {
  let touchStartDistance = 0;
  let touchStartTarget = new THREE.Vector3();

  overheadCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistance = Math.sqrt(dx * dx + dy * dy);
      touchStartTarget.copy(overheadControls.target);
      e.preventDefault();
    }
  }, { passive: false });

  overheadCanvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = touchStartDistance / distance;

      const newDistance = overheadCam.position.distanceTo(touchStartTarget) * scale;
      const clampedDistance = THREE.MathUtils.clamp(newDistance, overheadControls.minDistance, overheadControls.maxDistance);

      const direction = new THREE.Vector3()
        .subVectors(overheadCam.position, touchStartTarget)
        .normalize();

      overheadCam.position.copy(touchStartTarget).add(direction.multiplyScalar(clampedDistance));
      e.preventDefault();
    }
  }, { passive: false });

  modelCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistance = Math.sqrt(dx * dx + dy * dy);
      touchStartTarget.copy(modelControls.target);
      e.preventDefault();
    }
  }, { passive: false });

  modelCanvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = touchStartDistance / distance;

      const newDistance = modelCam.position.distanceTo(touchStartTarget) * scale;
      const clampedDistance = THREE.MathUtils.clamp(newDistance, modelControls.minDistance, modelControls.maxDistance);

      const direction = new THREE.Vector3()
        .subVectors(modelCam.position, touchStartTarget)
        .normalize();

      modelCam.position.copy(touchStartTarget).add(direction.multiplyScalar(clampedDistance));
      e.preventDefault();
    }
  }, { passive: false });
}

/* ---------------- Init & animate ---------------- */

async function init() {
  try {
    const authManager = new AuthManager();
    const cloudStorage = new CloudStorage();
    const uiManager = new UIManager(authManager, cloudStorage);

    uiManager.onSaveScene(() => {
      uiManager.showSaveSceneDialog(async (name, description) => {
        try {
          const sceneData = captureSceneState();
          await cloudStorage.saveScene(name, sceneData, description);
          alert('Scene saved successfully!');
        } catch (err: any) {
          alert('Error saving scene: ' + err.message);
        }
      });
    });

    uiManager.onLoadScene(async (sceneId) => {
      try {
        const scene = await cloudStorage.loadScene(sceneId);
        restoreSceneState(scene.scene_data);
        alert('Scene loaded successfully!');
      } catch (err: any) {
        alert('Error loading scene: ' + err.message);
      }
    });

    uiManager.onSavePreset(() => {
      uiManager.showSavePresetDialog(async (name, description) => {
        try {
          const lightsConfig = rigs.map(snapshotRig);
          await cloudStorage.saveLightingPreset(name, lightsConfig, description);
          alert('Preset saved successfully!');
        } catch (err: any) {
          alert('Error saving preset: ' + err.message);
        }
      });
    });

    uiManager.onLoadPreset(async (presetId) => {
      try {
        const preset = await cloudStorage.loadLightingPreset(presetId);
        clearLights();
        for (const snap of preset.lights_config) {
          await recreateFromSnapshot(snap);
        }
        if (rigs.length > 0) {
          selectRig(rigs[0]);
        }
        rebuildLightModulesUI();
        alert('Preset loaded successfully!');
      } catch (err: any) {
        alert('Error loading preset: ' + err.message);
      }
    });

    uiManager.onAnimationSelected((preset, speed) => {
      if (currentSubjectModel) {
        const action = animationLibrary.applyAnimationToModel(
          'current_model',
          currentSubjectModel,
          preset,
          { speed, blendMode: 'normal', weight: 1.0 }
        );
        if (action) {
          console.log(`Applied animation: ${preset.name}`);
        } else {
          console.log(`Applied pose: ${preset.name}`);
        }
      } else {
        alert('Please load a model first');
      }
    });

    overheadRenderer.toneMappingExposure = 1.05;
    modelRenderer.toneMappingExposure = 1.05;
    onResize();

    createDefaultFloorAndWalls();
    await loadCameraIcon();

    rebuildLightModulesUI();
    syncUI();
    refreshUndoButton();
    initPanelCollapse();
    initTouchControls();

    animate();
  } catch (err: any) {
    console.error(err);
  }
}

function captureSceneState() {
  return {
    lights: rigs.map(snapshotRig),
    model: (currentSubjectModel?.userData as any)?.modelPath || './assets/Models/human_bust.glb',
    modelId: null,
    camera: {
      iso: parseFloat(isoEl.value),
      fstop: parseFloat(fstopEl.value),
      shutter: parseFloat(shutterEl.value),
      expComp: parseFloat(expCompEl.value),
    },
    cameraPosition: {
      position: {
        x: modelCam.position.x,
        y: modelCam.position.y,
        z: modelCam.position.z,
      },
      target: {
        x: modelControls.target.x,
        y: modelControls.target.y,
        z: modelControls.target.z,
      }
    }
  };
}

async function restoreSceneState(sceneData: any) {
  clearLights();

  if (sceneData.model) {
    await loadSubject(sceneData.model);
  }

  if (sceneData.lights && sceneData.lights.length > 0) {
    for (const snap of sceneData.lights) {
      await recreateFromSnapshot(snap);
    }
    if (rigs.length > 0) {
      selectRig(rigs[0]);
    }
  }

  if (sceneData.camera) {
    isoEl.value = String(sceneData.camera.iso);
    fstopEl.value = String(sceneData.camera.fstop);
    shutterEl.value = String(sceneData.camera.shutter);
    expCompEl.value = String(sceneData.camera.expComp);
    syncUI();
  }

  if (sceneData.cameraPosition) {
    if (sceneData.cameraPosition.position) {
      modelCam.position.set(
        sceneData.cameraPosition.position.x,
        sceneData.cameraPosition.position.y,
        sceneData.cameraPosition.position.z
      );
    }
    if (sceneData.cameraPosition.target) {
      modelControls.target.set(
        sceneData.cameraPosition.target.x,
        sceneData.cameraPosition.target.y,
        sceneData.cameraPosition.target.z
      );
    }
    modelControls.update();
  }

  rebuildLightModulesUI();
}

function updateCameraIconPosition() {
  if (cameraIconRoot) {
    cameraIconRoot.position.copy(modelCam.position);
    cameraIconRoot.lookAt(modelControls.target);
  }
}

function renderViewfinder() {
  if (viewfinderTexture && viewfinderScreen) {
    const originalRenderTarget = modelRenderer.getRenderTarget();

    viewfinderScreen.visible = false;

    modelRenderer.setRenderTarget(viewfinderTexture);
    modelRenderer.clear();
    composer.render();

    modelRenderer.setRenderTarget(originalRenderTarget);
    viewfinderScreen.visible = true;
  }
}

let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  overheadControls.update();
  modelControls.update();
  onResize();

  animationLibrary.updateAnimations(delta);

  updateCameraIconPosition();
  renderViewfinder();

  overheadRenderer.render(scene, overheadCam);
  composer.render();
}

init();
