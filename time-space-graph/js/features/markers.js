import * as THREE from "three";
import { hexToRgbChannels } from "../formatters.js";

export function getMarkerSize(memo) {
  if (!memo.isPeople) return 8;
  const count = memo.count || 1;
  if (count <= 3) return 14;
  if (count <= 5) return 18;
  if (count <= 10) return 23;
  return 29;
}

export function makeGraffitiStamp(memo, initialVisual) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  let visual = initialVisual;
  let isSolid = false;
  const drawStamp = (isSolid) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rgb = hexToRgbChannels(visual.color);
    ctx.fillStyle = isSolid ? visual.color : `rgba(${rgb}, 0.48)`;
    ctx.strokeStyle = isSolid ? "#ffffff" : visual.color;
    ctx.lineWidth = isSolid ? 5 : 4;
    ctx.lineJoin = "round";
    drawGroupShape(ctx, visual.shape || memo.groupCategory || "UN");
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(128, 128);
    ctx.scale(0.78, 0.78);
    ctx.translate(-128, -128);
    ctx.strokeStyle = isSolid ? "#07131f" : "rgba(255, 255, 255, 0.86)";
    ctx.lineWidth = isSolid ? 4 : 3.2;
    drawGenderMark(ctx, memo.gender);
    ctx.stroke();
    ctx.restore();
  };
  drawStamp(false);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
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
    drawStamp(isSolid);
    texture.needsUpdate = true;
  };
  sprite.userData.setVisual = (nextVisual) => {
    if (!nextVisual || (visual.color === nextVisual.color && visual.shape === nextVisual.shape)) return;
    visual = nextVisual;
    drawStamp(isSolid);
    texture.needsUpdate = true;
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

function drawGroupShape(ctx, group) {
  if (group === "B") {
    ctx.beginPath();
    ctx.arc(128, 128, 72, 0, Math.PI * 2);
    return;
  }

  if (group === "CP") {
    ctx.beginPath();
    ctx.moveTo(128, 210);
    ctx.bezierCurveTo(104, 176, 48, 145, 48, 92);
    ctx.bezierCurveTo(48, 43, 108, 31, 128, 76);
    ctx.bezierCurveTo(148, 31, 208, 43, 208, 92);
    ctx.bezierCurveTo(208, 145, 152, 176, 128, 210);
    ctx.closePath();
    return;
  }

  if (group === "BG") {
    ctx.beginPath();
    ctx.moveTo(128, 42);
    ctx.lineTo(214, 128);
    ctx.lineTo(128, 214);
    ctx.lineTo(42, 128);
    ctx.closePath();
    return;
  }

  if (group === "FM") {
    ctx.beginPath();
    ctx.moveTo(128, 36);
    ctx.lineTo(218, 112);
    ctx.lineTo(196, 112);
    ctx.lineTo(196, 210);
    ctx.lineTo(60, 210);
    ctx.lineTo(60, 112);
    ctx.lineTo(38, 112);
    ctx.closePath();
    return;
  }

  if (group === "G" || group === "XG") {
    const sides = group === "G" ? 6 : 5;
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

  if (group === "UN") {
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

function drawGenderMark(ctx, gender) {
  ctx.beginPath();
  if (gender === "M") {
    ctx.moveTo(78, 128);
    ctx.lineTo(178, 128);
    return;
  }
  if (gender === "F") {
    ctx.moveTo(128, 78);
    ctx.lineTo(128, 178);
    return;
  }
  if (gender === "X") {
    ctx.moveTo(88, 88);
    ctx.lineTo(168, 168);
    ctx.moveTo(168, 88);
    ctx.lineTo(88, 168);
    return;
  }
  ctx.arc(128, 128, 15, 0, Math.PI * 2);
}
