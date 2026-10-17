export type EbayListing = {
  id: string; title: string; url: string; image: string | null;
  price: string; currency: string; condition: string; buyingOptions: string[];
};
export type EbayMarket = {
  status: "live" | "not_configured" | "unavailable";
  listings: EbayListing[]; checkedAt: string | null; message: string;
};

export function ebayQuery(name: string) {
  return `${name.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim()} Disney pin`.slice(0, 100);
}
export function ebayLinks(name: string) {
  const q = ebayQuery(name);
  return {
    activeUrl: `https://www.ebay.com/sch/i.html?${new URLSearchParams({ _nkw: q, _sop: "10" })}`,
    soldUrl: `https://www.ebay.com/sch/i.html?${new URLSearchParams({ _nkw: q, LH_Sold: "1", LH_Complete: "1", _sop: "13" })}`,
  };
}
function safeUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "ebay.com" || url.hostname.endsWith(".ebay.com") || url.hostname.endsWith(".ebayimg.com")) ? url.href : null; } catch { return null; }
}
export function normalizeListings(items: unknown): EbayListing[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const url = safeUrl(item?.itemWebUrl);
    const amount = item?.price?.value;
    const currency = item?.price?.currency;
    if (!url || typeof item.title !== "string" || typeof item.itemId !== "string" || !/^\d+(\.\d+)?$/.test(String(amount)) || !/^[A-Z]{3}$/.test(currency || "")) return [];
    return [{ id: item.itemId, title: item.title, url, image: safeUrl(item.image?.imageUrl), price: String(amount), currency, condition: typeof item.condition === "string" ? item.condition : "", buyingOptions: Array.isArray(item.buyingOptions) ? item.buyingOptions.filter((v: unknown) => typeof v === "string") : [] }];
  });
}
let tokenCache: { value: string; expires: number; key: string } | undefined;
const cache = new Map<string, { expires: number; market: EbayMarket }>();
export async function ebayMarket(name: string): Promise<EbayMarket> {
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) return { status: "not_configured", listings: [], checkedAt: null, message: "Live listings will appear after the eBay connection is configured. You can search eBay now." };
  const query = ebayQuery(name);
  const key = `${id}:${query}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.market;
  try {
    if (!tokenCache || tokenCache.expires < Date.now() || tokenCache.key !== id) {
      const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
        method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
        cache: "no-store", signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error("token");
      const data = await response.json();
      if (typeof data.access_token !== "string" || !Number.isFinite(data.expires_in)) throw new Error("token");
      tokenCache = { value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000, key: id };
    }
    const response = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${new URLSearchParams({ q: query, limit: "6", sort: "newlyListed" })}`, {
      headers: { Authorization: `Bearer ${tokenCache.value}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" }, cache: "no-store", signal: AbortSignal.timeout(12000),
    });
    if (response.status === 401) tokenCache = undefined;
    if (!response.ok) throw new Error("search");
    const data = await response.json();
    const market: EbayMarket = { status: "live", listings: normalizeListings(data.itemSummaries), checkedAt: new Date().toISOString(), message: "Active asking prices, not completed sales. Compare the photo, edition, and condition before buying." };
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 5 * 60_000, market });
    return market;
  } catch {
    return { status: "unavailable", listings: [], checkedAt: null, message: "The live eBay connection is unavailable. You can still open the current eBay searches below." };
  }
}
