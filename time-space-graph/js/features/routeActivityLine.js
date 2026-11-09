import * as THREE from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

export function createRouteActivityLine(cells, width) {
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(cells.flatMap(({ a, b }) => [a.x, 0, a.z, b.x, 0, b.z]));
  geometry.setColors(cells.flatMap(() => [1, 1, 1, 1, 1, 1]));
  geometry.setAttribute("instanceOpacity", new THREE.InstancedBufferAttribute(new Float32Array(cells.length).fill(0.06), 1));
  const distances = [];
  let along = 0;
  for (const cell of cells) {
    distances.push(along);
    along += Math.hypot(cell.b.x - cell.a.x, cell.b.z - cell.a.z);
    distances.push(along);
  }
  geometry.setAttribute("instanceRouteStart", new THREE.InstancedBufferAttribute(new Float32Array(distances.filter((_, i) => i % 2 === 0)), 1));
  geometry.setAttribute("instanceRouteEnd", new THREE.InstancedBufferAttribute(new Float32Array(distances.filter((_, i) => i % 2 === 1)), 1));
  geometry.setAttribute("instanceRouteDashed", new THREE.InstancedBufferAttribute(new Float32Array(cells.length), 1));
  const material = new LineMaterial({
    color: 0xffffff, vertexColors: true, linewidth: width, transparent: true, opacity: 1,
    depthTest: false, depthWrite: false, stencilWrite: true, stencilRef: 1,
    stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
  });
  // Per-segment opacity encodes density; stencil prevents overlap from adding opacity.
  material.vertexShader = `attribute float instanceOpacity; attribute float instanceRouteStart; attribute float instanceRouteEnd; attribute float instanceRouteDashed; varying float vRouteOpacity; varying float vRouteDistance; varying float vRouteDashed;\n${material.vertexShader}`
    .replace("void main() {", "void main() { vRouteOpacity = instanceOpacity; vRouteDashed = instanceRouteDashed; vRouteDistance = position.y < 0.5 ? instanceRouteStart : instanceRouteEnd;")
    .replace("offset *= linewidth;", "offset *= linewidth * (instanceRouteDashed > 0.5 ? 0.5 : 1.0);");
  material.fragmentShader = `varying float vRouteOpacity; varying float vRouteDistance; varying float vRouteDashed;\n${material.fragmentShader}`
    .replace("float alpha = opacity;", "if (vRouteOpacity < 0.001) discard; if (vRouteDashed > 0.5) { float dotAlong = (mod(vRouteDistance, 2.4) - 0.6) / 0.6; if (dotAlong * dotAlong + vUv.x * vUv.x > 1.0) discard; } float alpha = opacity * vRouteOpacity;");
  const line = new LineSegments2(geometry, material);
  line.renderOrder = 39;
  const color = new THREE.Color();
  return {
    line,
    update(bins) {
      const start = geometry.getAttribute("instanceColorStart");
      const end = geometry.getAttribute("instanceColorEnd");
      const opacity = geometry.getAttribute("instanceOpacity");
      const dashed = geometry.getAttribute("instanceRouteDashed");
      bins.forEach((bin, index) => {
        color.set(bin.startColor || bin.color);
        start.setXYZ(index, color.r, color.g, color.b);
        color.set(bin.endColor || bin.color);
        end.setXYZ(index, color.r, color.g, color.b);
        opacity.setX(index, bin.opacity);
        dashed.setX(index, bin.dashed ? 1 : 0);
      });
      start.needsUpdate = true;
      end.needsUpdate = true;
      opacity.needsUpdate = true;
      dashed.needsUpdate = true;
    },
  };
}
