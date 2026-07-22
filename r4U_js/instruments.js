import * as THREE from "three";

export function createTimelineInstruments({ clock, compassCard, speedEngine }) {
  const hourHand = clock.querySelector("[data-clock-hour]");
  const minuteHand = clock.querySelector("[data-clock-minute]");
  const forward = new THREE.Vector3();
  const speedNeedle = speedEngine.querySelector("[data-speed-engine-needle]");
  const speedReadout = speedEngine.querySelector("[data-speed-engine-readout]");
  let lastHeading = 0;
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  function updateTime(timestamp) {
    const values = Object.fromEntries(
      timeFormatter.formatToParts(timestamp).map(({ type, value }) => [type, value]),
    );
    const hours = Number(values.hour) % 12;
    const minutes = Number(values.minute);
    const seconds = Number(values.second);
    hourHand.style.transform = `rotate(${hours * 30 + minutes * 0.5}deg)`;
    minuteHand.style.transform = `rotate(${minutes * 6 + seconds * 0.1}deg)`;
  }

  function updateCompass(camera) {
    camera.getWorldDirection(forward);
    forward.normalize();
    const horizontalLength = Math.hypot(forward.x, forward.z);
    if (horizontalLength > 0.0001) {
      lastHeading = THREE.MathUtils.radToDeg(Math.atan2(forward.x, -forward.z));
    }
    const pitch = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(forward.y, -1, 1)));
    const displayPitch = THREE.MathUtils.clamp(pitch * 0.78, -62, 62);
    compassCard.style.transform = `rotateX(${displayPitch}deg) rotateZ(${-lastHeading}deg)`;
    compassCard.parentElement.setAttribute(
      "aria-label",
      `カメラ方角 ${Math.round((lastHeading + 360) % 360)}度、仰角 ${Math.round(pitch)}度`,
    );
  }

  function updateSpeed(rate) {
    const ratio = THREE.MathUtils.clamp((rate - 0.25) / 1.75, 0, 1);
    const angle = -120 + ratio * 240;
    const label = `${Number(rate.toFixed(2))}×`;
    speedNeedle.style.transform = `rotate(${angle}deg)`;
    speedReadout.textContent = label;
    speedEngine.setAttribute("aria-label", `再生速度 ${label}`);
  }

  return { updateTime, updateCompass, updateSpeed };
}
