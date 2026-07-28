const lineTimers = new Map();

export function createOpeningTypewriter({ phase, title, detail }) {
  let currentPhase = "";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    start() {
      typeLine(phase, "GRID GENERATION", {
        delay: 0, speed: 38, reducedMotion, keepCursor: true,
      });
      typeLine(title, "GENERATING KASHIWA 3D MAP", {
        delay: 260, speed: 42, reducedMotion, keepCursor: true,
      });
      typeLine(detail, "LINKING PHOTO POINTS...", {
        delay: 560, speed: 34, reducedMotion, keepCursor: true,
      });
      currentPhase = "GRID GENERATION";
    },
    setPhase(nextPhase) {
      if (!phase || nextPhase === currentPhase) return;
      currentPhase = nextPhase;
      typeLine(phase, nextPhase, {
        delay: 0, speed: 34, reducedMotion, keepCursor: true,
      });
    },
    stop() {
      for (const timer of lineTimers.values()) {
        window.clearTimeout(timer);
        window.clearInterval(timer);
      }
      lineTimers.clear();
    },
  };
}

export function playMultiLineTypewriter(elements, {
  delays = [],
  speeds = [],
} = {}) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  elements.forEach((element, index) => {
    typeLine(element, element.textContent, {
      delay: delays[index] ?? index * 320,
      speed: speeds[index] ?? 72,
      reducedMotion,
      keepCursor: false,
    });
  });
}

function typeLine(element, text, {
  delay,
  speed,
  reducedMotion,
  keepCursor,
}) {
  if (!element) return;
  clearLineTimer(element);
  element.classList.remove("is-typing");

  if (reducedMotion) {
    element.textContent = text;
    return;
  }

  element.textContent = "";
  const characters = Array.from(text);
  let index = 0;
  const delayTimer = window.setTimeout(() => {
    element.classList.add("is-typing");
    const typingTimer = window.setInterval(() => {
      element.textContent += characters[index];
      index += 1;
      if (index >= characters.length) {
        window.clearInterval(typingTimer);
        lineTimers.delete(element);
        if (!keepCursor) {
          const cursorTimer = window.setTimeout(() => {
            element.classList.remove("is-typing");
            lineTimers.delete(element);
          }, 520);
          lineTimers.set(element, cursorTimer);
        }
      }
    }, speed);
    lineTimers.set(element, typingTimer);
  }, delay);
  lineTimers.set(element, delayTimer);
}

function clearLineTimer(element) {
  const timer = lineTimers.get(element);
  window.clearTimeout(timer);
  window.clearInterval(timer);
  lineTimers.delete(element);
}
