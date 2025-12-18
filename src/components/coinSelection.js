// Общие константы и утилиты для выбора токена/индикатора

export const STORAGE_KEY = "selectedCoinId";

export const PRESET_TOKENS = [
  { id: 7083, label: "UNI" },
  { id: 22691, label: "STRK" },
  { id: 1437, label: "ZEC" },
  { id: 1839, label: "BNB" },
  { id: 32196, label: "HYPE" },
  { id: 38299, label: "AVNT" },
  { id: 38462, label: "ASTER" },
  { id: 27789, label: "BASE" },
];

export function getInitialCoinId(defaultId = 22691) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultId;
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : defaultId;
  } catch (_) {
    return defaultId;
  }
}

export function saveCoinId(id) {
  try {
    if (typeof id === "number" && Number.isFinite(id) && id > 0) {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  } catch (_) {
    // noop
  }
}
