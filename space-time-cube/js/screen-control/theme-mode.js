/**
 * ファイル概要: ダーク・ライト配色を切り替え、選択をブラウザへ保存する。
 */
const STORAGE_KEY = "kashiwa-map-theme";

export function createThemeMode({ button, root = document.body, onChange }) {
  if (!button || !root) return null;
  let theme = readStoredTheme();

  const apply = (nextTheme) => {
    theme = nextTheme === "light" ? "light" : "dark";
    root.dataset.theme = theme;
    button.dataset.theme = theme;
    button.setAttribute("aria-pressed", String(theme === "light"));
    button.setAttribute("aria-label", theme === "light" ? "ダークテーマへ切り替え" : "白テーマへ切り替え");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // 保存できない環境でも、現在の表示には選択を反映する。
    }
    onChange?.(theme);
  };

  button.addEventListener("click", () => apply(theme === "light" ? "dark" : "light"));
  apply(theme);
  return { getTheme: () => theme, setTheme: apply };
}

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
