/**
 * ファイル概要: TR-02の内側で床と建物を確認し、駅方向を表す模式的な直線を選ぶ。
 */
import * as THREE from "three";
import { roadSegmentCandidates } from "./roadPeopleModel.js";

export function createRoadPeoplePath(triangles, station, floors, obstacles) {
  if (!station) return null;
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  const candidates = triangles.flatMap((t) => roadSegmentCandidates(t.points, station).map((ends) => ({ ends, height: Math.max(...t.points.map((p) => p.y)) + 2 })));
  candidates.sort((a, b) => Math.hypot(b.ends[0].x - b.ends[1].x, b.ends[0].z - b.ends[1].z) - Math.hypot(a.ends[0].x - a.ends[1].x, a.ends[0].z - a.ends[1].z));
  for (const { ends: [near, far], height } of candidates) {
    const path = [];
    for (let i = 0; i < 64; i += 1) {
      const t = i / 63;
      const x = near.x + (far.x - near.x) * t;
      const z = near.z + (far.z - near.z) * t;
      if (obstacles.some((b) => x >= b.min.x - 0.03 && x <= b.max.x + 0.03 && z >= b.min.z - 0.03 && z <= b.max.z + 0.03)) break;
      ray.ray.origin.set(x, height, z);
      const hit = ray.intersectObjects(floors, false)[0];
      if (!hit) break;
      path.push(new THREE.Vector3(x, hit.point.y + 0.012, z));
    }
    if (path.length === 64) return path;
  }
  return null;
}
