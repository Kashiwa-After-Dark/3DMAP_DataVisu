/** ファイル概要: ベンチ付近の見通しがよいデッキ床に人型を配置する。 */
import * as THREE from "three";

// Offsets are relative to the seat, toward the clear side of each opening.
const BENCH_DISPLAY_OFFSETS = [
  ["Benches_Central_Opening_Station_Side", [[-1.12, 0.24], [-1.2, 0.16]]],
  ["Benches_Hexagonal_Opening", [[-0.46, -0.24], [-0.55, -0.3]]],
  ["Benches_Area_A", [[0.92, -0.89], [0.75, -0.88]]],
];

export function findBenchSeats(scene, seatObstacles, floorMeshes, displayObstacles) {
  const ray = new THREE.Raycaster();
  ray.ray.direction.set(0, -1, 0);
  return BENCH_DISPLAY_OFFSETS.flatMap(([name, offsets]) => {
    const timber = [];
    scene.getObjectByName(name)?.traverse((mesh) => {
      if (mesh.isMesh && /木製座板|timber/i.test(mesh.material?.name || "")) timber.push(mesh);
    });
    const bounds = new THREE.Box3();
    for (const mesh of timber) bounds.expandByObject(mesh);
    if (bounds.isEmpty()) return [];
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    let best = null;
    let bestDistance = Infinity;
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        const distance = (x * size.x) ** 2 + (z * size.z) ** 2;
        if (distance >= bestDistance) continue;
        ray.ray.origin.set(center.x + x * size.x / 8, bounds.max.y + 0.5, center.z + z * size.z / 8);
        const hit = ray.intersectObjects(timber, false)[0];
        if (!hit) continue;
        if (seatObstacles.some((box) => box.containsPoint(hit.point))) continue;
        bestDistance = distance;
        best = hit.point;
      }
    }
    if (!best) return [];
    const floorAt = (x, z) => {
      ray.ray.origin.set(x, bounds.max.y + 0.5, z);
      return ray.intersectObjects(floorMeshes, false)[0]?.point;
    };
    for (const [dx, dz] of offsets) {
      const x = best.x + dx;
      const z = best.z + dz;
      const margin = 0.14;
      if (displayObstacles.some(({ min, max }) => x >= min.x - margin && x <= max.x + margin
        && z >= min.z - margin && z <= max.z + margin)) continue;
      const floor = floorAt(x, z);
      if (!floor) continue;
      const supported = [[margin, 0], [-margin, 0], [0, margin], [0, -margin]].every(([a, b]) => {
        const edge = floorAt(x + a, z + b);
        return edge && Math.abs(edge.y - floor.y) <= 0.035;
      });
      if (supported) return [floor.add(new THREE.Vector3(0, 0.012, 0))];
    }
    return [];
  });
}
