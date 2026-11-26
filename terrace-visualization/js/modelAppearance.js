/**
 * ファイル概要: 原本を変更せず、ゲーム風の設備材質と半透明建築の輪郭を表示用に作る。
 */
import * as THREE from "three";
import { CONTEXT_STYLE, CONSTRUCTION_STYLE, WALKWAY_ROOF_OPACITY, appearanceRole } from "./appearanceSettings.js?v=20261123-monitor2";
import { GAME_STYLE } from "./gameAppearance.js";

function softenModelColors(material) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <colorspace_fragment>", `
      float terraceLuma = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
      gl_FragColor.rgb = mix(vec3(terraceLuma), gl_FragColor.rgb, 0.30);
      #include <colorspace_fragment>
    `);
  };
  return material;
}

export function createModelAppearance(model) {
  const meshes = [];
  model.traverse((object) => { if (object.isMesh) meshes.push(object); });
  const materialCache = new Map();
  const faceMaterial = softenModelColors(new THREE.MeshBasicMaterial({ color: CONTEXT_STYLE.faceColor, transparent: true, opacity: CONTEXT_STYLE.faceOpacity, side: THREE.FrontSide, depthWrite: false }));
  const edgeMaterial = softenModelColors(new THREE.LineBasicMaterial({ color: CONTEXT_STYLE.edgeColor, transparent: true, opacity: CONTEXT_STYLE.edgeOpacity, depthWrite: false }));
  const edgeCache = new Map();
  for (const mesh of meshes) {
    const names = [];
    for (let object = mesh; object && object !== model; object = object.parent) names.push(object.name);
    const role = appearanceRole(names);
    if (role === "region" || role === "station-monitor") continue;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const roles = materials.map((material) => appearanceRole(names, material.name));
    const convert = (material, index) => {
      const role = roles[index];
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
        if (role === "walkway-roof") {
          copy.transparent = true;
          copy.opacity = WALKWAY_ROOF_OPACITY;
          copy.depthWrite = false;
        }
        materialCache.set(key, softenModelColors(copy));
      }
      return materialCache.get(key);
    };
    mesh.material = Array.isArray(mesh.material) ? materials.map(convert) : convert(materials[0], 0);
    mesh.castShadow = roles.includes("detail");
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
