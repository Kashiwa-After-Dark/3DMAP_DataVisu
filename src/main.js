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

const materialTimeTintState = new WeakMap();

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

  let currentLightingPeriod = "default";
  const lightingProfiles = {
    default: { hemisphere: 1.8, sun: 2, ambient: 0.7, tint: 1, grade: [1, 1, 1] },
    twilight: { hemisphere: 3.2, sun: 3.6, ambient: 1.35, tint: 1, grade: [1, 1, 1] },
    night: { hemisphere: 1.35, sun: 1.5, ambient: 0.48, tint: 0.78, grade: [1, 1, 1] },
    late: { hemisphere: 0.72, sun: 0.82, ambient: 0.22, tint: 0.48, grade: [0.55, 0.78, 1.35] },
  };

  function setDetailLighting(period = "default") {
    const normalizedPeriod = period === true
      ? "twilight"
      : period === false
        ? "default"
        : period;
    const profile = lightingProfiles[normalizedPeriod] ?? lightingProfiles.default;
    currentLightingPeriod = normalizedPeriod;
    const detailIsActive = detailModel?.visible && overviewModel?.visible === false;
    applyLightProfile(detailIsActive ? normalizedPeriod : "default");
    applyModelTimeTint(detailModel, profile.tint, profile.grade);
  }

  function applyLightProfile(period) {
    const profile = lightingProfiles[period] ?? lightingProfiles.default;
    hemiLight.intensity = profile.hemisphere;
    sunLight.intensity = profile.sun;
    ambientLight.intensity = profile.ambient;
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
          prepareOverviewMaterials(child);
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
        model.visible = false;
        mapGroup.add(model);
        detailModel = model;
        setDetailLighting(currentLightingPeriod);
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

  async function setModelMode(mode) {
    if (mode === "detail") {
      const model = await loadDetailModel();
      if (overviewModel) overviewModel.visible = false;
      model.visible = true;
      groundGrid.visible = false;
      applyLightProfile(currentLightingPeriod);
      return model;
    }
    applyLightProfile("default");
    if (overviewModel) overviewModel.visible = true;
    if (detailModel) detailModel.visible = false;
    groundGrid.visible = true;
    return overviewModel;
  }

  function renderDetailLayer(layerRenderer, camera, renderTarget = null) {
    if (!detailModel) return false;
    const overviewVisible = overviewModel?.visible;
    const detailVisible = detailModel.visible;
    const gridVisible = groundGrid.visible;
    const tracksVisible = gpxGroup.visible;
    const background = scene.background;
    const lightLevels = {
      hemisphere: hemiLight.intensity,
      sun: sunLight.intensity,
      ambient: ambientLight.intensity,
    };

    if (overviewModel) overviewModel.visible = false;
    detailModel.visible = true;
    groundGrid.visible = false;
    gpxGroup.visible = false;
    scene.background = null;
    applyLightProfile(currentLightingPeriod);
    layerRenderer.setRenderTarget(renderTarget);
    layerRenderer.render(scene, camera);
    layerRenderer.setRenderTarget(null);

    if (overviewModel) overviewModel.visible = overviewVisible;
    detailModel.visible = detailVisible;
    groundGrid.visible = gridVisible;
    gpxGroup.visible = tracksVisible;
    scene.background = background;
    hemiLight.intensity = lightLevels.hemisphere;
    sunLight.intensity = lightLevels.sun;
    ambientLight.intensity = lightLevels.ambient;
    return true;
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
    renderDetailLayer,
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

function applyModelTimeTint(model, tint, grade = [1, 1, 1]) {
  if (!model) return;
  model.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!material) continue;
      let base = materialTimeTintState.get(material);
      if (!base) {
        base = {
          color: material.color?.clone() ?? null,
          emissive: material.emissive?.clone() ?? null,
          emissiveIntensity: material.emissiveIntensity,
        };
        materialTimeTintState.set(material, base);
      }
      if (base.color && material.color) {
        material.color.copy(base.color).multiplyScalar(tint);
        material.color.r *= grade[0];
        material.color.g *= grade[1];
        material.color.b *= grade[2];
      }
      if (base.emissive && material.emissive) {
        material.emissive.copy(base.emissive).multiplyScalar(tint);
        material.emissive.r *= grade[0];
        material.emissive.g *= grade[1];
        material.emissive.b *= grade[2];
      }
      if (Number.isFinite(base.emissiveIntensity)) {
        material.emissiveIntensity = base.emissiveIntensity * tint;
      }
    }
  });
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

function prepareOverviewMaterials(mesh) {
  const hasMaterialArray = Array.isArray(mesh.material);
  const materials = hasMaterialArray ? mesh.material : [mesh.material];
  const preparedMaterials = materials.map((material, index) => {
    const color = material?.color;
    const emissive = material?.emissive;
    const isBlue = (
      color?.b > Math.max(color.r, color.g) * 1.4 && color.b > 0.08
    ) || (
      emissive?.b > Math.max(emissive.r, emissive.g) * 1.4 && emissive.b > 0.08
    );

    if (isBlue) {
      return new THREE.MeshStandardMaterial({
        name: material?.name || `Overview blue ${index + 1}`,
        color: 0x003b9e,
        emissive: 0x0074e8,
        emissiveIntensity: 0.48,
        roughness: 0.72,
        metalness: 0,
        side: THREE.DoubleSide,
      });
    }

    return new THREE.MeshBasicMaterial({
      name: material?.name || `Overview black ${index + 1}`,
      color: 0x000000,
      side: THREE.DoubleSide,
    });
  });

  mesh.material = hasMaterialArray ? preparedMaterials : preparedMaterials[0];
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
