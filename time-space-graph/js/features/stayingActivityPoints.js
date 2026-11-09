import * as THREE from "three";

export function createStayingActivityPoints(capacity) {
  const geometry = new THREE.RingGeometry(0.64, 1, 24);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, capacity));
  mesh.name = "staying-activity-rings";
  mesh.count = 0;
  mesh.renderOrder = 46;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  return {
    mesh,
    update(points) {
      mesh.count = Math.min(points.length, capacity);
      for (let index = 0; index < mesh.count; index += 1) {
        const { memo, activity } = points[index];
        const radius = 2.8 + Math.min(2, Math.sqrt(Math.max(1, Number(memo.count) || 1)) * 0.45);
        dummy.position.set(memo.world.x, 1.4, memo.world.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.setScalar(radius);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        mesh.setColorAt(index, color.set(activity.color));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    },
  };
}
