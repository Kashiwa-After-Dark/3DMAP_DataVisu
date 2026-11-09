import * as THREE from "three";
import { buildActivityTripGeometry, tripPhaseAt } from "./activityTripGeometry.js?v=20261109-staying1";

export function createActivityTrips(color, sampleRoute) {
  const phase = { value: 0 };
  const material = new THREE.MeshBasicMaterial({ color, opacity: 0.55, transparent: true, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.tripPhase = phase;
    shader.vertexShader = `attribute float tripProgress; varying float vTripProgress;\n${shader.vertexShader}`
      .replace("void main() {", "void main() { vTripProgress = tripProgress;");
    shader.fragmentShader = `uniform float tripPhase; varying float vTripProgress;\n${shader.fragmentShader}`
      .replace("vec4 diffuseColor = vec4( diffuse, opacity );", `
        float age = fract(tripPhase - vTripProgress + 1.0);
        if (age > 0.28) discard;
        float fade = pow(1.0 - age / 0.28, 0.7);
        vec3 headColor = mix(diffuse, vec3(1.0), 0.2 * (1.0 - smoothstep(0.0, 0.035, age)));
        vec4 diffuseColor = vec4(headColor, opacity * fade);
      `);
  };
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.name = "activity-trip-trails";
  mesh.renderOrder = 45;
  return {
    mesh,
    update(flows, isBlocked) {
      const data = buildActivityTripGeometry(flows, sampleRoute, 72, isBlocked);
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BufferGeometry();
      mesh.geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
      mesh.geometry.setAttribute("tripProgress", new THREE.Float32BufferAttribute(data.progress, 1));
      mesh.geometry.computeBoundingSphere();
      mesh.visible = data.progress.length > 0;
    },
    animate(time) { phase.value = tripPhaseAt(time); },
  };
}
