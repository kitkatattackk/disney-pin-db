"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import type { EbayMarket } from "@/lib/ebay";

type Market = EbayMarket & { activeUrl: string; soldUrl: string };
export function EbayMarketPanel({ pinId, api }: { pinId: string; api: (url: string, options?: RequestInit) => Promise<Response> }) {
  const [market, setMarket] = useState<Market | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api(`/api/ebay?id=${pinId}`, { signal: controller.signal }).then(async (r) => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Unable to load eBay results.");
      setMarket(j);
    }).catch((e) => { if (e.name !== "AbortError") setError(e.message); });
    return () => controller.abort();
  }, [pinId, api]);
  return <section className="sales-panel" aria-label="eBay market results">
    <p className="eyebrow">EBAY MARKET CHECK</p>
    <h3>Find this pin on eBay</h3>
    {!market && <p role="status">{error || "Checking eBay…"}</p>}
    {market && <>
      <p>{market.message}</p>
      {market.status === "live" && <>
        <p className="fine-print">Live listings · Checked {new Date(market.checkedAt!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · Cached up to 5 minutes</p>
        {market.listings.length === 0 && <p>No active matches found for this catalog title. Try the eBay search below.</p>}
        <div className="ebay-listings">{market.listings.map((item) => <a key={item.id} className="ebay-listing" href={item.url} target="_blank" rel="noopener noreferrer">
          {item.image && <Image src={item.image} alt="" width={72} height={72} unoptimized />}
          <span><strong>{item.title}</strong><small>{item.condition}{item.buyingOptions.includes("AUCTION") ? " · Auction / current bid" : " · Asking price"}</small><b>{new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency }).format(Number(item.price))}</b></span>
        </a>)}</div>
      </>}
      <div className="market-links">
        <a className="button secondary" href={market.activeUrl} target="_blank" rel="noopener noreferrer">Active listings ↗</a>
        <a className="button secondary" href={market.soldUrl} target="_blank" rel="noopener noreferrer">Sold listings ↗</a>
      </div>
      <p className="fine-print">Keyword matches may include similar pins or sets. Sold history opens on eBay; verified sold prices are not connected in this app.</p>
    </>}
  </section>;
}
