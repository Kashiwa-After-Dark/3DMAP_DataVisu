/** Frames a selected deck area with a small zoom and a clearer overhead angle. */
export function observationFocusView(anchor, homeDistance, homeTheta) {
  const distance = homeDistance * 0.76;
  const theta = homeTheta;
  const phi = Math.PI * 0.205;
  return {
    target: { x: anchor.x - distance * 0.028, y: anchor.y, z: anchor.z },
    offset: {
      x: distance * Math.sin(phi) * Math.sin(theta),
      y: distance * Math.cos(phi),
      z: distance * Math.sin(phi) * Math.cos(theta),
    },
  };
}
