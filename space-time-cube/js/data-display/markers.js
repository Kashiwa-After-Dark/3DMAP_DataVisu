/**
 * ファイル概要: 観察点、時間軸ラベル、補助表示をThree.js上へ作成する。
 */
import * as THREE from "three";
import { hexToRgbChannels } from "../shared/formatters.js";

const stampTextures = new Map();

function getStampTexture(visual, isSolid) {
  const key = `${visual.color}:${visual.shape || "U"}:${isSolid}`;
  if (stampTextures.has(key)) return stampTextures.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.scale(0.5, 0.5);
  const rgb = hexToRgbChannels(visual.color);
  ctx.fillStyle = isSolid ? visual.color : `rgba(${rgb}, 0.48)`;
  ctx.strokeStyle = isSolid ? "#ffffff" : visual.color;
  ctx.lineWidth = isSolid ? 5 : 4;
  ctx.lineJoin = "round";
  drawDataShape(ctx, visual.shape || "U");
  ctx.fill();
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  stampTextures.set(key, texture);
  return texture;
}

export function getMarkerSize(memo) {
  if (!memo.isPeople) return 8;
  const count = memo.count || 1;
  if (count <= 3) return 14;
  if (count <= 5) return 18;
  if (count <= 10) return 23;
  return 29;
}

export function makeGraffitiStamp(memo, initialVisual) {
  let visual = initialVisual;
  let isSolid = false;
  const material = new THREE.SpriteMaterial({
    map: getStampTexture(visual, isSolid),
    transparent: true,
    opacity: 0.82,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  const size = getMarkerSize(memo);
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 32;
  sprite.userData.setSolid = (nextSolid) => {
    if (nextSolid === isSolid) return;
    isSolid = nextSolid;
    material.map = getStampTexture(visual, isSolid);
  };
  sprite.userData.setVisual = (nextVisual) => {
    if (!nextVisual || (visual.color === nextVisual.color && visual.shape === nextVisual.shape)) return;
    visual = nextVisual;
    material.map = getStampTexture(visual, isSolid);
  };
  return sprite;
}

export function makeAxisLabel(text, isTitle = false) {
  const canvas = document.createElement("canvas");
  canvas.width = isTitle ? 300 : 150;
  canvas.height = 54;
  const ctx = canvas.getContext("2d");
  const draw = (highlighted = false) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = highlighted ? "#ffffff" : isTitle ? "#bfdbfe" : "#94a3b8";
    ctx.shadowColor = highlighted ? "rgba(0, 167, 255, 0.9)" : "rgba(2, 6, 17, 0.9)";
    ctx.shadowBlur = highlighted ? 8 : 3;
    ctx.font = `${isTitle || highlighted ? 800 : 700} ${isTitle ? 22 : highlighted ? 27 : 25}px Ubuntu, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
    ctx.shadowBlur = 0;
  };
  draw();

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
  let isHighlighted = false;
  sprite.userData.setEmphasized = (highlighted) => {
    if (isTitle || highlighted === isHighlighted) return;
    isHighlighted = highlighted;
    draw(highlighted);
    texture.needsUpdate = true;
    sprite.material.opacity = highlighted ? 1 : 0.72;
  };
  return sprite;
}

export function makeCoordinateLabel(memo) {
  const canvas = document.createElement("canvas");
  canvas.width = 330;
  canvas.height = 44;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(148, 163, 184, 0.72)";
  ctx.font = "500 17px Ubuntu, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${memo.lat.toFixed(6)}, ${memo.lon.toFixed(6)}`,
    canvas.width / 2,
    canvas.height / 2,
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  }));
  sprite.scale.set(canvas.width * 0.09, canvas.height * 0.09, 1);
  sprite.renderOrder = 36;
  sprite.visible = false;
  return sprite;
}

function drawDataShape(ctx, shape) {
  if (shape === "F") {
    ctx.beginPath();
    ctx.arc(128, 128, 72, 0, Math.PI * 2);
    return;
  }

  if (shape === "CP") {
    ctx.beginPath();
    ctx.moveTo(128, 210);
    ctx.bezierCurveTo(104, 176, 48, 145, 48, 92);
    ctx.bezierCurveTo(48, 43, 108, 31, 128, 76);
    ctx.bezierCurveTo(148, 31, 208, 43, 208, 92);
    ctx.bezierCurveTo(208, 145, 152, 176, 128, 210);
    ctx.closePath();
    return;
  }

  if (shape === "X") {
    ctx.beginPath();
    ctx.moveTo(128, 42);
    ctx.lineTo(214, 128);
    ctx.lineTo(128, 214);
    ctx.lineTo(42, 128);
    ctx.closePath();
    return;
  }

  if (shape === "OBJ") {
    const sides = 8;
    ctx.beginPath();
    for (let index = 0; index < sides; index += 1) {
      const angle = -Math.PI / 2 + (index / sides) * Math.PI * 2;
      const x = 128 + Math.cos(angle) * 88;
      const y = 128 + Math.sin(angle) * 88;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    return;
  }

  if (shape === "U") {
    ctx.beginPath();
    ctx.moveTo(128, 34);
    ctx.lineTo(222, 210);
    ctx.lineTo(34, 210);
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
