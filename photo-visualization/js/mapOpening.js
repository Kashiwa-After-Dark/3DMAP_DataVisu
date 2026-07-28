import * as THREE from "three";

export function createMapOpening({
  targetModel,
  groundGrid,
  photoGroup,
  controls,
  onProgress,
  onComplete,
  duration = 3400,
}) {
  const mapReveal = createRadialMapReveal(targetModel);
  const gridState = {
    visible: groundGrid.visible,
    opacity: groundGrid.material.opacity,
    scale: groundGrid.scale.clone(),
  };
  const controlsWereEnabled = controls.enabled;

  targetModel.visible = true;
  controls.enabled = false;
  photoGroup.visible = false;
  groundGrid.visible = false;

  let startedAt = null;
  let finished = false;

  return {
    start(now = performance.now()) {
      startedAt = now;
      updateFrame(0);
    },
    update(now = performance.now()) {
      if (finished || startedAt === null) return finished;
      const progress = THREE.MathUtils.clamp((now - startedAt) / duration, 0, 1);
      updateFrame(progress);
      if (progress >= 1) finish();
      return finished;
    },
  };

  function updateFrame(progress) {
    const gridProgress = smootherstep(0.02, 0.68, progress);
    const gridScale = THREE.MathUtils.lerp(0.008, 1, easeOutQuart(gridProgress));
    groundGrid.visible = progress > 0.01;
    groundGrid.scale.copy(gridState.scale).multiplyScalar(gridScale);
    groundGrid.material.opacity = (
      gridState.opacity * smootherstep(0.02, 0.42, progress)
    );

    const revealProgress = smootherstep(0.2, 0.88, progress);
    mapReveal.setProgress(revealProgress);

    const phase = progress < 0.24
      ? "GRID GENERATION"
      : progress < 0.92
        ? "3D MAP REVEAL"
        : "MAP READY";
    onProgress?.({ progress, phase });
  }

  function finish() {
    finished = true;
    targetModel.visible = true;
    mapReveal.restore();
    groundGrid.visible = gridState.visible;
    groundGrid.material.opacity = gridState.opacity;
    groundGrid.scale.copy(gridState.scale);
    photoGroup.visible = true;
    controls.enabled = controlsWereEnabled;
    onComplete?.();
  }
}

function createRadialMapReveal(model) {
  model.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const corners = [
    new THREE.Vector3(bounds.min.x, center.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, center.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, center.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, center.y, bounds.max.z),
  ];
  const radius = Math.max(...corners.map((corner) => corner.distanceTo(center)), 1);
  const seen = new Set();
  const materialStates = [];
  model.traverse((child) => {
    child.visible = true;
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!material || seen.has(material)) continue;
      seen.add(material);
      const uniforms = {
        center: { value: center },
        radius: { value: radius },
        progress: { value: 0 },
      };
      const originalOnBeforeCompile = material.onBeforeCompile;
      const originalProgramCacheKey = material.customProgramCacheKey;
      material.onBeforeCompile = (shader) => {
        originalOnBeforeCompile.call(material, shader);
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
          .replace(
            "void main() {",
            "varying vec3 vOpeningWorldPosition;\nvoid main() {",
          )
          .replace(
            "#include <worldpos_vertex>",
            [
              "#include <worldpos_vertex>",
              "vOpeningWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;",
            ].join("\n"),
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "void main() {",
            [
              "uniform vec3 openingCenter;",
              "uniform float openingRadius;",
              "uniform float openingProgress;",
              "varying vec3 vOpeningWorldPosition;",
              "void main() {",
            ].join("\n"),
          )
          .replace(
            "#include <clipping_planes_fragment>",
            [
              "#include <clipping_planes_fragment>",
              "float openingDistance = distance(vOpeningWorldPosition.xz, openingCenter.xz) / openingRadius;",
              "if (openingDistance > openingProgress) discard;",
            ].join("\n"),
          );
        shader.uniforms.openingCenter = uniforms.center;
        shader.uniforms.openingRadius = uniforms.radius;
        shader.uniforms.openingProgress = uniforms.progress;
      };
      material.customProgramCacheKey = () => (
        `${originalProgramCacheKey.call(material)}|radial-map-opening-v2`
      );
      material.needsUpdate = true;
      materialStates.push({
        material,
        uniforms,
        originalOnBeforeCompile,
        originalProgramCacheKey,
      });
    }
  });
  return {
    setProgress(progress) {
      for (const state of materialStates) {
        state.uniforms.progress.value = progress;
      }
    },
    restore() {
      for (const state of materialStates) {
        state.material.onBeforeCompile = state.originalOnBeforeCompile;
        state.material.customProgramCacheKey = state.originalProgramCacheKey;
        state.material.needsUpdate = true;
      }
    },
  };
}

function smootherstep(start, end, value) {
  const normalized = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return normalized * normalized * normalized
    * (normalized * (normalized * 6 - 15) + 10);
}

function easeOutQuart(value) {
  return 1 - ((1 - value) ** 4);
}
