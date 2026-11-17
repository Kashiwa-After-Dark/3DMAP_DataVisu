/**
 * ファイル概要: 提供イラストの連番・静止画と予備の人影を、カメラ追従の平面として描く。
 */
import * as THREE from "three";
import { PEOPLE_ILLUSTRATIONS } from "./peopleIllustrations.js";

function silhouetteTexture(motion, frame) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const sway = [0, -5, 5][frame];
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  function line(points, width) {
    ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
  }
  const lean = motion === "skate" ? -10 : sway * 0.3;
  ctx.beginPath();
  ctx.ellipse(64 + lean, 30, 15, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  line([[64 + lean, 62], [64, 128]], 32);
  const step = motion === "walk" ? sway * 3 : motion === "skate" ? 12 : 3;
  line([[55, 132], [49 - step, 179], [43 - step, 229]], 14);
  line([[73, 132], [79 + step, 179], [85 + step, 229]], 14);
  if (motion === "skate") {
    line([[49, 71], [28, 98 + sway], [9, 111 + sway]], 11);
    line([[78, 71], [99, 88 - sway], [118, 78 - sway]], 11);
    line([[15, 239], [113, 239]], 8);
    for (const x of [30, 98]) { ctx.beginPath(); ctx.arc(x, 249, 6, 0, Math.PI * 2); ctx.fill(); }
  } else if (motion === "phone") {
    line([[48, 72], [37, 111], [64, 99]], 11);
    line([[80, 72], [92, 105], [73, 85]], 11);
    ctx.fillRect(65, 68, 12, 25);
  } else {
    line([[48, 72], [32, 112 + sway], [motion === "chat" ? 17 : 28, motion === "chat" ? 100 + sway : 150]], 11);
    line([[80, 72], [95, 111 - sway], [99, 150 - sway]], 11);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createFigureFactory(onTextureReady = () => {}) {
  const materials = new Map();
  const loader = new THREE.TextureLoader();
  const loadingMaterial = new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false });
  function imageFrames(asset) {
    return asset.frames.map((path) => {
      let mirrored;
      let ready = false;
      const texture = loader.load(new URL(path, import.meta.url).href, () => {
        if (mirrored) mirrored.needsUpdate = true;
        ready = true;
        onTextureReady();
      }, undefined, (error) => console.warn("人物イラストを読み込めませんでした", path, error));
      texture.colorSpace = THREE.SRGBColorSpace;
      mirrored = texture.clone();
      mirrored.repeat.x = -1;
      mirrored.offset.x = 1;
      const make = (map) => new THREE.SpriteMaterial({ map, color: 0xffffff, transparent: true, alphaTest: 0.12, depthWrite: false, toneMapped: false });
      return { normal: make(texture), mirrored: make(mirrored), get ready() { return ready; } };
    });
  }
  function create(color, height, motion, illustration = null) {
    // Flat sprites follow the active camera without changing their ground positions.
    const asset = PEOPLE_ILLUSTRATIONS[illustration];
    const key = asset ? illustration : `fallback:${motion}`;
    if (!materials.has(key)) materials.set(key, asset ? imageFrames(asset) : [0, 1, 2].map((frame) => {
      const material = new THREE.SpriteMaterial({ map: silhouetteTexture(motion, frame), color: 0x152027, transparent: true, alphaTest: 0.25, depthWrite: false, toneMapped: false });
      return { normal: material, mirrored: material, ready: true };
    }));
    const frames = materials.get(key);
    const root = new THREE.Group();
    const sprite = new THREE.Sprite(frames[0].ready ? frames[0].normal : loadingMaterial);
    sprite.center.set(0.5, 0);
    sprite.scale.set(height * (asset?.aspect || 0.5), height, 1);
    root.add(sprite);
    return { root, animated: frames.length > 1, update(time, facingLeft = false) {
      const frame = Math.floor(time * (asset?.fps ?? (motion === "walk" ? 6 : 3))) % frames.length;
      sprite.material = !frames[frame].ready ? loadingMaterial : facingLeft ? frames[frame].mirrored : frames[frame].normal;
    } };
  }
  return { create };
}
