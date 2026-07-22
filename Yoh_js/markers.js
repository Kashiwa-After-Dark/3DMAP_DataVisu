import * as THREE from "three";
import { hexToRgbChannels, makeSeededRandom, roundedRect } from "../src/formatters.js";

export function getMarkerSize(memo) {
  if (!memo.isPeople) return 9;
  const count = memo.count || 1;
  return THREE.MathUtils.clamp(12 + count * 3.6, 16, 54);
}

export function makeGraffitiStamp(memo, category) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const rgb = hexToRgbChannels(category.color);
  const random = makeSeededRandom(`${memo.name}-${memo.time}`);

  ctx.save();
  ctx.shadowColor = category.color;
  ctx.shadowBlur = 28;
  ctx.fillStyle = `rgba(${rgb}, 0.22)`;
  ctx.strokeStyle = category.color;
  ctx.lineWidth = 13;
  ctx.lineJoin = "round";
  drawGenderShape(ctx, memo.gender);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = `rgba(${rgb}, 0.62)`;
  const count = memo.count || 1;
  const particleCount = memo.isPeople ? Math.min(34, 10 + count * 2) : 12;
  for (let index = 0; index < particleCount; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = 68 + random() * 48;
    const radius = 1.8 + random() * Math.min(9, 3 + count);
    ctx.beginPath();
    ctx.arc(128 + Math.cos(angle) * distance, 128 + Math.sin(angle) * distance, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.4,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  const size = getMarkerSize(memo);
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 32;
  return sprite;
}

export function makeAxisLabel(text, isTitle = false) {
  const canvas = document.createElement("canvas");
  canvas.width = isTitle ? 300 : 150;
  canvas.height = 54;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(2, 6, 17, 0.72)";
  roundedRect(ctx, 1, 1, canvas.width - 2, canvas.height - 2, 10);
  ctx.fill();
  ctx.fillStyle = isTitle ? "#bfdbfe" : "#94a3b8";
  ctx.font = `${isTitle ? 700 : 600} ${isTitle ? 22 : 24}px Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: isTitle ? 0.86 : 0.72,
    depthTest: false,
  }));
  sprite.scale.set(canvas.width * 0.14, canvas.height * 0.14, 1);
  sprite.renderOrder = 14;
  return sprite;
}

function drawGenderShape(ctx, gender) {
  if (gender === "F") {
    ctx.beginPath();
    ctx.arc(128, 128, 72, 0, Math.PI * 2);
    return;
  }

  if (gender === "X") {
    ctx.beginPath();
    ctx.moveTo(128, 42);
    ctx.lineTo(214, 128);
    ctx.lineTo(128, 214);
    ctx.lineTo(42, 128);
    ctx.closePath();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(54, 48);
  ctx.lineTo(202, 48);
  ctx.lineTo(214, 62);
  ctx.lineTo(214, 194);
  ctx.lineTo(202, 208);
  ctx.lineTo(54, 208);
  ctx.lineTo(42, 194);
  ctx.lineTo(42, 62);
  ctx.closePath();
}
