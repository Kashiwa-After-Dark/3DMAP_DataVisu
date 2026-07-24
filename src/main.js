import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  BACKGROUND_COLOR,
  COORDINATE_SCALE,
  GRID_COLOR_LINES,
  ORIGIN,
} from "./config.js";

export function createMapDisplay(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND_COLOR);

  const perspectiveCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
  perspectiveCamera.position.set(170, 145, 220);

  const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5000);

  const controls = new OrbitControls(perspectiveCamera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.target.set(0, 0, 0);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xb7c4d6, 1.8);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 2);
  sunLight.position.set(160, 260, 120);
  scene.add(sunLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  function setDetailLighting(bright = false) {
    hemiLight.intensity = bright ? 3.2 : 1.8;
    sunLight.intensity = bright ? 3.6 : 2;
    ambientLight.intensity = bright ? 1.35 : 0.7;
  }

  const mapGroup = new THREE.Group();
  scene.add(mapGroup);
  let overviewModel = null;
  let detailModel = null;
  let detailModelPromise = null;

  const gpxGroup = new THREE.Group();
  scene.add(gpxGroup);

  const groundGrid = new THREE.GridHelper(1600, 80, GRID_COLOR_LINES, GRID_COLOR_LINES);
  groundGrid.position.y = -0.04;
  groundGrid.material.transparent = true;
  groundGrid.material.opacity = 0.72;
  groundGrid.material.depthWrite = false;
  scene.add(groundGrid);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const selectableMeshes = [];
  const bounds = new THREE.Box3();
  const modelCenter = new THREE.Vector3();
  const modelSize = new THREE.Vector3();

  function loadModel(onLoaded) {
    new GLTFLoader().load(
      new URL("../assets/models/Kashiwa_3Dmap.glb", import.meta.url).href,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = false;
          child.receiveShadow = true;
          selectableMeshes.push(child);
          keepOriginalMaterial(child);
        });

        mapGroup.add(model);
        overviewModel = model;
        onLoaded?.(model);
      },
      undefined,
      (error) => {
        console.error(error);
      },
    );
  }

  function loadDetailModel() {
    if (detailModel) return Promise.resolve(detailModel);
    if (detailModelPromise) return detailModelPromise;

    detailModelPromise = new Promise((resolve, reject) => {
      const finish = (model) => {
        model.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = false;
          child.receiveShadow = true;
          prepareDetailMaterials(child);
        });
        alignDetailModel(model);
        model.visible = false;
        mapGroup.add(model);
        detailModel = model;
        resolve(model);
      };
      const loadFbxFallback = () => {
        new FBXLoader().load(
          new URL("../assets/models/kashiwa_Blosm.fbx", import.meta.url).href,
          finish,
          undefined,
          reject,
        );
      };

      new GLTFLoader().load(
        new URL("../assets/models/kashiwa_Blosm.glb", import.meta.url).href,
        (gltf) => finish(gltf.scene),
        undefined,
        (error) => {
          console.warn("Blosm GLB could not be loaded; falling back to FBX.", error);
          loadFbxFallback();
        },
      );
    });
    return detailModelPromise;
  }

  function alignDetailModel(model) {
    if (!overviewModel) return;
    const overviewBounds = new THREE.Box3().setFromObject(overviewModel);
    const detailBounds = new THREE.Box3().setFromObject(model);
    const overviewSize = overviewBounds.getSize(new THREE.Vector3());
    const detailSize = detailBounds.getSize(new THREE.Vector3());
    const scaleX = overviewSize.x / Math.max(detailSize.x, 1);
    const scaleZ = overviewSize.z / Math.max(detailSize.z, 1);
    const verticalScale = (scaleX + scaleZ) * 0.5;
    model.scale.set(scaleX, verticalScale, scaleZ);
    model.updateWorldMatrix(true, true);

    const scaledBounds = new THREE.Box3().setFromObject(model);
    const overviewCenter = overviewBounds.getCenter(new THREE.Vector3());
    const detailCenter = scaledBounds.getCenter(new THREE.Vector3());
    model.position.x += overviewCenter.x - detailCenter.x;
    model.position.z += overviewCenter.z - detailCenter.z;
    model.updateWorldMatrix(true, true);

    const groundY = getModelYQuantile(model, 0.1);
    model.position.y += overviewBounds.min.y - groundY;
    model.updateWorldMatrix(true, true);
  }

  async function setModelMode(mode) {
    if (mode === "detail") {
      const model = await loadDetailModel();
      if (overviewModel) overviewModel.visible = false;
      model.visible = true;
      groundGrid.visible = false;
      return model;
    }
    setDetailLighting(false);
    if (overviewModel) overviewModel.visible = true;
    if (detailModel) detailModel.visible = false;
    groundGrid.visible = true;
    return overviewModel;
  }

  function getDetailSurfaceHeight(point) {
    if (!detailModel) return null;
    detailModel.updateWorldMatrix(true, true);
    const detailBounds = new THREE.Box3().setFromObject(detailModel);
    const surfaceRay = new THREE.Raycaster(
      new THREE.Vector3(point.x, detailBounds.max.y + 100, point.z),
      new THREE.Vector3(0, -1, 0),
      0,
      detailBounds.getSize(new THREE.Vector3()).y + 200,
    );
    const hit = surfaceRay.intersectObject(detailModel, true)[0];
    return hit?.point.y ?? null;
  }

  return {
    renderer,
    scene,
    perspectiveCamera,
    orthographicCamera,
    controls,
    mapGroup,
    gpxGroup,
    groundGrid,
    raycaster,
    pointer,
    groundPlane,
    selectableMeshes,
    bounds,
    modelCenter,
    modelSize,
    loadModel,
    loadDetailModel,
    setModelMode,
    setDetailLighting,
    getDetailSurfaceHeight,
    worldToGeo,
    geoToWorld,
  };
}

