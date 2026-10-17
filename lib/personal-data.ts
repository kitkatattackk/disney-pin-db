import type { Pin, SavedPin, ScanRecord } from "./pin-types";
export function isPin(value: unknown): value is Pin {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    /^[0-9a-f-]{36}$/i.test(p.id) &&
    typeof p.name === "string" &&
    p.name.length < 2000 &&
    typeof p.notes === "string" &&
    (p.release_year === null || typeof p.release_year === "number") &&
    (p.price_tier === null || typeof p.price_tier === "string") &&
    Array.isArray(p.pin_images) &&
    p.pin_images.length < 100 &&
    p.pin_images.every(
      (i) =>
        i &&
        typeof i.storage_url === "string" &&
        /^https:\/\//.test(i.storage_url) &&
        typeof i.is_primary === "boolean",
    )
  );
}
export function parsePersonalData(value: unknown): {
  saved: Record<string, SavedPin>;
  history: ScanRecord[];
} {
  if (!value || typeof value !== "object")
    throw new Error("Choose a Pinfolio backup.");
  const data = value as {
    version?: number;
    saved?: Record<string, SavedPin>;
    history?: ScanRecord[];
  };
  if (
    data.version !== 1 ||
    !data.saved ||
    typeof data.saved !== "object" ||
    Array.isArray(data.saved) ||
    Object.keys(data.saved).length > 5000
  )
    throw new Error("Choose a valid Pinfolio backup.");
  const saved: Record<string, SavedPin> = {};
  for (const [id, item] of Object.entries(data.saved)) {
    if (
      !item ||
      !isPin(item.pin) ||
      id !== item.pin.id ||
      !["owned", "wanted"].includes(item.status) ||
      typeof item.addedAt !== "string"
    )
      throw new Error("Backup contains invalid pins.");
    saved[id] = item;
  }
  const history = data.history ?? [];
  if (
    !Array.isArray(history) ||
    history.some(
      (item) => !item || !isPin(item.pin) || typeof item.date !== "string",
    )
  )
    throw new Error("Backup contains invalid history.");
  return { saved, history: history.slice(0, 100) };
}
