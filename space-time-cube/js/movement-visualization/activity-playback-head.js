/**
 * ファイル概要: 現在の再生位置を示す先頭マーカーを描画する。
 */
import * as THREE from "three";
import { getActivityPlaybackPositions } from "./activity-playback-position.js?v=20261029-01";

export function createActivityPlaybackHead({ parent, tracks, project, model, sampleRoute }) {
  const group = new THREE.Group();
  group.name = "activity-playback-heads";
  parent.add(group);
  const borderGeometry = new THREE.BoxGeometry(3.4, 1.5, 11.4);
  const capGeometry = new THREE.BoxGeometry(2.2, 1.2, 9.6);
  const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x071119, depthTest: false, depthWrite: false });
  const capMaterial = new THREE.MeshBasicMaterial({ color: 0xff2879, depthTest: false, depthWrite: false });
  const heads = tracks.map(() => {
    const head = new THREE.Group();
    head.visible = false;
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.renderOrder = 47;
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.renderOrder = 48;
    cap.position.y = 0.3;
    head.add(border, cap);
    group.add(head);
    return { head };
  });
  return {
    update({ currentTime, rangeStart, period, height, visible, isTrackVisible }) {
      group.visible = visible;
      for (const { head } of heads) head.visible = false;
      if (!visible || !period) return 0;
      const positions = getActivityPlaybackPositions({ tracks, currentTime, rangeStart, project, segments: model.segments, isTrackVisible });
      for (const point of positions) {
        const { head } = heads[point.trackIndex];
        head.visible = true;
        head.position.set(point.x, height + 1.1, point.z);
        const { tangent } = sampleRoute(point, 0);
        head.rotation.y = -Math.atan2(tangent.z, tangent.x);
      }
      return positions.length;
    },
  };
}
