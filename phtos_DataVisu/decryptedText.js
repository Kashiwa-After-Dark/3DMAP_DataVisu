const SCRAMBLE_CHARACTERS = "!<>-_\\/[]{}=+*^?#01";
const originalText = new WeakMap();
const activeTimers = new WeakMap();

export function enableDecryptedText(root = document) {
  root.addEventListener("pointerover", (event) => {
    const element = event.target.closest("[data-decrypt]");
    if (!element || !root.contains(element) || element.contains(event.relatedTarget)) return;
    runDecryptedText(element);
  });

  root.addEventListener("focusin", (event) => {
    const element = event.target.closest("[data-decrypt]");
    if (element && root.contains(element)) runDecryptedText(element);
  });
}

function runDecryptedText(element) {
  const target = originalText.get(element) ?? element.textContent;
  originalText.set(element, target);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.textContent = target;
    return;
  }

  window.clearInterval(activeTimers.get(element));
  const characters = Array.from(target);
  let frame = 0;
  const timer = window.setInterval(() => {
    const resolvedCharacters = Math.floor(frame / 2);
    element.textContent = characters.map((character, index) => {
      if (index < resolvedCharacters || /\s/u.test(character)) return character;
      return SCRAMBLE_CHARACTERS[Math.floor(Math.random() * SCRAMBLE_CHARACTERS.length)];
    }).join("");

    frame += 1;
    if (resolvedCharacters >= characters.length) {
      window.clearInterval(timer);
      activeTimers.delete(element);
      element.textContent = target;
    }
  }, 28);
  activeTimers.set(element, timer);
}
