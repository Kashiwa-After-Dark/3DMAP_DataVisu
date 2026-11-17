/**
 * ファイル概要: ユーザー指定の範囲面から三角形を読み取り、床上にある模式動作の経路を作る。
 */
import * as THREE from "three";
import { triangleMotion } from "./peopleDemoModel.js";

export function readPeopleAreas(sources) {
  const areas = new Map();
  for (const { object, code } of sources) {
    if (!areas.has(code)) areas.set(code, []);
    object.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const position = mesh.geometry.getAttribute("position");
      const indices = mesh.geometry.index;
      for (let offset = 0; offset < (indices?.count || position.count); offset += 3) {
        const points = [0, 1, 2].map((i) => new THREE.Vector3().fromBufferAttribute(position, indices ? indices.getX(offset + i) : offset + i).applyMatrix4(mesh.matrixWorld));
        const area = Math.abs((points[1].x - points[0].x) * (points[2].z - points[0].z) - (points[1].z - points[0].z) * (points[2].x - points[0].x)) / 2;
        if (area > 1e-6) areas.get(code).push({ points, area });
      }
    });
  }
  for (const triangles of areas.values()) triangles.sort((a, b) => b.area - a.area);
  return areas;
}

export function createPeoplePath(triangle, floorMeshes, moving, obstacles = []) {
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  const anchors = [[1 / 3, 1 / 3], [0.7, 0.15], [0.15, 0.7], [0.15, 0.15], [0.45, 0.45], [0.45, 0.1], [0.1, 0.45], [0.8, 0.1], [0.1, 0.8], [0.1, 0.1]];
  for (const [index, anchor] of anchors.entries()) {
    const samples = Array.from({ length: 64 }, (_, i) => triangleMotion(triangle, i / 64 * Math.PI * 2, moving, anchor, index === 0 ? 0.18 : 0.04));
    if (samples.some((p) => obstacles.some((b) => p.x >= b.min.x - 0.03 && p.x <= b.max.x + 0.03 && p.z >= b.min.z - 0.03 && p.z <= b.max.z + 0.03))) continue;
    const points = [];
    for (const point of samples) {
      ray.ray.origin.set(point.x, Math.max(...triangle.map((p) => p.y)) + 2, point.z);
      const hit = ray.intersectObjects(floorMeshes, false)[0];
      if (!hit) break;
      points.push(new THREE.Vector3(point.x, hit.point.y + 0.012, point.z));
    }
    if (points.length === 64) return points;
  }
  return null;
}
