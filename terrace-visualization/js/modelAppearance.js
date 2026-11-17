/**
 * ファイル概要: 原本を変更せず、ゲーム風の設備材質と半透明建築の輪郭を表示用に作る。
 */
import * as THREE from "three";
import { CONTEXT_STYLE, CONSTRUCTION_STYLE, appearanceRole } from "./appearanceSettings.js?v=20261113-gameonly1";
import { GAME_STYLE } from "./gameAppearance.js";

export function createModelAppearance(model) {
  const meshes = [];
  model.traverse((object) => { if (object.isMesh) meshes.push(object); });
  const materialCache = new Map();
  const faceMaterial = new THREE.MeshBasicMaterial({ color: CONTEXT_STYLE.faceColor, transparent: true, opacity: CONTEXT_STYLE.faceOpacity, side: THREE.FrontSide, depthWrite: false });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: CONTEXT_STYLE.edgeColor, transparent: true, opacity: CONTEXT_STYLE.edgeOpacity, depthWrite: false });
  const edgeCache = new Map();
  for (const mesh of meshes) {
    const names = [];
    for (let object = mesh; object && object !== model; object = object.parent) names.push(object.name);
    const role = appearanceRole(names);
    if (role === "region") continue;
    const convert = (material) => {
      if (role === "context") return faceMaterial;
      const key = `${material.uuid}:${role}`;
      if (!materialCache.has(key)) {
        const copy = material.clone();
        if ("roughness" in copy) copy.roughness = Math.max(GAME_STYLE.roughness, copy.roughness);
        if ("metalness" in copy) copy.metalness = Math.min(GAME_STYLE.maxMetalness, copy.metalness);
        if (role === "construction") {
          copy.color.set(CONSTRUCTION_STYLE.faceColor);
          copy.transparent = true;
          copy.opacity = 0.5;
          copy.depthWrite = false;
        }
        materialCache.set(key, copy);
      }
      return materialCache.get(key);
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material);
    mesh.castShadow = role === "detail";
    mesh.receiveShadow = ["floor", "detail", "context"].includes(role);
    if (role === "context") {
      if (!edgeCache.has(mesh.geometry)) edgeCache.set(mesh.geometry, new THREE.EdgesGeometry(mesh.geometry, CONTEXT_STYLE.edgeAngle));
      const edges = new THREE.LineSegments(edgeCache.get(mesh.geometry), edgeMaterial);
      edges.name = "terrace-architectural-edges";
      edges.renderOrder = 2;
      mesh.add(edges);
    }
  }
}