function worldToGeo(point) {
  const metersEast = point.x * COORDINATE_SCALE.east;
  const metersNorth = point.z * COORDINATE_SCALE.north;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLon = metersPerDegreeLat * Math.cos(THREE.MathUtils.degToRad(ORIGIN.lat));

  return {
    lat: ORIGIN.lat + metersNorth / metersPerDegreeLat,
    lon: ORIGIN.lon + metersEast / metersPerDegreeLon,
  };
}

function geoToWorld({ lat, lon }) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLon = metersPerDegreeLat * Math.cos(THREE.MathUtils.degToRad(ORIGIN.lat));

  return new THREE.Vector3(
    ((lon - ORIGIN.lon) * metersPerDegreeLon) / COORDINATE_SCALE.east,
    0,
    ((lat - ORIGIN.lat) * metersPerDegreeLat) / COORDINATE_SCALE.north,
  );
}

function keepOriginalMaterial(mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    if (!material) continue;
    material.side = THREE.DoubleSide;
    if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
    material.needsUpdate = true;
  }
}

function prepareDetailMaterials(mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  if (materials.some((material) => material?.map)) {
    keepOriginalMaterial(mesh);
    return;
  }

  const urbanPalette = [0x71808a, 0x817a72, 0x65766f, 0x697483, 0x858076, 0x60717b];
  mesh.material = materials.map((material, index) => new THREE.MeshStandardMaterial({
    name: material?.name || `Blosm surface ${index + 1}`,
    color: urbanPalette[index % urbanPalette.length],
    emissive: 0x071018,
    emissiveIntensity: 0.18,
    roughness: 0.9,
    metalness: 0.02,
    side: THREE.DoubleSide,
  }));
}

function getModelYQuantile(model, quantile) {
  const values = [];
  const point = new THREE.Vector3();
  model.traverse((child) => {
    if (!child.isMesh) return;
    const position = child.geometry?.attributes?.position;
    if (!position) return;
    const stride = Math.max(1, Math.floor(position.count / 40_000));
    for (let index = 0; index < position.count; index += stride) {
      point.fromBufferAttribute(position, index).applyMatrix4(child.matrixWorld);
      if (Number.isFinite(point.y)) values.push(point.y);
    }
  });
  if (!values.length) return new THREE.Box3().setFromObject(model).min.y;
  values.sort((a, b) => a - b);
  const index = Math.round(THREE.MathUtils.clamp(quantile, 0, 1) * (values.length - 1));
  return values[index];
}
