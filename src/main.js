import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
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

  const mapGroup = new THREE.Group();
  scene.add(mapGroup);

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
      "../3Dmap/Kashiwa_3Dmap.glb",
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
        onLoaded?.(model);
      },
      undefined,
      (error) => {
        console.error(error);
      },
    );
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
    material.needsUpdate = true;
  }
}
