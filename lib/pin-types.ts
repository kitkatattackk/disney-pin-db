export type Pin = {
  id: string;
  name: string;
  release_year: number | null;
  price_tier: string | null;
  notes: string;
  original_price?: number | null;
  sku?: string | null;
  pin_images: { storage_url: string; is_primary: boolean }[];
  matchReason?: string;
};
export type SavedPin = {
  pin: Pin;
  status: "owned" | "wanted";
  addedAt: string;
};
export type ScanRecord = { pin: Pin; date: string };
export type Tab = "home" | "explore" | "scan" | "collection" | "history";
