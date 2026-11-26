/** ファイル概要: 参考画像で指定された抗議活動の模式表示位置をデッキ床に合わせる。 */
import * as THREE from "three";

const DISPLAY_POSITIONS = [
  [5.98, -0.59], // Bus stop 5 stair landing.
  [7.91, -0.45], // Under the covered walkway.
];

export function protestDisplayPaths(floorMeshes) {
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  return DISPLAY_POSITIONS.flatMap(([x, z]) => {
    ray.ray.origin.set(x, 2, z);
    const hit = ray.intersectObjects(floorMeshes, false)[0];
    if (!hit) return [];
    hit.point.y += 0.012;
    return [[hit.point]];
  });
}
