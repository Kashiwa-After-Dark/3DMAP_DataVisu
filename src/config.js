export const ORIGIN = {
  lat: 35.86183529140233,
  lon: 139.97190479462844,
};

export const COORDINATE_SCALE = {
  east: 1.0004200803610934,
  north: -0.9955676144207827,
};

export const INITIAL_CENTER_GEO = {
  lat: 35.861448118098,
  lon: 139.972500801647,
};

export const BACKGROUND_COLOR = 0x020611;
export const MAP_BLUE_COLOR = 0x00a7ff;
export const GRID_COLOR_LINES = 0x0b2338;
export const PLAYBACK_DURATION_SECONDS = 30;
export const ROUTE_BASE_COLOR = MAP_BLUE_COLOR;
export const TIME_BASE_Y = 3;
export const TIME_AXIS_HEIGHT = 180;
export const TIME_START_HOUR = 18;
export const TIME_END_HOUR = 24;
export const DEFAULT_CATEGORY = "UN";
export const GRAFFITI_OFFSET_SLOTS = [0, -1, 1, -2, 2, -3, 3];

export const GPX_FILES = [
  "01_1820_Omori.gpx",
  "01_1820_Nakamura.gpx",
  "01_2022_Tomoya.gpx",
  "01_2224_Kobayashi.gpx",
  "01_2224_Yoh.gpx",
].map((file, index) => ({
  id: `gpx-${index}`,
  file,
  url: new URL(`../assets/data/gpx/RH01_0707/${file}`, import.meta.url).href,
  label: file.replace(/^\d+_\d+_/, "").replace(/\.gpx$/i, ""),
}));

export const CAMERA_MODES = {
  free: { label: "FREE / 自由" },
  street: {
    label: "STREET / 街路",
    distance: 7,
    height: 6.5,
    lookAhead: 16,
    targetHeight: 4.5,
    shoulder: 0.8,
    damping: 7,
    fov: 62,
    stampScale: 0.25,
    curtainOpacity: 0.12,
  },
  kite: {
    label: "KITE / カイト",
    distance: 55,
    height: 72,
    lookAhead: 42,
    targetHeight: 8,
    shoulder: 0,
    damping: 3.2,
    fov: 50,
    stampScale: 0.52,
    curtainOpacity: 0.2,
  },
  chase: {
    label: "CHASE / 遠景",
    distance: 170,
    height: 82,
    lookAhead: 90,
    targetHeight: 14,
    shoulder: 0,
    damping: 2.2,
    fov: 45,
    stampScale: 0.72,
    curtainOpacity: 0.26,
  },
  aerial: {
    label: "AERIAL / 空撮",
    distance: 60,
    height: 230,
    lookAhead: 80,
    targetHeight: 2,
    shoulder: 0,
    damping: 1.7,
    fov: 38,
    stampScale: 0.62,
    curtainOpacity: 0.25,
  },
};

export const CATEGORY_STYLES = {
  H: { label: "高校生", color: "#22d3ee", soft: "#a5f3fc" },
  U: { label: "大学生", color: "#397d9f", soft: "#397d9f" },
  Y: { label: "若い社会人", color: "#8b5cf6", soft: "#ddd6fe" },
  A: { label: "中高年", color: "#f59e0b", soft: "#fde68a" },
  S: { label: "高齢者", color: "#ef4444", soft: "#fecaca" },
  CP: { label: "カップル", color: "#ec4899", soft: "#fbcfe8" },
  FM: { label: "家族", color: "#14b8a6", soft: "#99f6e4" },
  MX: { label: "属性混合", color: "#a78bfa", soft: "#ede9fe" },
  UN: { label: "その他・不明", color: "#94a3b8", soft: "#e2e8f0" },
};
