import * as THREE from "three";

const SVG_NS = "http://www.w3.org/2000/svg";
const projectedPosition = new THREE.Vector3();

export function createCoordinateConnector() {
  const svg = document.createElementNS(SVG_NS, "svg");
  const glow = document.createElementNS(SVG_NS, "path");
  const line = document.createElementNS(SVG_NS, "path");
  const text = document.createElementNS(SVG_NS, "text");

  svg.setAttribute("aria-hidden", "true");
  svg.dataset.coordinateConnector = "";
  Object.assign(svg.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    userSelect: "none",
    zIndex: "4",
    display: "none",
    overflow: "visible",
  });

  glow.setAttribute("fill", "none");
  glow.setAttribute("stroke", "#00a7ff");
  glow.setAttribute("stroke-width", "7");
  glow.setAttribute("stroke-linejoin", "miter");
  glow.setAttribute("opacity", "0.2");

  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#67d4ff");
  line.setAttribute("stroke-width", "1.5");
  line.setAttribute("stroke-linejoin", "miter");

  text.setAttribute("fill", "#a9c4d6");
  text.setAttribute("font-family", "Ubuntu, sans-serif");
  text.setAttribute("font-size", "12");
  text.setAttribute("font-weight", "500");
  text.setAttribute("dominant-baseline", "middle");

  svg.append(glow, line, text);
  document.body.append(svg);

  function update(memo, camera) {
    const stamp = memo?.marker?.userData.stamp;
    if (!stamp?.visible || !memo.marker.visible) {
      hide();
      return;
    }

    stamp.getWorldPosition(projectedPosition);
    projectedPosition.project(camera);
    if (projectedPosition.z < -1 || projectedPosition.z > 1) {
      hide();
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const iconX = (projectedPosition.x * 0.5 + 0.5) * width;
    const iconY = (-projectedPosition.y * 0.5 + 0.5) * height;
    const direction = iconX < width * 0.62 ? 1 : -1;
    const labelY = THREE.MathUtils.clamp(iconY - 58, 28, height - 28);
    const elbowX = iconX + direction * 34;
    const labelX = THREE.MathUtils.clamp(
      iconX + direction * 112,
      direction > 0 ? 18 : 145,
      direction > 0 ? width - 145 : width - 18,
    );
    const path = `M ${iconX} ${iconY} L ${elbowX} ${labelY} L ${labelX} ${labelY}`;

    glow.setAttribute("d", path);
    line.setAttribute("d", path);
    text.setAttribute("x", String(labelX + direction * 7));
    text.setAttribute("y", String(labelY));
    text.setAttribute("text-anchor", direction > 0 ? "start" : "end");
    text.textContent = `${memo.lat.toFixed(6)}, ${memo.lon.toFixed(6)}`;
    svg.style.display = "";
  }

  function hide() {
    svg.style.display = "none";
  }

  return { update, hide };
}
