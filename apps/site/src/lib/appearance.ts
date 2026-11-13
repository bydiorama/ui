export const appearanceOptions = {
  scheme: [{ value: "auto", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }],
  density: [{ value: "compact", label: "Compact" }, { value: "default", label: "Default" }, { value: "comfortable", label: "Comfortable" }],
  brand: [{ value: "zero", label: "Diorama" }, { value: "graphite", label: "Graphite" }, { value: "hockney", label: "Hockney" }, { value: "stress", label: "Stress" }],
  effects: [{ value: "off", label: "Off" }, { value: "on", label: "On" }],
} as const;
export type Appearance = { [K in keyof typeof appearanceOptions]: typeof appearanceOptions[K][number]["value"] };
export const defaultAppearance: Appearance = { scheme: "auto", density: "default", brand: "zero", effects: "off" };
export const appearanceAttributes = { scheme: "siteScheme", density: "uiDensity", brand: "siteBrand", effects: "siteEffects" } as const;
export const appearanceStorageKey = "diorama-ui-appearance";
const keys = Object.keys(defaultAppearance) as (keyof Appearance)[];
let snapshot = defaultAppearance;

export function parseAppearance(value: unknown): Appearance {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(keys.map(key => [key, appearanceOptions[key].some(option => option.value === source[key]) ? source[key] : defaultAppearance[key]])) as Appearance;
}
export function readAppearance(): Appearance {
  if (typeof document === "undefined") return defaultAppearance;
  const next = parseAppearance(Object.fromEntries(keys.map(key => [key, document.documentElement.dataset[appearanceAttributes[key]]])));
  if (keys.some(key => next[key] !== snapshot[key])) snapshot = next;
  return snapshot;
}
let transitionFrame = 0;
function applyAppearance(preferences: Appearance, persist: boolean) {
  const root = document.documentElement;
  // Theme changes should resolve in one paint, without every control tweening
  // through a different colour. Restore ordinary interaction motion afterwards.
  root.dataset.appearanceChanging = "";
  cancelAnimationFrame(transitionFrame);
  for (const key of keys) root.dataset[appearanceAttributes[key]] = preferences[key];
  document.dispatchEvent(new Event("appearance-change"));
  transitionFrame = requestAnimationFrame(() => {
    transitionFrame = requestAnimationFrame(() => { delete root.dataset.appearanceChanging; });
  });
  if (persist) {
    try { localStorage.setItem(appearanceStorageKey, JSON.stringify(preferences)); } catch { /* Preferences remain usable without storage. */ }
  }
}
export function setAppearance<K extends keyof Appearance>(key: K, value: Appearance[K]) {
  applyAppearance(parseAppearance({ ...readAppearance(), [key]: value }), true);
}
export function resetAppearance() { applyAppearance(defaultAppearance, true); }
function syncStorage(event: StorageEvent) {
  if (event.key !== appearanceStorageKey && event.key !== null) return;
  try { applyAppearance(parseAppearance(JSON.parse(event.newValue ?? "null")), false); }
  catch { applyAppearance(defaultAppearance, false); }
}
let subscribers = 0;
export function subscribeAppearance(listener: () => void) {
  document.addEventListener("appearance-change", listener);
  if (subscribers++ === 0) window.addEventListener("storage", syncStorage);
  return () => {
    document.removeEventListener("appearance-change", listener);
    if (--subscribers === 0) window.removeEventListener("storage", syncStorage);
  };
}
