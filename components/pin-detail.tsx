"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Pin, SavedPin } from "@/lib/pin-types";
import { Icon } from "./icons";
import { EbayMarketPanel } from "./ebay-market";
export function PinDetail({
  pin,
  saved,
  api,
  onSave,
  onClose,
}: {
  pin: Pin;
  saved?: SavedPin;
  api: (url: string, options?: RequestInit) => Promise<Response>;
  onSave: (pin: Pin, status: "owned" | "wanted" | null) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  const description = pin.notes.split("\n").slice(2).join("\n");
  return (
    <dialog ref={dialog} className="pin-dialog" onCancel={onClose}>
      <div className="detail-top">
        <span className="eyebrow">PIN DETAILS</span>
        <button
          className="icon-button"
          aria-label="Close pin details"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="detail-layout">
        <div>
          <div className="detail-image">
            {pin.pin_images[imageIndex] ? (
              <Image
                src={pin.pin_images[imageIndex].storage_url}
                alt={pin.name}
                fill
                unoptimized
                sizes="450px"
                className="object-contain"
              />
            ) : (
              <span>No catalog image</span>
            )}
          </div>
          {pin.pin_images.length > 1 && (
            <div className="image-switcher">
              {pin.pin_images.map((im, i) => (
                <button
                  key={im.storage_url}
                  onClick={() => setImageIndex(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={i === imageIndex}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-copy">
          <h2>{pin.name}</h2>
          <p className="muted">
            {[pin.release_year, pin.price_tier].filter(Boolean).join(" · ") ||
              "Release details not indexed"}
          </p>
          {pin.matchReason && <p className="notice">{pin.matchReason}</p>}
          <div className="detail-actions">
            <button
              className={`button ${saved?.status === "owned" ? "primary" : "secondary"}`}
              onClick={() =>
                onSave(pin, saved?.status === "owned" ? null : "owned")
              }
            >
              <Icon name="check" size={18} />
              {saved?.status === "owned"
                ? "In my collection"
                : "Add to collection"}
            </button>
            <button
              className="button secondary"
              onClick={() =>
                onSave(pin, saved?.status === "wanted" ? null : "wanted")
              }
            >
              <Icon name="heart" size={18} />
              {saved?.status === "wanted" ? "On my wishlist" : "Want this pin"}
            </button>
          </div>
          <EbayMarketPanel key={pin.id} pinId={pin.id} api={api} />
          {description && <p className="catalog-description">{description}</p>}

        </div>
      </div>
    </dialog>
  );
}
