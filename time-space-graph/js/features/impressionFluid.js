import * as THREE from "three";
import { IMPRESSION_TYPES } from "../../../backend/impressionClassifier.js?v=20261029-db1";
import { getDensityBounds } from "./renderQuality.js?v=20261029-perf1";

export function createImpressionFluid(domain) {
  const texture = new THREE.DataTexture(new Uint8Array(domain.size * domain.size * 4), domain.size, domain.size, THREE.RGBAFormat);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const mask = new THREE.DataTexture(domain.mask, domain.size, domain.size, THREE.RedFormat);
  mask.minFilter = mask.magFilter = THREE.LinearFilter;
  mask.needsUpdate = true;
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, side: THREE.BackSide,
    uniforms: {
      densityMap: { value: texture }, routeMask: { value: mask }, time: { value: 0 },
      cameraLocal: { value: new THREE.Vector3() }, cameraDirection: { value: new THREE.Vector3() },
      orthographic: { value: false },
      occupiedMin: { value: new THREE.Vector3(-0.5, -0.5, -0.5) },
      occupiedMax: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
      warpScale: { value: new THREE.Vector2(3 / domain.width, 3 / domain.depth) },
      palette: { value: IMPRESSION_TYPES.map(({ color }) => new THREE.Color(color)) },
    },
    vertexShader: `
      precision highp float;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform vec3 cameraLocal;
      uniform vec3 cameraDirection;
      uniform bool orthographic;
      in vec3 position;
      out vec3 origin;
      out vec3 direction;
      void main() {
        origin = orthographic ? position - cameraDirection * 1000.0 : cameraLocal;
        direction = orthographic ? cameraDirection : position - origin;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      precision highp sampler2D;
      uniform sampler2D densityMap;
      uniform sampler2D routeMask;
      uniform vec3 palette[4];
      uniform float time;
      uniform vec2 warpScale;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      in vec3 origin;
      uniform vec3 occupiedMin;
      uniform vec3 occupiedMax;
      in vec3 direction;
      out vec4 outputColor;
      vec4 dyeAt(vec3 p) {
        vec2 uv = p.xz + 0.5;
        float h = p.y + 0.5;
        vec2 bend = vec2(sin(h * 8.0 + uv.y * 12.0 + time), cos(h * 7.0 - uv.x * 10.0 - time * 0.7));
        return texture(densityMap, clamp(uv + bend * warpScale * (0.3 + 0.7 * h), 0.0, 1.0));
      }
      float liquidField(vec3 p) {
        if (any(greaterThan(abs(p), vec3(0.495)))) return 0.0;
        float boundary = smoothstep(0.5, 1.0, texture(routeMask, p.xz + 0.5).r);
        if (boundary < 0.001) return 0.0;
        float density = dot(dyeAt(p), vec4(1.0));
        if (density < 0.001) return 0.0;
        float h = p.y + 0.5;
        float ripple = 0.025 * sin(p.x * 14.0 + time) * cos(p.z * 13.0 - time * 0.6);
        float drop = exp(-pow((h - 0.24 - ripple) / 0.16, 2.0));
        float neck = 0.55 * exp(-pow((h - 0.62) / 0.30, 2.0)) * smoothstep(0.3, 0.9, sqrt(density));
        return pow(density, 0.45) * (drop + neck) * boundary;
      }
      void main() {
        vec3 ray = normalize(direction);
        vec3 inverseRay = 1.0 / (ray + vec3(0.000001));
        vec3 first = (occupiedMin - origin) * inverseRay;
        vec3 last = (occupiedMax - origin) * inverseRay;
        vec3 lo = min(first, last), hi = max(first, last);
        float entry = max(max(lo.x, lo.y), lo.z);
        float exit = min(min(hi.x, hi.y), hi.z);
        entry = max(entry, 0.0);
        if (exit <= entry) discard;
        float stepSize = (exit - entry) / 48.0;
        float hit = -1.0;
        const float level = 0.18;
        for (int i = 0; i < 48; i++) {
          float distance = entry + (float(i) + 0.5) * stepSize;
          if (liquidField(origin + ray * distance) >= level) {
            float low = max(entry, distance - stepSize), high = distance;
            for (int refine = 0; refine < 4; refine++) {
              float middle = (low + high) * 0.5;
              if (liquidField(origin + ray * middle) >= level) high = middle;
              else low = middle;
            }
            hit = high;
            break;
          }
        }
        if (hit < 0.0) discard;
        vec3 p = origin + ray * hit;
        const float e = 0.009;
        vec3 normal = normalize(-vec3(
          liquidField(p + vec3(e,0,0)) - liquidField(p - vec3(e,0,0)),
          liquidField(p + vec3(0,e,0)) - liquidField(p - vec3(0,e,0)),
          liquidField(p + vec3(0,0,e)) - liquidField(p - vec3(0,0,e))
        ) + vec3(0.000001));
        vec4 weights = dyeAt(p);
        float density = dot(weights, vec4(1.0));
        vec4 pigments = pow(max(weights, vec4(0.0)), vec4(1.35));
        vec3 color = (pigments.x * palette[0] + pigments.y * palette[1] + pigments.z * palette[2] + pigments.w * palette[3]) / max(dot(pigments, vec4(1.0)), 0.0001);
        vec3 light = normalize(vec3(-0.5, 0.9, 0.6));
        float diffuse = 0.45 + 0.55 * max(dot(normal, light), 0.0);
        float fresnel = pow(1.0 - max(dot(normal, -ray), 0.0), 3.0);
        float reflection = pow(max(dot(reflect(ray, normal), light), 0.0), 28.0);
        vec3 surface = color * diffuse;
        vec3 reflected = reflect(ray, normal);
        float windowReflection = smoothstep(0.58, 0.64, reflected.y) * (1.0 - smoothstep(0.74, 0.8, reflected.y));
        surface = mix(surface, vec3(0.66, 0.8, 0.92), fresnel * 0.4);
        surface = mix(surface, vec3(0.9, 0.96, 1.0), windowReflection * 0.42);
        surface += vec3(0.75, 0.86, 0.91) * reflection * 0.95;
        float alpha = clamp(0.34 + 0.32 * sqrt(density) + fresnel * 0.27, 0.34, 0.9);
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_FragDepth = (clip.z / clip.w) * 0.5 + 0.5;
        outputColor = vec4(pow(max(surface, vec3(0.0)), vec3(1.0 / 2.2)), alpha);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.visible = false;
  mesh.renderOrder = 40;
  const inverse = new THREE.Matrix4();
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    inverse.copy(mesh.matrixWorld).invert();
    camera.getWorldPosition(material.uniforms.cameraLocal.value).applyMatrix4(inverse);
    camera.getWorldDirection(material.uniforms.cameraDirection.value).transformDirection(inverse);
    material.uniforms.orthographic.value = Boolean(camera.isOrthographicCamera);
  };
  return {
    mesh,
    update(data) {
      const padding = Math.ceil(Math.max(3 / domain.width, 3 / domain.depth) * domain.size) + 2;
      const bounds = getDensityBounds(data, domain.size, padding);
      mesh.visible = Boolean(bounds);
      if (!bounds) return;
      material.uniforms.occupiedMin.value.set(bounds.minX, -0.5, bounds.minZ);
      material.uniforms.occupiedMax.value.set(bounds.maxX, 0.5, bounds.maxZ);
      texture.image.data.set(data);
      texture.needsUpdate = true;
    },
    animate(time) { material.uniforms.time.value = time * 0.00012; },
  };
}
